import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { User, CreditRequest, SmsLog, SystemSetting, sequelize } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";

export const runtime = "nodejs";

const schema = z.object({ request_id: z.coerce.number().int() });

export async function POST(req) {
  try {
    await ensureDb();
  } catch (err) {
    return toErrorResponse(err);
  }
  const t = await sequelize.transaction();
  try {
    const session = await requireAdmin(req);
    if (session.error) {
      await t.rollback();
      return session.error;
    }

    const body = await readJson(req);
    const v = validate(schema, body);
    if (v.error) {
      await t.rollback();
      return v.error;
    }

    const creditReq = await CreditRequest.findByPk(v.data.request_id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!creditReq || creditReq.status !== "pending") {
      await t.rollback();
      return fail("Request not found or already processed.", 400);
    }

    const user = await User.scope(null).findByPk(creditReq.user_id, { transaction: t });
    user.sms_balance += creditReq.requested_credits;
    await user.save({ transaction: t });

    const unallocSetting = await SystemSetting.findByPk("unallocated_system_balance", { transaction: t });
    if (unallocSetting) {
      unallocSetting.value = String(parseInt(unallocSetting.value, 10) - creditReq.requested_credits);
      await unallocSetting.save({ transaction: t });
    }

    creditReq.status = "approved";
    await creditReq.save({ transaction: t });

    await SmsLog.create(
      {
        user_id: creditReq.user_id,
        sms_type: "credit_allocation",
        recipient: "SYSTEM",
        message: `Allocated ${creditReq.requested_credits} credits via request ID: ${v.data.request_id}`,
        status: "success",
        gateway_response: "Admin approval complete.",
      },
      { transaction: t }
    );

    await t.commit();
    return ok({ message: "Request approved. Credits transferred." });
  } catch (err) {
    await t.rollback();
    return toErrorResponse(err);
  }
}
