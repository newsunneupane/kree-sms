import { ensureDb } from "@/lib/db";
import { PendingRegistration } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;

    await ensureDb();
    const pending = await PendingRegistration.findAll({
      where: { status: "pending_admin_approval" },
      attributes: ["id", "name", "email", "created_at"],
      order: [["id", "DESC"]],
    });
    return ok({ pending_users: pending });
  } catch (err) {
    return toErrorResponse(err);
  }
}
