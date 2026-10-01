import { ensureDb } from "@/lib/db";
import { SystemSetting } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { checkCredit } from "@/lib/aakash";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;

    await ensureDb();

    // Gateway balance comes live from the Aakash API on every admin view.
    // The DB row is only a fallback cache (used when Aakash is unreachable).
    let live = false;
    try {
      const credit = await checkCredit();
      if (credit.success) {
        await SystemSetting.upsert({ key: "aakash_api_balance", value: String(credit.balance) });
        live = true;
      }
    } catch {
      // fall through to the cached value below
    }

    const gatewaySetting = await SystemSetting.findByPk("aakash_api_balance");
    const unallocatedSetting = await SystemSetting.findByPk("unallocated_system_balance");
    return ok({
      gateway_balance: gatewaySetting ? parseInt(gatewaySetting.value, 10) : 0,
      unallocated_balance: unallocatedSetting ? parseInt(unallocatedSetting.value, 10) : 0,
      live,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
