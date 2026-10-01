import { ensureDb } from "@/lib/db";
import { sanitizeUser } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { ok, fail, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Session restore for page reloads: cookie -> current user (no password).
export async function GET(req) {
  try {
    await ensureDb();
    const session = await getSession(req);
    if (!session) return fail("Not authenticated.", 401);
    return ok({ user: sanitizeUser(session.user) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
