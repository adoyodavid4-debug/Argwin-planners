-- ============================================================
--  Calendar cron pings via Supabase pg_cron + pg_net
--
--  WHY: /api/cron/calendar-reminders (every 5 min) and
--  /api/cron/calendar-sync (hourly) exist and are CRON_SECRET-
--  gated, but Vercel's Hobby plan only allows once-per-day crons,
--  so they were never scheduled and event reminders + Google/
--  Microsoft sync never ran. Supabase's built-in pg_cron can ping
--  them at full frequency instead.
--
--  BEFORE RUNNING: replace PASTE_CRON_SECRET_HERE below (2 places)
--  with the CRON_SECRET value from Vercel → Project → Settings →
--  Environment Variables. Then run the whole file in the Supabase
--  SQL editor. Re-runnable (unschedules first).
--
--  To verify later:  SELECT * FROM cron.job;
--  Recent runs:      SELECT * FROM cron.job_run_details
--                    ORDER BY start_time DESC LIMIT 20;
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Clean slate (ignore "job not found" errors on first run)
DO $$
BEGIN
  PERFORM cron.unschedule('arwign-calendar-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('arwign-calendar-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Event reminders — every 5 minutes
SELECT cron.schedule(
  'arwign-calendar-reminders',
  '*/5 * * * *',
  $job$
  SELECT net.http_get(
    url     := 'https://www.arwignplanners.com/api/cron/calendar-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
    timeout_milliseconds := 25000
  );
  $job$
);

-- Google / Microsoft calendar sync — hourly at :10
SELECT cron.schedule(
  'arwign-calendar-sync',
  '10 * * * *',
  $job$
  SELECT net.http_get(
    url     := 'https://www.arwignplanners.com/api/cron/calendar-sync',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE'),
    timeout_milliseconds := 55000
  );
  $job$
);

SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'arwign-%';
