-- 027_poll_votes_privacy.sql
-- Pre-launch security fix: remove the blanket public-read policy on poll_votes.
--
-- 016_calendar_full.sql added `poll_votes_public_read USING (true)`, which let
-- ANY anon/authenticated caller SELECT every vote row — including voter_email
-- and voter_name — across all polls. That overrode the intended owner-only read.
--
-- Safe to drop because nothing depends on public reads of poll_votes:
--   • Voting is written server-side via the service role
--     (app/api/calendar/polls/vote/route.ts → createServiceRoleClient), which
--     bypasses RLS, so recording a vote is unaffected.
--   • The public voting page (app/site/calendar/poll/[slug]/page.tsx) reads only
--     meeting_polls + poll_options, never poll_votes.
--   • The poll owner still reads their own polls' votes via the retained
--     `poll_votes_owner_read` policy (owner_id = auth.uid()).
--
-- meeting_polls / poll_options remain publicly readable on purpose: the public
-- voting page needs them for anon visitors. They expose only poll titles/options
-- (no PII), an accepted trade-off for the shareable-link flow.

drop policy if exists "poll_votes_public_read" on poll_votes;

-- Belt-and-braces: ensure the owner-only read policy is present.
drop policy if exists "poll_votes_owner_read" on poll_votes;
create policy "poll_votes_owner_read" on poll_votes
  for select using (
    exists (select 1 from meeting_polls p where p.id = poll_id and p.owner_id = auth.uid())
  );
