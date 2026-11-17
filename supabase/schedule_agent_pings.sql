-- ============================================================
--  Growth-agent cron pings via Supabase pg_cron + pg_net
--
--  WHY: /api/agents/tick is the pacing dispatcher — it must run
--  EVERY MINUTE (it sends at most pace_per_minute messages per
--  channel per tick, publishes due pins, synthesises events and
--  expires stale approvals). Vercel's Hobby plan only allows
--  once-per-day crons, so vercel.json can only fire it daily.
--  Supabase's built-in pg_cron pings it at full frequency instead,
--  exactly like supabase/schedule_calendar_pings.sql.
--
--  /api/agents/cron (the daily plan/act/report pass) is already
--  scheduled daily in vercel.json, so it is NOT re-added here. If
--  you ever move off Vercel crons, uncomment the second block.
--
--  BEFORE RUNNING: replace PASTE_CRON_SECRET_HERE below with the
--  CRON_SECRET value from Vercel → Project → Settings → Environment
--  Variables (it was rotated — use the current value). Then run the
--  whole file in the Supabase SQL editor. Re-runnable (unschedules
--  first).
--
--  To verify later:  SELECT * FROM cron.job WHERE jobname LIKE 'arwign-agent%';
--  Recent runs:      SELECT * FROM cron.job_run_details
--                    ORDER BY start_time DESC LIMIT 20;
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Clean slate (ignore "job not found" errors on first run)
DO $$
BEGIN
  PERFORM cron.unschedule('arwign-agent-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Pacing dispatcher — every minute
SELECT cron.schedule(
  'arwign-agent-tick',
  '* * * * *',
  $job$
  SELECT net.http_get(
    url     := 'https://www.arwignplanners.com/api/agents/tick',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
    timeout_milliseconds := 50000
  );
  $job$
);

-- Optional: daily agent plan/act/report pass. Already scheduled in
-- vercel.json ("/api/agents/cron" at 07:00). Only uncomment if you
-- move scheduling entirely onto pg_cron.
-- DO $$
-- BEGIN
--   PERFORM cron.unschedule('arwign-agent-cron');
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;
-- SELECT cron.schedule(
--   'arwign-agent-cron',
--   '0 7 * * *',
--   $job$
--   SELECT net.http_get(
--     url     := 'https://www.arwignplanners.com/api/agents/cron',
--     headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
--     timeout_milliseconds := 300000
--   );
--   $job$
-- );

SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'arwign-agent%';
