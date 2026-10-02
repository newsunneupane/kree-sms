import { Op } from "sequelize";
import { requireApiClient } from "@/lib/auth";
import { PublicSmsLog } from "@/lib/models/index.js";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const PAGE_SIZE = 30;

export async function GET(req) {
  try {
    const session = await requireApiClient(req);
    if (session.error) return session.error;

    const params = req.nextUrl.searchParams;
    // The client id always comes from the session — query params can never
    // widen scope to another project's rows.
    const where = { api_client_id: session.apiClient.id };
    const status = params.get("status");
    const from = params.get("from");
    const to = params.get("to");
    const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
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
