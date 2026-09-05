-- ────────────────────────────────────────────────────────────────────────────
-- 019. CALENDAR PLUS — phone (for SMS briefings) + feature toggles
--
-- Adds a phone number so a user can receive the SMS Daily Outlook Briefing and
-- SMS reminders, plus a `features` JSON blob holding the on/off state of the
-- Arwign Plus capabilities surfaced in the calendar app's Plus panel.
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE calendar_settings
  ADD COLUMN IF NOT EXISTS phone    TEXT,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb;
