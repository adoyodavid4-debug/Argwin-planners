-- ────────────────────────────────────────────────────────────────────────────
-- 030. TIMEZONE — US/UK market default. Migration 020 created
--      team_members.tz_offset with DEFAULT 3 (UTC+3 = Africa/Nairobi, a
--      leftover from the pre-market codebase). Switch the default to -5 (US
--      Eastern) and correct any existing +3 rows so the availability finder
--      never computes in Nairobi time. Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE team_members ALTER COLUMN tz_offset SET DEFAULT -5;

UPDATE team_members SET tz_offset = -5 WHERE tz_offset = 3;
