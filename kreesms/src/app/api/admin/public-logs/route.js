import { Op } from "sequelize";
import { ensureDb } from "@/lib/db";
import { PublicSmsLog } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const PAGE_SIZE = 30;

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    await ensureDb();

    const params = req.nextUrl.searchParams;
    const where = {};
    const clientId = params.get("clientId");
    const status = params.get("status");
    const from = params.get("from");
    const to = params.get("to");
    const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    if (clientId) where.api_client_id = clientId;
    if (status && status !== "all") {
      if (status === "sent") where.status_code = 200;
      else if (status === "failed") where.status_code = { [Op.ne]: 200 };
      else where.status_code = parseInt(status, 10);
    }
    if (from || to) {
      where.created_at = {
        ...(from ? { [Op.gte]: new Date(from) } : {}),
        ...(to ? { [Op.lte]: new Date(to) } : {}),
      };
    }

    const { rows, count } = await PublicSmsLog.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return ok({ logs: rows, pagination: { page, limit: PAGE_SIZE, total: count } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
