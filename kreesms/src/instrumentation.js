// Local-only scheduled-SMS runner. Vercel uses vercel.json Cron instead,
// so this stays dormant there (checked via VERCEL env + explicit opt-in).

export async function register() {
  if (process.env.VERCEL) return;
  if (process.env.CRON_LOCAL_ENABLED !== "true") return;

  const cron = await import("node-cron");
  const { processScheduledSms } = await import("./lib/scheduled.js");
  const { ensureDb } = await import("./lib/db.js");

  cron.default.schedule("* * * * *", async () => {
    try {
      console.log("[Cron] Checking scheduled SMS...");
      await ensureDb();
      await processScheduledSms();
    } catch (err) {
      console.error("[Cron] Scheduler error:", err.message);
    }
  });
  console.log("[Cron] Local SMS scheduler started (CRON_LOCAL_ENABLED=true).");
}
