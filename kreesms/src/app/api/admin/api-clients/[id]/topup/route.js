import { ensureDb } from "@/lib/db";
import { ApiClient, SystemSetting, sequelize } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";
import { z } from "zod";

export const runtime = "nodejs";

const topupSchema = z.object({
  credits: z.coerce.number().int().min(1, "Credits must be at least 1.").max(10000000),
});

export async function POST(req, { params }) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    const body = await readJson(req);
    const v = validate(topupSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    const { id } = await params;
    const credits = v.data.credits;

    const result = await sequelize.transaction(async (t) => {
      const client = await ApiClient.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!client) return { error: "API client not found.", status: 404 };

      const poolSetting = await SystemSetting.findByPk("unallocated_system_balance", {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const pool = poolSetting ? parseInt(poolSetting.value, 10) : 0;
      if (pool < credits) {
        return { error: `Insufficient unallocated credits in the system pool (available: ${pool}).`, status: 400 };
      }

      client.sms_balance += credits;
      await client.save({ transaction: t });

      poolSetting.value = String(pool - credits);
      await poolSetting.save({ transaction: t });

      return { client, unallocated: pool - credits };
    });

    if (result.error) return fail(result.error, result.status);
    return ok({
      message: `Added ${credits} credits to ${result.client.name}.`,
      sms_balance: result.client.sms_balance,
      unallocated_balance: result.unallocated,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
