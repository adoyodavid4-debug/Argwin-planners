-- ────────────────────────────────────────────────────────────────────────────
-- 033. TEAMS PLAN GATE — only active Arwign Teams subscribers (or admins) can
--      CREATE a team. Closes the gap where any signed-in user could provision
--      a free team via provisionTeam()/direct inserts, bypassing the UI gate.
--
--      Members of an existing team never need this: joining only updates their
--      own team_members row. The owner-pays model — one subscriber creates the
--      team, invited members ride on that subscription (see lib/calendar/
--      guard.ts isActiveTeamMember and app/site/calendar/team/layout.tsx).
--
--      profiles.calendar_plan is safe to trust here: migration 021 blocks
--      users from changing their own plan; only server-side (service role)
--      writes set it after a verified PayPal payment.
--
--      Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "team insert" ON teams;
CREATE POLICY "team insert" ON teams FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.id = auth.uid()
       AND (
         p.role IN ('admin', 'super_admin')
         OR (
           p.calendar_plan = 'teams'
           AND (p.plan_expires_at IS NULL OR p.plan_expires_at > now())
         )
       )
  )
);
