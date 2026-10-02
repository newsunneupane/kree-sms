import { Op, fn, col } from "sequelize";
import { ensureDb } from "@/lib/db";
import { ApiClient, PublicSmsLog } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    await ensureDb();

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [clients, sentToday, failed24h] = await Promise.all([
      ApiClient.findAll({
        attributes: ["id", "name", "product", "key_prefix", "sms_balance", "is_active"],
        order: [["created_at", "DESC"]],
      }),
      PublicSmsLog.findAll({
        attributes: ["api_client_id", [fn("SUM", col("credits_used")), "credits"], [fn("COUNT", col("id")), "sent"]],
        where: { status_code: 200, created_at: { [Op.gte]: dayAgo } },
        group: ["api_client_id"],
        raw: true,
      }),
      PublicSmsLog.count({ where: { created_at: { [Op.gte]: dayAgo }, status_code: { [Op.ne]: 200 } } }),
    ]);

    const activeClients = clients.filter((c) => c.is_active).length;
    const sentCountToday = sentToday.reduce((n, r) => n + Number(r.sent || 0), 0);
    const creditsToday = sentToday.reduce((n, r) => n + Number(r.credits || 0), 0);
    const perClient = Object.fromEntries(
      sentToday.map((r) => [r.api_client_id, { sent: Number(r.sent || 0), credits: Number(r.credits || 0) }])
    );

    return ok({
      activeClients,
      totalClients: clients.length,
      sentToday: sentCountToday,
      creditsToday,
      failed24h,
      clients: clients.map((c) => ({ ...c.toJSON(), today: perClient[c.id] || { sent: 0, credits: 0 } })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
