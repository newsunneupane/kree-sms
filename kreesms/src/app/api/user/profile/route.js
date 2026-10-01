import { ensureDb } from "@/lib/db";
import { User, SystemSetting } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, fail, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    await ensureDb();
    const user = await User.findByPk(session.user.id);
    if (!user) return fail("User not found.", 404);

    const setting = await SystemSetting.findByPk("aakash_api_balance");
    return ok({
      data: {
        sms_balance: user.sms_balance,
        gateway_status: "Connected",
        gateway_credits: setting ? parseInt(setting.value, 10) : 0,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
