-- ────────────────────────────────────────────────────────────────────────────
-- 020. ARWIGN TEAMS — shared calendars, roles, resources, booking pages,
--      delegation & audit. Backs the /calendar/team workspace (lib/calendar/team.ts).
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'teams' CHECK (plan IN ('teams','enterprise')),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seats_total   INTEGER NOT NULL DEFAULT 10,
  timezone      TEXT NOT NULL DEFAULT 'America/New_York',
  billing_email TEXT,
  renews_on     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'view' CHECK (role IN ('view','propose','edit','manage','owner')),
  title         TEXT DEFAULT '',
  timezone      TEXT DEFAULT 'America/New_York',
  tz_offset     INTEGER DEFAULT 3,
  hue           INTEGER DEFAULT 200,
  status        TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active','invited')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, email)
);
CREATE INDEX IF NOT EXISTS team_members_team_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id);

CREATE TABLE IF NOT EXISTS shared_calendars (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  colour      TEXT NOT NULL DEFAULT 'brass',
  visibility  TEXT NOT NULL DEFAULT 'busy' CHECK (visibility IN ('busy','full')),
  member_ids  UUID[] NOT NULL DEFAULT '{}',
  description  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_resources (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'room' CHECK (type IN ('room','equipment','desk','vehicle')),
  capacity          INTEGER NOT NULL DEFAULT 1,
  location          TEXT DEFAULT '',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  colour            TEXT NOT NULL DEFAULT 'sage',
  amenities         TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  resource_id   UUID NOT NULL REFERENCES team_resources(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  requester_id  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resource_bookings_team_idx ON resource_bookings(team_id);

CREATE TABLE IF NOT EXISTS team_booking_pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'round-robin' CHECK (type IN ('round-robin','collective','group')),
  member_ids    UUID[] NOT NULL DEFAULT '{}',
  duration_min  INTEGER NOT NULL DEFAULT 30,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, slug)
);

CREATE TABLE IF NOT EXISTS team_delegations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  grantor_id  UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  grantee_id  UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL DEFAULT '',
  since       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target      TEXT DEFAULT '',
  scope       TEXT NOT NULL DEFAULT 'calendar' CHECK (scope IN ('calendar','member','resource','booking','billing','delegation')),
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_audit_team_idx ON team_audit_log(team_id, at DESC);

-- ── Membership helper (SECURITY DEFINER to avoid RLS recursion) ──────────────
CREATE OR REPLACE FUNCTION is_team_member(p_team UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = p_team AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION team_role_of(p_team UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT role FROM team_members m WHERE m.team_id = p_team AND m.user_id = auth.uid() LIMIT 1;
$$;

-- ── RLS: members read their team's data; managers/owners write ───────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'teams','team_members','shared_calendars','team_resources','resource_bookings',
    'team_booking_pages','team_delegations','team_audit_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- teams
DROP POLICY IF EXISTS "team read"   ON teams;
DROP POLICY IF EXISTS "team insert" ON teams;
DROP POLICY IF EXISTS "team manage" ON teams;
CREATE POLICY "team read"   ON teams FOR SELECT USING (is_team_member(id) OR owner_id = auth.uid());
CREATE POLICY "team insert" ON teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "team manage" ON teams FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- team_members
DROP POLICY IF EXISTS "members read"  ON team_members;
DROP POLICY IF EXISTS "members write" ON team_members;
CREATE POLICY "members read"  ON team_members FOR SELECT USING (is_team_member(team_id) OR user_id = auth.uid());
CREATE POLICY "members write" ON team_members FOR ALL
  USING (team_role_of(team_id) IN ('manage','owner') OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (team_role_of(team_id) IN ('manage','owner') OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- read-for-members / manage-for-managers on the remaining tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shared_calendars','team_resources','resource_bookings','team_booking_pages',
    'team_delegations','team_audit_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s read" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s write" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s read" ON %I FOR SELECT USING (is_team_member(team_id))', t, t);
    EXECUTE format($f$CREATE POLICY "%s write" ON %I FOR ALL
      USING (team_role_of(team_id) IN ('edit','manage','owner'))
      WITH CHECK (team_role_of(team_id) IN ('edit','manage','owner'))$f$, t, t);
  END LOOP;
END $$;
