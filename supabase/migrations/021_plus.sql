-- ────────────────────────────────────────────────────────────────────────────
-- 021. ARWIGN PLUS — connected integrations, focus rules, automation rules.
--      Backs the /calendar/plus workspace (lib/calendar/plus.ts). Briefing +
--      feature toggles already live on calendar_settings (migration 019); this
--      migration adds the per-user tables the Plus workspace persists to.
--      Owner-scoped RLS (auth.uid()). Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plus_integrations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,                       -- e.g. 'google', 'microsoft', 'todoist'
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'calendar' CHECK (category IN ('calendar','conferencing','tasks','crm')),
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('connected','available')),
  account     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, account)
);
CREATE INDEX IF NOT EXISTS plus_integrations_user_idx ON plus_integrations(user_id);

CREATE TABLE IF NOT EXISTS plus_focus_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'focus' CHECK (kind IN ('focus','boundary','buffer')),
  detail      TEXT DEFAULT '',
  is_on       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plus_focus_rules_user_idx ON plus_focus_rules(user_id);

CREATE TABLE IF NOT EXISTS plus_automation_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'colour' CHECK (kind IN ('colour','template','reminder','tag')),
  detail      TEXT DEFAULT '',
  is_on       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plus_automation_rules_user_idx ON plus_automation_rules(user_id);

-- ── updated_at triggers (set_updated_at exists from earlier migrations) ──────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['plus_integrations','plus_focus_rules','plus_automation_rules'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS: each user owns their own rows ───────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['plus_integrations','plus_focus_rules','plus_automation_rules'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s owner" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s owner" ON %I FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t, t);
  END LOOP;
END $$;
