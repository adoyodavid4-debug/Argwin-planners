-- ────────────────────────────────────────────────────────────────────────────
-- 021. CALENDAR PLAN GATING
--
-- Adds profiles.calendar_plan (free/plus/teams) and a trigger that stops an
-- ordinary logged-in user from changing their own role or calendar_plan — only
-- the server (service_role) or a direct DB connection may. This makes plan
-- gating meaningful (users can't self-grant Plus) and also closes a role
-- self-escalation hole in the existing "profiles: own row" RLS policy.
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (calendar_plan IN ('free','plus','teams'));

CREATE OR REPLACE FUNCTION protect_profile_privileges()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
BEGIN
  -- Only reset when the caller is an ordinary authenticated end-user.
  -- service_role (server) and direct DB connections (jwt_role IS NULL) may change these.
  IF jwt_role = 'authenticated' THEN
    NEW.role          := OLD.role;
    NEW.calendar_plan := OLD.calendar_plan;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_protect_privileges ON profiles;
CREATE TRIGGER profiles_protect_privileges
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges();
