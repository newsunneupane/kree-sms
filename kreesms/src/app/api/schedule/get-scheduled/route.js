import { ensureDb } from "@/lib/db";
import { ScheduledSms } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    await ensureDb();
    const schedules = await ScheduledSms.findAll({
      where: { user_id: session.user.id },
      attributes: ["id", "sms_type", "recipient", "message", "scheduled_at", "status"],
      order: [["scheduled_at", "ASC"]],
    });
    return ok({ data: schedules });
  } catch (err) {
    return toErrorResponse(err);
  }
}
