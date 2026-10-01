import { ensureDb } from "@/lib/db";
import { CreditRequest, User } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;

    await ensureDb();
    const requests = await CreditRequest.findAll({
      include: [{ model: User, attributes: ["name", "email"] }],
      order: [["id", "DESC"]],
    });
    return ok({
      data: requests.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        requested_credits: r.requested_credits,
        payment_reference: r.payment_reference,
        status: r.status,
        created_at: r.created_at,
        name: r.User?.name,
        email: r.User?.email,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
