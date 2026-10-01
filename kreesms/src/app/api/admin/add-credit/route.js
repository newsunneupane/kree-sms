import { ensureDb } from "@/lib/db";
import { SystemSetting } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, addGatewayCreditSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(addGatewayCreditSchema, body);
    if (v.error) return v.error;
    const amount = v.data.credits;

    await ensureDb();
    const setting = await SystemSetting.findByPk("unallocated_system_balance");
    if (setting) {
      setting.value = String(parseInt(setting.value, 10) + amount);
      await setting.save();
    } else {
      await SystemSetting.create({ key: "unallocated_system_balance", value: String(amount) });
    }
    return ok({ message: `Added ${amount} credits to the system pool.` });
  } catch (err) {
    return toErrorResponse(err);
  }
}
