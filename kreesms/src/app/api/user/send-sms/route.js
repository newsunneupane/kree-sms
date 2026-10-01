import { ensureDb } from "@/lib/db";
import { User, SmsLog, CreditRequest, SystemSetting, ScheduledSms, Contact, Group } from "@/lib/models/index.js";
import { sendSms, actualSmsCredit, isSmsRejected } from "@/lib/aakash";
import { calculateCreditCost } from "@/lib/credits";
import { requireUser } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, sendSmsSchema, buyCreditsSchema } from "@/lib/validators";
import { smsLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

function parseBulkPackets(csvRawText, globalMessage, contactsForGroup) {
  const packets = [];
  if (csvRawText.startsWith("SYSTEM_GROUP_ID:")) {
    const groupId = parseInt(csvRawText.replace("SYSTEM_GROUP_ID:", ""), 10);
    const contacts = contactsForGroup(groupId);
    return { packets, groupId, contacts };
  }
  const lines = csvRawText.replace(/\r/g, "").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const phone = lines[i].trim();
    if (phone) packets.push({ to: phone, text: globalMessage });
  }
  return { packets };
}

function unquoteCsvCell(cell) {
  let s = cell.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  return s.trim();
}

function parseDynamicPackets(csvRawText) {
  const dynamicMatch = csvRawText.match(/SYSTEM_DYNAMIC_GROUP:(\d+)\|\|TEMPLATE:(.*)/s);
  if (dynamicMatch) return { groupId: parseInt(dynamicMatch[1], 10), template: dynamicMatch[2] };
  const packets = [];
  const rows = csvRawText.replace(/\r/g, "").split("\n");
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const commaIdx = rows[i].indexOf(",");
    if (commaIdx === -1) continue;
    const phone = rows[i].slice(0, commaIdx).trim();
    const msg = unquoteCsvCell(rows[i].slice(commaIdx + 1));
    if (phone && msg) packets.push({ to: phone, text: msg });
  }
  return { packets };
}

export async function POST(req) {
  try {
    const limited = smsLimiter(req);
    if (limited.limited) return limited.response;

    const session = await requireUser(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(sendSmsSchema, body);
    if (v.error) return v.error;
    const { sms_type, to, message, csv_raw_text, global_message, scheduled_at } = v.data;
    const userId = session.user.id;

    await ensureDb();
    const user = await User.scope(null).findByPk(userId);
    if (!user) return fail("User not found.", 404);

    let messagesToSend = [];

    if (sms_type === "single") {
      messagesToSend.push({ to, text: message });
    } else if (sms_type === "bulk") {
      if (csv_raw_text.startsWith("SYSTEM_GROUP_ID:")) {
        const groupId = parseInt(csv_raw_text.replace("SYSTEM_GROUP_ID:", ""), 10);
        if (!Number.isInteger(groupId)) return fail("Invalid group reference.", 400);
        // Contacts are linked via the join table (no group_id column on contacts).
        const group = await Group.findOne({ where: { id: groupId, user_id: userId } });
        if (!group) return fail("Group not found.", 404);
        const contacts = await group.getContacts({ attributes: ["mobile"] });
        for (const c of contacts) {
          if (c.mobile?.trim()) messagesToSend.push({ to: c.mobile.trim(), text: global_message });
        }
      } else {
        const { packets } = parseBulkPackets(csv_raw_text, global_message);
        messagesToSend = packets;
      }
    } else if (sms_type === "dynamic") {
      const parsed = parseDynamicPackets(csv_raw_text);
      if (parsed.groupId) {
        const group = await Group.findOne({ where: { id: parsed.groupId, user_id: userId } });
        if (!group) return fail("Group not found.", 404);
        const contacts = await group.getContacts({ attributes: ["firstname", "mobile"] });
        for (const c of contacts) {
          if (!c.mobile?.trim()) continue;
          messagesToSend.push({ to: c.mobile.trim(), text: parsed.template.replace(/{name}/g, c.firstname ?? "") });
        }
      } else {
        messagesToSend = parsed.packets;
      }
    }

    if (messagesToSend.length === 0) return fail("No valid messages to send.", 400);

    const compiledPackets = messagesToSend.map((m) => ({ to: m.to, text: m.text, cost: calculateCreditCost(m.text) }));
    const totalRequired = compiledPackets.reduce((sum, p) => sum + p.cost, 0);

    if (user.sms_balance < totalRequired) {
      return fail(`Insufficient credits! Requires ${totalRequired} credits, you have ${user.sms_balance}.`, 400);
    }

    if (scheduled_at) {
      await ScheduledSms.create({
        user_id: userId,
        sms_type,
        recipient: "BATCH_QUEUE",
        message: "BATCH_TEMPLATE",
        scheduled_at,
        status: "pending",
        batch_data: compiledPackets,
      });
      return ok({ message: `Campaign scheduled! ${compiledPackets.length} messages queued for ${scheduled_at}.` });
    }

    let successCount = 0;
    let failedCount = 0;
    let actualDeducted = 0;

    for (const packet of compiledPackets) {
      try {
        const result = await sendSms(packet.to, packet.text);
        // Deduct what Aakash actually charged (from its send response),
        // not our pre-send estimate. Rejected numbers cost 0.
        const charged = actualSmsCredit(result, packet.to, packet.cost);

        if (result.success && !isSmsRejected(result, packet.to)) {
          successCount++;
          actualDeducted += charged;
          if (result.availableCredit !== null && result.availableCredit !== undefined) {
            await SystemSetting.upsert({ key: "aakash_api_balance", value: String(result.availableCredit) });
          } else {
            const setting = await SystemSetting.findByPk("aakash_api_balance");
            if (setting) {
              setting.value = String(parseInt(setting.value, 10) - charged);
              await setting.save();
            }
          }
          await SmsLog.create({
            user_id: userId, sms_type, recipient: packet.to, message: packet.text,
            status: "success", gateway_response: JSON.stringify(result.raw),
          });
        } else {
          failedCount++;
          await SmsLog.create({
            user_id: userId, sms_type, recipient: packet.to, message: packet.text,
            status: "failed", gateway_response: JSON.stringify(result.raw || result.error),
          });
        }
      } catch (err) {
        failedCount++;
        await SmsLog.create({
          user_id: userId, sms_type, recipient: packet.to, message: packet.text,
          status: "failed", gateway_response: JSON.stringify({ error: err.message }),
        });
      }
    }

    if (actualDeducted > 0) {
      user.sms_balance -= actualDeducted;
      await user.save();
    }

    return ok({ message: `Campaign done. Sent: ${successCount}, Failed: ${failedCount}. Credits used (Aakash-charged): ${actualDeducted}.` });
  } catch (err) {
    return toErrorResponse(err);
  }
}
