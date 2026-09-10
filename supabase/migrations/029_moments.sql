-- ────────────────────────────────────────────────────────────────────────────
-- 029. MOMENTS & MEMORIES — important dates and moments Plus/Teams customers add
--      to their lives (anniversaries, birthdays, milestones …), optionally shared
--      with invitees and celebrated by email each year with balloons & confetti.
--      Backs /calendar/plus/moments and /calendar/team/moments (lib/calendar/moments.ts)
--      and the daily cron /api/cron/moment-anniversaries.
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  note                 TEXT NOT NULL DEFAULT '',
  moment_type          TEXT NOT NULL DEFAULT 'anniversary'
                         CHECK (moment_type IN ('anniversary','birthday','wedding','milestone','memorial','other')),
  moment_date          DATE NOT NULL,          -- the original date; anniversaries recur on this month/day
  recurring            BOOLEAN NOT NULL DEFAULT TRUE,
  image_url            TEXT,                    -- optional memory photo (moment-media bucket)
  timezone             TEXT NOT NULL DEFAULT 'America/New_York',
  last_celebrated_year INTEGER,                 -- year the anniversary email last went out (cron dedupe)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moments_user_idx ON moments(user_id);
-- Narrows the daily anniversary cron's scan to recurring rows.
CREATE INDEX IF NOT EXISTS moments_recurring_idx ON moments(recurring) WHERE recurring;

CREATE TABLE IF NOT EXISTS moment_invitees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id   UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  notify      BOOLEAN NOT NULL DEFAULT TRUE,   -- receives the yearly anniversary email
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moment_id, email)
);
CREATE INDEX IF NOT EXISTS moment_invitees_moment_idx ON moment_invitees(moment_id);

-- ── RLS: a moment (and its invitees) belongs to exactly one owner ────────────
ALTER TABLE moments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_invitees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moments owner all" ON moments;
CREATE POLICY "moments owner all" ON moments FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "moment invitees owner all" ON moment_invitees;
CREATE POLICY "moment invitees owner all" ON moment_invitees FOR ALL
  USING      (EXISTS (SELECT 1 FROM moments m WHERE m.id = moment_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM moments m WHERE m.id = moment_id AND m.user_id = auth.uid()));

-- ── Storage bucket for memory photos ─────────────────────────────────────────
-- Public read (photos embed in celebratory emails); uploads happen server-side
-- with the service-role key, which bypasses RLS — no write policy needed.
INSERT INTO storage.buckets (id, name, public) VALUES ('moment-media', 'moment-media', TRUE)
ON CONFLICT (id) DO NOTHING;

DO $storagepolicy$
BEGIN
  DROP POLICY IF EXISTS "public read moment-media" ON storage.objects;
  CREATE POLICY "public read moment-media" ON storage.objects FOR SELECT
    USING (bucket_id = 'moment-media');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped storage policy creation: %', SQLERRM;
END
$storagepolicy$;
