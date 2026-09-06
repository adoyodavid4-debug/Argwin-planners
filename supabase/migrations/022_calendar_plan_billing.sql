-- ────────────────────────────────────────────────────────────────────────────
-- 022. CALENDAR PLAN BILLING — plan expiry
--
-- Adds profiles.plan_expires_at so a paid plan can lapse (a period is granted on
-- payment). Extends the privilege-protection trigger to also stop end-users from
-- self-extending their expiry. Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION protect_profile_privileges()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
BEGIN
  IF jwt_role = 'authenticated' THEN
    NEW.role            := OLD.role;
    NEW.calendar_plan   := OLD.calendar_plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
  END IF;
  RETURN NEW;
END $$;
