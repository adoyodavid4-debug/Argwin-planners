-- ────────────────────────────────────────────────────────────────────────────
-- 025. ARWIGN TEAMS — per-page booking availability config + group capacity.
--
-- team_booking_pages previously carried only name/type/member_ids/duration, so
-- the public booking flow had to assume a fixed schedule (team tz, Mon–Fri
-- 09:00–17:00, 4h notice, 30d horizon). These columns let each page define its
-- own availability, and `capacity` gives "group" pages a real multi-invitee
-- model (many attendees share one slot, up to capacity).
--
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS working_hours JSONB NOT NULL
  DEFAULT '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}'::jsonb;
ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS buffer_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_min BETWEEN 0 AND 240);
ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER NOT NULL DEFAULT 4 CHECK (min_notice_hours BETWEEN 0 AND 720);
ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS advance_days INTEGER NOT NULL DEFAULT 30 CHECK (advance_days BETWEEN 1 AND 365);
-- Attendees per slot for "group" pages (ignored by round-robin/collective).
ALTER TABLE team_booking_pages ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 500);
