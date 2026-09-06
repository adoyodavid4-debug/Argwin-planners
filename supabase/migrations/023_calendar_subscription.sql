-- ────────────────────────────────────────────────────────────────────────────
-- 023. CALENDAR SUBSCRIPTION — PayPal recurring subscription id
--
-- Stores the PayPal subscription id so we can cancel it and reconcile webhooks.
-- Also protected from end-user self-edits (only server/service_role sets it).
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

CREATE OR REPLACE FUNCTION protect_profile_privileges()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
BEGIN
  IF jwt_role = 'authenticated' THEN
    NEW.role                   := OLD.role;
    NEW.calendar_plan          := OLD.calendar_plan;
    NEW.plan_expires_at        := OLD.plan_expires_at;
    NEW.paypal_subscription_id := OLD.paypal_subscription_id;
  END IF;
  RETURN NEW;
END $$;
