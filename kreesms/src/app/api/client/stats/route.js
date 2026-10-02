import { Op } from "sequelize";
import { requireApiClient } from "@/lib/auth";
import { PublicSmsLog } from "@/lib/models/index.js";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireApiClient(req);
    if (session.error) return session.error;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { api_client_id: session.apiClient.id, created_at: { [Op.gte]: dayAgo } };
    const [sent, failed, credits] = await Promise.all([
      PublicSmsLog.count({ where: { ...where, status_code: 200 } }),
      PublicSmsLog.count({ where: { ...where, status_code: { [Op.ne]: 200 } } }),
      PublicSmsLog.sum("credits_used", { where: { ...where, status_code: 200 } }),
    ]);
    const balance = (await session.apiClient.reload())?.sms_balance ?? session.apiClient.sms_balance;
    return ok({ sent24h: sent, failed24h: failed, creditsUsed24h: credits || 0, balance });
  } catch (err) {
    return toErrorResponse(err);
  }
}
