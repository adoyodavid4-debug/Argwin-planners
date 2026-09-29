// app/site/calendar/join/page.tsx
// Invite acceptance: the link in the team.invite email lands here.
// Requires login, verifies the signed-in email matches the invited row
// (service role — the invitee has no RLS access to the team yet), then
// activates the membership and drops the user into the workspace.
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { TEAMS_MAX_SEATS } from '@/lib/calendar/plan'

export const metadata: Metadata = { title: 'Join your team — Arwign Calendar', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Card({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="container-site py-24">
      <div className="max-w-md mx-auto rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{title}</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>{body}</p>
        <Link href={cta?.href ?? '/calendar'} className="btn-primary text-sm">{cta?.label ?? 'Back to Calendar'}</Link>
      </div>
    </div>
  )
}

export default async function JoinTeamPage({ searchParams }: { searchParams: { m?: string } }) {
  const memberId = searchParams.m?.trim() ?? ''
  if (!UUID_RE.test(memberId)) {
    return <Card title="Invite not found" body="This invite link is incomplete. Please use the button in your invitation email." />
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/calendar/join?m=${memberId}`)}`)
  }

  const service = createServiceRoleClient()
  const { data: row } = await service
    .from('team_members')
    .select('id, team_id, email, status, user_id, name')
    .eq('id', memberId)
    .maybeSingle()

  if (!row) {
    return <Card title="Invite not found" body="This invitation no longer exists — it may have been revoked. Ask your team to invite you again." />
  }

  // Already accepted
  if (row.status === 'active') {
    if (row.user_id === user!.id) redirect('/calendar/team')
    return <Card title="Invite already used" body="This invitation has already been accepted by another account. Ask your team to send you a new one." />
  }

  // The invite belongs to a specific email — the signed-in account must match.
  const userEmail = (user!.email ?? '').toLowerCase()
  if (userEmail !== row.email.toLowerCase()) {
    return (
      <Card
        title="This invite was sent to a different email"
        body={`The invitation is for ${row.email}, but you're signed in as ${user!.email}. Sign in with the invited email to join.`}
        cta={{ href: `/auth/login?redirect=${encodeURIComponent(`/calendar/join?m=${memberId}`)}`, label: 'Switch account' }}
      />
    )
  }

  // Seat limit: only active members consume seats.
  const [{ data: team }, { count: activeCount }] = await Promise.all([
    service.from('teams').select('id, name, seats_total').eq('id', row.team_id).single(),
    service.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', row.team_id).eq('status', 'active'),
  ])
  if (!team) {
    return <Card title="Team not found" body="The team behind this invitation no longer exists." />
  }
  if ((activeCount ?? 0) >= (team.seats_total ?? TEAMS_MAX_SEATS)) {
    return <Card title="This team is full" body={`${team.name} has used all its seats. Ask the team owner to add seats, then try the link again.`} />
  }

  // Activate the membership.
  const { error: updErr } = await service
    .from('team_members')
    .update({ user_id: user!.id, status: 'active' })
    .eq('id', row.id)
    .eq('status', 'invited') // guard against double-accept races
  if (updErr) {
    return <Card title="Something went wrong" body="We could not activate your membership. Please try the link again in a minute." />
  }

  // Audit trail (best-effort)
  try {
    await service.from('team_audit_log').insert({
      team_id: row.team_id, actor_id: row.id, action: 'accepted invite', target: row.email, scope: 'member',
    })
  } catch { /* non-fatal */ }

  redirect('/calendar/team')
}
