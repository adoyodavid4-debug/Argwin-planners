-- ────────────────────────────────────────────────────────────────────────────
-- 030. ARWIGN PLUS/TEAMS GAPS (from the Calendar Masterplan)
--   • event_templates       — reusable recurring-event blueprints (Pillar D)
--   • calendar_settings cols — boundary rules (protected hours) + evening-preview
--                              dedup for the Daily Outlook Briefing (§14)
-- RLS ships in the same migration. Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

-- Reusable event blueprints ("Weekly 1:1", "Client kickoff") — applied in one
-- click to create a real calendar_event with its buffers.
CREATE TABLE IF NOT EXISTS event_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,                 -- template label (e.g. "Weekly 1:1")
  title             TEXT NOT NULL,                 -- event title it creates
  description       TEXT NOT NULL DEFAULT '',      -- agenda/notes
  duration_min      INTEGER NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 5 AND 1440),
  colour            TEXT NOT NULL DEFAULT 'brass',
  event_type        TEXT,
  location          TEXT NOT NULL DEFAULT '',
  conferencing      TEXT NOT NULL DEFAULT '',      -- 'google-meet' | 'zoom' | 'teams' | ''
  attendees         TEXT[] NOT NULL DEFAULT '{}',  -- invitee emails
  buffer_before_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_min BETWEEN 0 AND 240),
  buffer_after_min  INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_min BETWEEN 0 AND 240),
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_templates_user_idx ON event_templates(user_id);

ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_templates owner all" ON event_templates;
CREATE POLICY "event_templates owner all" ON event_templates FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Boundary rules: protected windows outside which meetings are flagged / moved.
-- (no_meeting_days already exists on calendar_settings from migration 016.)
ALTER TABLE calendar_settings
  ADD COLUMN IF NOT EXISTS protect_after_hour  SMALLINT,  -- evenings: start >= this hour violates (e.g. 18)
  ADD COLUMN IF NOT EXISTS protect_before_hour SMALLINT,  -- mornings: start <  this hour violates (e.g. 8)
  ADD COLUMN IF NOT EXISTS last_evening_on     DATE;      -- evening-preview send dedup (local date)
