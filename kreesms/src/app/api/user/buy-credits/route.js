import { ensureDb } from "@/lib/db";
import { CreditRequest } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse, readJson } from "@/lib/api";
import { validate, buyCreditsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(buyCreditsSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    await CreditRequest.create({
      user_id: session.user.id,
      requested_credits: v.data.credits,
      payment_reference: v.data.reference,
    });
    return ok({ message: "Credit request submitted. An admin will review it." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
