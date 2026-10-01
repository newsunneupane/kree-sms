import { ensureDb } from "@/lib/db";
import { CreditRequest } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    await ensureDb();
    const purchases = await CreditRequest.findAll({ where: { user_id: session.user.id }, order: [["id", "DESC"]] });
    return ok({ data: purchases });
  } catch (err) {
    return toErrorResponse(err);
  }
}
