-- ============================================================
--  Arwign Teams → flat plan at $79.99/month that includes up to
--  10 members. This aligns the DB with lib/calendar/plan.ts
--  (TEAMS_MAX_SEATS = 10). Older teams were provisioned with
--  seats_total = 5; lift them to the included capacity so every
--  paying owner actually gets the 10 seats they're paying for.
--
--  Conservative: only RAISES seats below 10. Any team already at
--  or above 10 is left untouched, so no active member is ever
--  displaced by shrinking a seat count. Safe to re-run.
--  Run the whole file in the Supabase SQL editor.
-- ============================================================

-- New teams default to the full included capacity.
ALTER TABLE teams ALTER COLUMN seats_total SET DEFAULT 10;

-- Existing teams: top up to 10 (never down — grandfather larger teams).
UPDATE teams
  SET seats_total = 10
  WHERE seats_total < 10;
