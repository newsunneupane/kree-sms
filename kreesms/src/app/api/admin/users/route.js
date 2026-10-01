import { ensureDb } from "@/lib/db";
import { User } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;

    await ensureDb();
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "sms_balance", "created_at"],
      order: [["id", "DESC"]],
    });
    return ok({ users });
  } catch (err) {
    return toErrorResponse(err);
  }
}
