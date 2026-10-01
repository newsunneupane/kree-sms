import { ensureDb } from "@/lib/db";
import { ScheduledSms } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse, readJson } from "@/lib/api";
import { validate, scheduleSmsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(scheduleSmsSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    await ScheduledSms.create({
      user_id: session.user.id,
      sms_type: "single",
      recipient: v.data.recipient,
      message: v.data.message,
      scheduled_at: v.data.scheduled_at,
      status: "pending",
    });
    return ok({ message: "SMS scheduled." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
