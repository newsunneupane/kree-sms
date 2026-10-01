import { ensureDb } from "@/lib/db";
import { processScheduledSms } from "@/lib/scheduled";
import { ok, fail, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Invoked every minute by Vercel Cron (see vercel.json) and by the local
// instrumentation fallback. Protected by CRON_SECRET.
export async function GET(req) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const header = req.headers.get("authorization");
      const querySecret = new URL(req.url).searchParams.get("secret");
      if (header !== `Bearer ${secret}` && querySecret !== secret) {
        return fail("Unauthorized.", 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      return fail("Cron secret is not configured.", 500);
    }

    await ensureDb();
    await processScheduledSms();
    return ok({ message: "Scheduled SMS processed.", timestamp: new Date().toISOString() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
