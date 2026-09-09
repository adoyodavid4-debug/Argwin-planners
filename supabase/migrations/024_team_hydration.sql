-- ────────────────────────────────────────────────────────────────────────────
-- 024. ARWIGN TEAMS — real analytics counts + public booking capture.
--
-- Two things the Teams workspace was faking are made real here:
--   (a) team_calendar_cells(team) — a SECURITY DEFINER function that returns each
--       active member's event *scheduling shape* (times + classification metadata:
--       rrule/exdates/tags/event_type/colour), but NEVER titles, descriptions or
--       locations. This lets the analytics count meetings / focus hours / events
--       per member across the team without breaking calendar_events' strict
--       per-user RLS and without exposing what anyone's meetings are actually about.
--   (b) team_bookings — records bookings made through team booking pages, backing
--       the "Bookings · 30d" metric (team_booking_pages had no bookings table).
--
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

-- ── (a) Content-free per-member scheduling cells ────────────────────────────
-- auth.uid() inside a SECURITY DEFINER function still reflects the CALLER's JWT,
-- so the is_team_member() guard genuinely restricts rows to the caller's team.
CREATE OR REPLACE FUNCTION team_calendar_cells(p_team UUID)
RETURNS TABLE (
  member_id  UUID,
  event_id   UUID,
  start_at   TIMESTAMPTZ,
  end_at     TIMESTAMPTZ,
  all_day    BOOLEAN,
  rrule      TEXT,
  exdates    TIMESTAMPTZ[],
  tags       TEXT[],
  event_type TEXT,
  colour     TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.id AS member_id,
         e.id  AS event_id,
         e.start_at, e.end_at, e.all_day, e.rrule, e.exdates,
         e.tags, e.event_type, e.colour
  FROM team_members tm
  JOIN calendar_events e ON e.user_id = tm.user_id
  WHERE tm.team_id = p_team
    AND tm.status = 'active'
    AND is_team_member(p_team);
$$;

REVOKE ALL ON FUNCTION team_calendar_cells(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION team_calendar_cells(UUID) TO authenticated;

-- ── (b) Bookings captured through team booking pages ────────────────────────
CREATE TABLE IF NOT EXISTS team_bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id            UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  page_id            UUID NOT NULL REFERENCES team_booking_pages(id) ON DELETE CASCADE,
  assigned_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  event_id           UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  notes              TEXT,
  guest_tz           TEXT,
  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_bookings_time_order CHECK (end_at > start_at)
);
CREATE INDEX IF NOT EXISTS team_bookings_team_idx ON team_bookings(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_bookings_page_idx ON team_bookings(page_id, start_at);
-- One confirmed booking per member per slot (round-robin assigns a member;
-- collective/group use a nil-ish assignee so the whole slot is taken once).
CREATE UNIQUE INDEX IF NOT EXISTS team_bookings_slot_uniq
  ON team_bookings(page_id, start_at, assigned_member_id) WHERE (status = 'confirmed');

ALTER TABLE team_bookings ENABLE ROW LEVEL SECURITY;

-- Team members can read their team's bookings. Public creation is performed
-- server-side with the service role (see /api/calendar/team-bookings), mirroring
-- the individual `bookings` table — so there is deliberately no anon write policy.
DROP POLICY IF EXISTS "team_bookings read" ON team_bookings;
CREATE POLICY "team_bookings read" ON team_bookings
  FOR SELECT USING (is_team_member(team_id));
