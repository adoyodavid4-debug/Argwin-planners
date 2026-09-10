-- ────────────────────────────────────────────────────────────────────────────
-- 028. TEAM MEMBERS GUARD — close two privilege holes the RLS write policy on
--      team_members (migration 020) cannot express, because WITH CHECK only
--      sees the resulting row, not the delta:
--
--   1) Calendar hijack: the "members write" policy lets any manager/owner write
--      ANY row in their team. A manager could INSERT a row with
--      user_id = <victim's UUID> + status='active', which links that victim's
--      auth account to the team — the team then reads their free/busy and the
--      public team-booking flow inserts events onto their calendar, all without
--      the victim's consent. A membership must only be linked to an account BY
--      that account's owner (invite acceptance / self-link).
--
--   2) Self-escalation: a 'manage' member could UPDATE their own row to
--      role='owner'. Only the team's actual owner may mint an owner membership.
--
-- Enforced with a BEFORE INSERT/UPDATE trigger (same approach as
-- protect_profile_privileges, migration 021). Only end users (jwt_role
-- 'authenticated') are constrained; service_role (server routes) and direct DB
-- connections are trusted. Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION protect_team_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role   TEXT := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  v_is_owner BOOLEAN;
  v_old_user UUID;
BEGIN
  -- Only constrain authenticated end users. service_role (server) and direct DB
  -- connections (jwt_role IS NULL) may manage memberships freely.
  IF jwt_role IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM teams t WHERE t.id = NEW.team_id AND t.owner_id = auth.uid())
    INTO v_is_owner;

  -- The team owner has full control over their own team's memberships.
  IF v_is_owner THEN
    RETURN NEW;
  END IF;

  -- (2) Non-owners can never create or retain an owner membership.
  IF NEW.role = 'owner' THEN
    RAISE EXCEPTION 'Only the team owner can assign the owner role';
  END IF;

  -- (1) Non-owners may not link/relink an auth account other than their own.
  -- Leaving user_id NULL (an emailed invite) or self-linking (accepting an
  -- invite) is allowed; attaching or changing someone else's user_id is not.
  IF NEW.user_id IS NOT NULL AND NEW.user_id <> auth.uid() THEN
    IF TG_OP = 'UPDATE' THEN
      SELECT user_id INTO v_old_user FROM team_members WHERE id = NEW.id;
      -- A normal edit (title/role/etc.) of an already-linked member that leaves
      -- user_id unchanged is fine.
      IF v_old_user IS NOT DISTINCT FROM NEW.user_id THEN
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'A membership can only be linked to an account by that account owner';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS team_members_protect ON team_members;
CREATE TRIGGER team_members_protect
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION protect_team_membership();
