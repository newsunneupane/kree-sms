// Standalone local scheduler: node scripts/cron-local.mjs
// (Use this instead of instrumentation when CRON_LOCAL_ENABLED is off.
// On Vercel, scheduling is handled by vercel.json Cron.)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const missing = ["DB_NAME", "DB_USER", "DB_PASS"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Cron] Missing in .env.local: ${missing.join(", ")}. Copy .env.example to .env.local first.`);
  process.exit(1);
}

const cron = (await import("node-cron")).default;
const { ensureDb } = await import("../src/lib/db.js");
const { processScheduledSms } = await import("../src/lib/scheduled.js");

console.log("[Cron] Local scheduler running every minute. Press Ctrl+C to stop.");
cron.schedule("* * * * *", async () => {
  try {
    console.log("[Cron] Checking scheduled SMS...");
    await ensureDb();
    await processScheduledSms();
  } catch (err) {
    console.error("[Cron] Scheduler error:", err.message);
  }
});
