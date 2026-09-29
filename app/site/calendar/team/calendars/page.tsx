import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { loadTeamWorkspace } from '@/lib/calendar/team'
import { busyIntervalsForUsers } from '@/lib/calendar/busy'
import CalendarsClient, { type BusyBlock } from './CalendarsClient'

export const metadata: Metadata = { title: 'Shared Calendars — Arwign Teams', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const BUSY_DAYS = 7

export default async function CalendarsRoute() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calendar/team/calendars')
  const ws = await loadTeamWorkspace(supabase)

  // Team busy blocks for the next 7 days — anonymous times (no titles) sourced
  // from every member's synced + native calendar_events. Read with the service
  // role so RLS doesn't hide other members' events; only start/end are exposed,
  // keeping the content-free privacy model ("busy only").
  let busy: BusyBlock[] = []
  if (ws.live && ws.team?.id) {
    try {
      const svc = createServiceRoleClient()
      const { data: tmembers } = await svc
        .from('team_members')
        .select('id, user_id')
        .eq('team_id', ws.team.id)
        .eq('status', 'active')
        .not('user_id', 'is', null)
      const rows = (tmembers ?? []) as { id: string; user_id: string }[]
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
      if (userIds.length) {
        const start = new Date()
        const end = new Date(start.getTime() + BUSY_DAYS * 86400_000)
        const byUser = await busyIntervalsForUsers(svc, userIds, start, end)
        for (const r of rows) {
          for (const iv of byUser.get(r.user_id) ?? []) {
            busy.push({ memberId: r.id, startISO: iv.start.toISOString(), endISO: iv.end.toISOString() })
          }
        }
      }
    } catch { /* best-effort — the page still renders without busy data */ }
  }

  return <CalendarsClient ws={ws} busy={busy} />
}
