-- Free every-minute SMS dispatcher (Supabase pg_cron + pg_net).
-- No Vercel Pro, no third-party cron service needed.
--
-- ONE-TIME SETUP (Supabase Dashboard, same project as your tables):
--   1. Database -> Extensions -> enable "pg_cron" and "pg_net".
--   2. SQL Editor -> paste this file, replace APP_URL + CRON_SECRET below, Run.
--   3. Verify: SELECT * FROM cron.job;  (you should see dispatch-sms-every-minute)
--   4. Logs:  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
--
-- Replace these two placeholders before running:
--   APP_URL      e.g. https://kree-sms.vercel.app (no trailing slash)
--   CRON_SECRET  same value as the CRON_SECRET env var on Vercel

SELECT cron.schedule(
  'dispatch-sms-every-minute',
  '* * * * *',
  $$
  SELECT net.http_get(
    url := 'APP_URL/api/cron/dispatch-sms',
    headers := '{"Authorization": "Bearer CRON_SECRET"}'::jsonb
  );
  $$
);

-- To pause:  SELECT cron.unschedule('dispatch-sms-every-minute');
-- To resume: re-run the SELECT cron.schedule(...) above.
