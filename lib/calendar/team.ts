// lib/calendar/team.ts — Arwign Teams workspace: types, roles, sample data
// and a resilient Supabase loader.
//
// The Teams UI is designed to render fully even before the `020_teams.sql`
// migration has been applied to the database — exactly like CalendarApp's
// `needsSetup` fallback. `loadTeamWorkspace()` tries the real tables and, if
// they don't exist yet (or are empty), returns rich SAMPLE data plus
// `live: false` so the interface is always alive and honest about its state.
//
// Derived analytics counts (meetings/focus per member, events per shared
// calendar, bookings·30d per page) are hydrated from real data via migration
// 024: the `team_calendar_cells` RPC (content-free per-member scheduling) and
// the `team_bookings` table. See hydrateCounts() below.

import { wallTimeToUtc } from './slots'
import { expandRange, type CalEventRow } from './plus'

// ── Roles ─────────────────────────────────────────────────────
// Ordered least → most privileged. `rank` gates who can change whom.
export type Role = 'view' | 'propose' | 'edit' | 'manage' | 'owner'

export interface RoleDef {
  key: Role
  label: string
  rank: number
  blurb: string
  can: string[]
}

export const ROLES: Record<Role, RoleDef> = {
  view: {
    key: 'view', label: 'Viewer', rank: 0,
    blurb: 'Read-only across shared calendars and booking pages.',
    can: ['See shared calendars & free/busy', 'Open the availability finder'],
  },
  propose: {
    key: 'propose', label: 'Contributor', rank: 1,
    blurb: 'Can suggest events and bookings for approval.',
    can: ['Everything a Viewer can', 'Propose events & bookings', 'Request rooms & resources'],
  },
  edit: {
    key: 'edit', label: 'Editor', rank: 2,
    blurb: 'Creates and edits events on shared calendars directly.',
    can: ['Everything a Contributor can', 'Create & edit shared events', 'Book resources directly'],
  },
  manage: {
    key: 'manage', label: 'Manager', rank: 3,
    blurb: 'Manages members, resources and booking pages.',
    can: ['Everything an Editor can', 'Invite & assign roles', 'Approve resource requests', 'Manage booking pages'],
  },
  owner: {
    key: 'owner', label: 'Owner', rank: 4,
    blurb: 'Full control including billing and the team itself.',
    can: ['Everything a Manager can', 'Centralised billing & seats', 'Delete or transfer the team'],
  },
}

export const ROLE_ORDER: Role[] = ['owner', 'manage', 'edit', 'propose', 'view']

// ── Types ─────────────────────────────────────────────────────
export interface Team {
  id: string
  name: string
  plan: 'teams' | 'enterprise'
  seats_used: number
  seats_total: number
  timezone: string
  billing_email: string
  renews_on: string // ISO date
  created_at: string
}

export interface Member {
  id: string
  name: string
  email: string
  role: Role
  title: string
  timezone: string
  tz_offset: number // hours from UTC, for the availability finder
  hue: number       // 0–360, deterministic avatar tint
  status: 'active' | 'invited'
  last_active: string // human label
  meetings_week: number
  focus_hours: number
}

export interface SharedCalendar {
  id: string
  name: string
  colour: string
  visibility: 'busy' | 'full'
  member_ids: string[]
  events_week: number
  description: string
}

export type ResourceType = 'room' | 'equipment' | 'desk' | 'vehicle'
export interface Resource {
  id: string
  name: string
  type: ResourceType
  capacity: number
  location: string
  requires_approval: boolean
  colour: string
  amenities: string[]
}

export interface ResourceBooking {
  id: string
  resource_id: string
  title: string
  requester_id: string
  start_at: string
  end_at: string
  status: 'pending' | 'approved' | 'declined'
}

export type PageType = 'round-robin' | 'collective' | 'group'
// Weekly availability windows keyed by ISO weekday (1=Mon … 7=Sun), each an
// array of [start,end] wall-clock strings — mirrors booking_pages (migration 015).
export type WorkingHours = Record<string, [string, string][]>
export interface TeamBookingPage {
  id: string
  name: string
  slug: string
  type: PageType
  member_ids: string[]
  duration_min: number
  bookings_30d: number
  active: boolean
  description: string
  // Per-page availability config (migration 025).
  timezone: string
  working_hours: WorkingHours
  buffer_min: number
  min_notice_hours: number
  advance_days: number
  capacity: number // attendees per slot for "group" pages
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  '1': [['09:00', '17:00']], '2': [['09:00', '17:00']], '3': [['09:00', '17:00']],
  '4': [['09:00', '17:00']], '5': [['09:00', '17:00']],
}

export interface AuditEntry {
  id: string
  actor_id: string
  action: string
  target: string
  scope: 'calendar' | 'member' | 'resource' | 'booking' | 'billing' | 'delegation'
  at: string // ISO datetime
}

export interface Delegation {
  id: string
  grantor_id: string
  grantee_id: string
  scope: string
  since: string
}

export interface TeamWorkspace {
  live: boolean
  currentMemberId: string // the team_members.id of the signed-in user ('u1' in sample)
  team: Team
  members: Member[]
  calendars: SharedCalendar[]
  resources: Resource[]
  resourceBookings: ResourceBooking[]
  pages: TeamBookingPage[]
  audit: AuditEntry[]
  delegations: Delegation[]
}

// ── Colour tokens (mirror CalendarApp's palette) ──────────────
export const TEAM_COLOURS: Record<string, { dot: string; soft: string }> = {
  brass:    { dot: '#A0830E', soft: 'rgba(160,131,14,0.16)' },
  sage:     { dot: '#6E8B7A', soft: 'rgba(110,139,122,0.18)' },
  clay:     { dot: '#B4664A', soft: 'rgba(180,102,74,0.18)' },
  lavender: { dot: '#7B6FAE', soft: 'rgba(123,111,174,0.18)' },
  ocean:    { dot: '#3E7C97', soft: 'rgba(62,124,151,0.18)' },
  rose:     { dot: '#B15B7E', soft: 'rgba(177,91,126,0.18)' },
  forest:   { dot: '#4B7A4E', soft: 'rgba(75,122,78,0.18)' },
  honey:    { dot: '#C9902B', soft: 'rgba(201,144,43,0.18)' },
}

// ── Helpers ───────────────────────────────────────────────────
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

export const avatarStyle = (hue: number) => ({
  background: `hsl(${hue} 45% 92%)`,
  color: `hsl(${hue} 45% 34%)`,
})

export const fmtOffset = (h: number) => `UTC${h >= 0 ? '+' : ''}${h}`

// Local wall-clock hour for a member given a reference UTC hour and the
// team's base offset. Used by the availability finder heat strip.
export const localHour = (utcHour: number, offset: number) => ((utcHour + offset) % 24 + 24) % 24

// ── Sample workspace ──────────────────────────────────────────
export function sampleWorkspace(): TeamWorkspace {
  const M = (
    id: string, name: string, email: string, role: Role, title: string,
    timezone: string, tz_offset: number, hue: number,
    status: Member['status'], last_active: string, meetings_week: number, focus_hours: number,
  ): Member => ({ id, name, email, role, title, timezone, tz_offset, hue, status, last_active, meetings_week, focus_hours })

  const members: Member[] = [
    M('u1', 'Emma Carter', 'emma@arwign.com', 'owner', 'Founder & CEO', 'America/New_York', -5, 28, 'active', 'now', 19, 11),
    M('u2', 'James Bennett', 'james@arwign.com', 'manage', 'Head of Ops', 'America/New_York', -5, 205, 'active', '4m ago', 24, 6),
    M('u3', 'Olivia Hughes', 'olivia@arwign.com', 'edit', 'Product Designer', 'Europe/London', 0, 145, 'active', '1h ago', 14, 18),
    M('u4', 'Liam Walsh', 'liam@arwign.com', 'edit', 'Engineer', 'America/Chicago', -6, 95, 'active', '2h ago', 9, 26),
    M('u5', 'Sophia Reed', 'sophia@arwign.com', 'propose', 'Account Executive', 'America/Los_Angeles', -8, 330, 'active', '3h ago', 31, 3),
    M('u6', 'Noah Foster', 'noah@arwign.com', 'view', 'Finance', 'Europe/London', 0, 260, 'active', 'yesterday', 7, 22),
    M('u7', 'Ava Mitchell', 'ava@arwign.com', 'propose', 'Marketing Lead', 'America/Denver', -7, 15, 'invited', 'pending', 0, 0),
  ]

  const calendars: SharedCalendar[] = [
    { id: 'c1', name: 'Company-wide', colour: 'brass', visibility: 'full', member_ids: members.map((m) => m.id), events_week: 42, description: 'All-hands, holidays and company events.' },
    { id: 'c2', name: 'Product & Eng', colour: 'ocean', visibility: 'full', member_ids: ['u1', 'u3', 'u4'], events_week: 27, description: 'Standups, planning, design & release reviews.' },
    { id: 'c3', name: 'Sales', colour: 'clay', visibility: 'busy', member_ids: ['u2', 'u5', 'u6'], events_week: 51, description: 'Pipeline calls, demos and QBRs.' },
    { id: 'c4', name: 'Leadership', colour: 'lavender', visibility: 'busy', member_ids: ['u1', 'u2'], events_week: 9, description: 'Exec syncs and board prep.' },
  ]

  const resources: Resource[] = [
    { id: 'r1', name: 'New York · Boardroom', type: 'room', capacity: 12, location: 'New York HQ, 4th floor', requires_approval: true, colour: 'brass', amenities: ['4K display', 'Video bar', 'Whiteboard'] },
    { id: 'r2', name: 'New York · Focus Pod A', type: 'room', capacity: 3, location: 'New York HQ, 4th floor', requires_approval: false, colour: 'sage', amenities: ['Monitor', 'Quiet'] },
    { id: 'r3', name: 'London · Meeting Room', type: 'room', capacity: 6, location: 'London office', requires_approval: false, colour: 'ocean', amenities: ['Display', 'Video bar'] },
    { id: 'r4', name: 'Demo Laptop + Clicker', type: 'equipment', capacity: 1, location: 'HQ store', requires_approval: false, colour: 'honey', amenities: ['Loaner'] },
    { id: 'r5', name: 'Hot Desk Bank', type: 'desk', capacity: 8, location: 'HQ, 3rd floor', requires_approval: false, colour: 'forest', amenities: ['Dual monitor'] },
    { id: 'r6', name: 'Company Van', type: 'vehicle', capacity: 5, location: 'Basement parking', requires_approval: true, colour: 'clay', amenities: ['Fuel card'] },
  ]

  const today = '2026-09-05'
  const resourceBookings: ResourceBooking[] = [
    { id: 'rb1', resource_id: 'r1', title: 'Q4 board prep', requester_id: 'u2', start_at: `${today}T13:00:00`, end_at: `${today}T15:00:00`, status: 'pending' },
    { id: 'rb2', resource_id: 'r6', title: 'Client site visit', requester_id: 'u5', start_at: `2026-09-08T08:00:00`, end_at: `2026-09-08T17:00:00`, status: 'pending' },
    { id: 'rb3', resource_id: 'r1', title: 'All-hands', requester_id: 'u1', start_at: `2026-09-09T10:00:00`, end_at: `2026-09-09T11:00:00`, status: 'approved' },
    { id: 'rb4', resource_id: 'r3', title: 'Design crit', requester_id: 'u3', start_at: `${today}T09:00:00`, end_at: `${today}T10:00:00`, status: 'approved' },
    { id: 'rb5', resource_id: 'r1', title: 'Vendor pitch', requester_id: 'u5', start_at: `2026-09-06T14:00:00`, end_at: `2026-09-06T15:00:00`, status: 'declined' },
  ]

  const pageDefaults = { timezone: 'America/New_York', working_hours: DEFAULT_WORKING_HOURS, buffer_min: 0, min_notice_hours: 4, advance_days: 30, capacity: 1 }
  const pages: TeamBookingPage[] = [
    { id: 'p1', name: 'Talk to Sales', slug: 'sales', type: 'round-robin', member_ids: ['u2', 'u5'], duration_min: 30, bookings_30d: 47, active: true, description: 'Distributes demos evenly across the sales team.', ...pageDefaults },
    { id: 'p2', name: 'Product Interview', slug: 'interview', type: 'collective', member_ids: ['u1', 'u3'], duration_min: 45, bookings_30d: 12, active: true, description: 'Books only when everyone is free.', ...pageDefaults },
    { id: 'p3', name: 'Design Office Hours', slug: 'design-oh', type: 'group', member_ids: ['u3', 'u4'], duration_min: 60, bookings_30d: 8, active: true, description: 'Many attendees, one slot.', ...pageDefaults, capacity: 20 },
    { id: 'p4', name: 'Support Triage', slug: 'support', type: 'round-robin', member_ids: ['u4', 'u6'], duration_min: 20, bookings_30d: 0, active: false, description: 'Paused during the release freeze.', ...pageDefaults },
  ]

  const audit: AuditEntry[] = [
    { id: 'a1', actor_id: 'u2', action: 'approved room request', target: 'New York · Boardroom — All-hands', scope: 'resource', at: `${today}T08:42:00` },
    { id: 'a2', actor_id: 'u1', action: 'changed role', target: 'Priya Nair → Contributor', scope: 'member', at: `${today}T08:15:00` },
    { id: 'a3', actor_id: 'u3', action: 'edited shared event', target: 'Product & Eng — Sprint review', scope: 'calendar', at: `2026-09-04T16:30:00` },
    { id: 'a4', actor_id: 'u2', action: 'invited member', target: 'sara@arwign.com', scope: 'member', at: `2026-09-04T14:02:00` },
    { id: 'a5', actor_id: 'u5', action: 'created booking page', target: 'Talk to Sales (round-robin)', scope: 'booking', at: `2026-09-03T11:20:00` },
    { id: 'a6', actor_id: 'u1', action: 'delegated calendar', target: 'David Mwangi acts for Amara', scope: 'delegation', at: `2026-09-02T09:00:00` },
    { id: 'a7', actor_id: 'u1', action: 'updated billing', target: 'Seats 8 → 10', scope: 'billing', at: `2026-09-01T10:05:00` },
  ]

  const delegations: Delegation[] = [
    { id: 'd1', grantor_id: 'u1', grantee_id: 'u2', scope: 'Full calendar & scheduling', since: '2026-08-01' },
    { id: 'd2', grantor_id: 'u3', grantee_id: 'u4', scope: 'Accept/decline while on leave', since: '2026-09-01' },
  ]

  const team: Team = {
    id: 'team-sample', name: 'Arwign', plan: 'teams',
    seats_used: members.filter((m) => m.status === 'active').length, seats_total: 10,
    timezone: 'America/New_York', billing_email: 'billing@arwign.com',
    renews_on: '2026-10-05', created_at: '2026-06-01',
  }

  return { live: false, currentMemberId: 'u1', team, members, calendars, resources, resourceBookings, pages, audit, delegations }
}

// Convenience lookups shared by sections.
export const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)
export const memberName = (members: Member[], id: string) => byId(members, id)?.name ?? 'Unknown'

const hueFrom = (seed: string) => { let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0; return Math.abs(h) % 360 }

function mapMember(r: any): Member {
  return {
    id: r.id, name: r.name || (r.email?.split('@')[0] ?? 'Member'), email: r.email,
    role: r.role, title: r.title || '', timezone: r.timezone || 'America/New_York',
    tz_offset: r.tz_offset ?? 3, hue: r.hue ?? hueFrom(r.email || r.id),
    status: r.status, last_active: r.status === 'invited' ? 'pending' : '—',
    meetings_week: 0, focus_hours: 0,
  }
}

// [Monday 00:00, next Monday 00:00) of the week containing `now`, in `tz`.
// Mirrors plus.ts' week window so Teams and Plus count the same "this week".
function weekWindow(tz: string, now: Date): { start: Date; end: Date } {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const [y, m, d] = ymd.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun…6=Sat
  const sinceMonday = (dow + 6) % 7
  return {
    start: wallTimeToUtc(y, m, d - sinceMonday, 0, 0, tz),
    end: wallTimeToUtc(y, m, d - sinceMonday + 7, 0, 0, tz),
  }
}

// ── Real derived counts (migration 024) ───────────────────────
// Fills meetings_week/focus_hours per member, events_week per shared calendar,
// and bookings_30d per page from live data. Mutates the passed arrays in place.
// Fully best-effort: if the RPC/table isn't there yet, the zeros already set by
// the mappers stay, so an un-migrated DB simply shows no counts (never crashes).
async function hydrateCounts(
  supabase: any, teamId: string, tz: string,
  members: Member[], calendars: SharedCalendar[], pages: TeamBookingPage[],
): Promise<void> {
  // Per-member weekly meetings & focus, and per-member event volume for calendars.
  try {
    const { start, end } = weekWindow(tz, new Date())
    const { data: cells } = await supabase.rpc('team_calendar_cells', { p_team: teamId })
    if (Array.isArray(cells)) {
      const byMember = new Map<string, CalEventRow[]>()
      for (const c of cells) {
        const row: CalEventRow = {
          id: c.event_id, title: '', description: '',
          start_at: c.start_at, end_at: c.end_at, all_day: c.all_day,
          rrule: c.rrule, exdates: c.exdates, tags: c.tags,
          event_type: c.event_type, colour: c.colour,
        }
        const arr = byMember.get(c.member_id) ?? []
        arr.push(row); byMember.set(c.member_id, arr)
      }
      const counts = new Map<string, { meetings: number; focus: number; events: number }>()
      for (const [mid, rows] of Array.from(byMember.entries())) {
        let meetings = 0, focusHrs = 0
        const occ = expandRange(rows, start, end)
        for (const o of occ) {
          if (o.focus) focusHrs += (o.end.getTime() - o.start.getTime()) / 3.6e6
          else meetings += 1
        }
        counts.set(mid, { meetings, focus: Math.round(focusHrs), events: occ.length })
      }
      for (const m of members) {
        const c = counts.get(m.id)
        if (c) { m.meetings_week = c.meetings; m.focus_hours = c.focus }
      }
      for (const cal of calendars) {
        cal.events_week = (cal.member_ids ?? []).reduce((s, id) => s + (counts.get(id)?.events ?? 0), 0)
      }
    }
  } catch { /* leave zeros — un-migrated DB or RPC error */ }

  // Bookings made through each team booking page in the last 30 days.
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: tb } = await supabase
      .from('team_bookings').select('page_id')
      .eq('team_id', teamId).eq('status', 'confirmed').gte('created_at', since)
    if (Array.isArray(tb)) {
      const tally = new Map<string, number>()
      for (const b of tb) tally.set(b.page_id, (tally.get(b.page_id) ?? 0) + 1)
      for (const p of pages) p.bookings_30d = tally.get(p.id) ?? 0
    }
  } catch { /* leave zeros — team_bookings not present yet */ }
}

// ── Real loader with sample fallback ──────────────────────────
// Hydrates the caller's team from the live 020 tables. Falls back to the sample
// workspace (live:false) when the user has no team yet or the tables are absent.
export async function loadTeamWorkspace(supabase: any): Promise<TeamWorkspace> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id
    if (!uid) return sampleWorkspace()

    const { data: mine, error: mErr } = await supabase
      .from('team_members').select('team_id').eq('user_id', uid).eq('status', 'active').limit(1)
    if (mErr || !mine || mine.length === 0) return sampleWorkspace()
    const teamId = mine[0].team_id

    const [teamRes, membersRes, calsRes, resRes, bookRes, pagesRes, delRes, auditRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('team_members').select('*').eq('team_id', teamId).order('created_at', { ascending: true }),
      supabase.from('shared_calendars').select('*').eq('team_id', teamId),
      supabase.from('team_resources').select('*').eq('team_id', teamId),
      supabase.from('resource_bookings').select('*').eq('team_id', teamId).order('start_at', { ascending: true }),
      supabase.from('team_booking_pages').select('*').eq('team_id', teamId),
      supabase.from('team_delegations').select('*').eq('team_id', teamId),
      supabase.from('team_audit_log').select('*').eq('team_id', teamId).order('at', { ascending: false }).limit(50),
    ])
    const t = teamRes.data
    if (!t) return sampleWorkspace()

    const members: Member[] = (membersRes.data ?? []).map(mapMember)
    const me = (membersRes.data ?? []).find((r: any) => r.user_id === uid)
    const activeCount = members.filter((m) => m.status === 'active').length

    const team: Team = {
      id: t.id, name: t.name, plan: t.plan ?? 'teams',
      seats_used: activeCount, seats_total: t.seats_total ?? 5,
      timezone: t.timezone ?? 'America/New_York', billing_email: t.billing_email ?? '',
      renews_on: t.renews_on ?? '', created_at: t.created_at ?? '',
    }
    const calendars: SharedCalendar[] = (calsRes.data ?? []).map((c: any) => ({
      id: c.id, name: c.name, colour: c.colour ?? 'brass', visibility: c.visibility ?? 'full',
      member_ids: c.member_ids ?? [], events_week: 0, description: c.description ?? '',
    }))
    const resources: Resource[] = (resRes.data ?? []).map((r: any) => ({
      id: r.id, name: r.name, type: r.type, capacity: r.capacity ?? 1, location: r.location ?? '',
      requires_approval: !!r.requires_approval, colour: r.colour ?? 'sage', amenities: r.amenities ?? [],
    }))
    const resourceBookings: ResourceBooking[] = (bookRes.data ?? []).map((b: any) => ({
      id: b.id, resource_id: b.resource_id, title: b.title, requester_id: b.requester_id,
      start_at: b.start_at, end_at: b.end_at, status: b.status,
    }))
    const pages: TeamBookingPage[] = (pagesRes.data ?? []).map((p: any) => ({
      id: p.id, name: p.name, slug: p.slug, type: p.type, member_ids: p.member_ids ?? [],
      duration_min: p.duration_min ?? 30, bookings_30d: 0, active: !!p.active, description: p.description ?? '',
      timezone: p.timezone ?? t.timezone ?? 'America/New_York',
      working_hours: p.working_hours ?? DEFAULT_WORKING_HOURS,
      buffer_min: p.buffer_min ?? 0, min_notice_hours: p.min_notice_hours ?? 4,
      advance_days: p.advance_days ?? 30, capacity: p.capacity ?? 1,
    }))
    const delegations: Delegation[] = (delRes.data ?? []).map((d: any) => ({
      id: d.id, grantor_id: d.grantor_id, grantee_id: d.grantee_id, scope: d.scope ?? '', since: d.since ?? '',
    }))
    const audit: AuditEntry[] = (auditRes.data ?? []).map((a: any) => ({
      id: a.id, actor_id: a.actor_id, action: a.action, target: a.target ?? '', scope: a.scope, at: a.at,
    }))

    await hydrateCounts(supabase, teamId, team.timezone, members, calendars, pages)

    return { live: true, currentMemberId: me?.id ?? '', team, members, calendars, resources, resourceBookings, pages, audit, delegations }
  } catch {
    return sampleWorkspace()
  }
}

// ── Provisioning (client-side, under RLS) ─────────────────────
// Creates a real, minimal team owned by the caller. Idempotent: if the user is
// already an active member of a team, returns that team's id without seeding.
export async function provisionTeam(
  supabase: any,
  opts: { teamName?: string; ownerName?: string; ownerEmail: string; timezone?: string; tzOffset?: number },
): Promise<{ ok: boolean; teamId?: string; error?: string }> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id
    if (!uid) return { ok: false, error: 'Not signed in' }

    const existing = await supabase.from('team_members').select('team_id').eq('user_id', uid).eq('status', 'active').limit(1)
    if (existing.data && existing.data.length) return { ok: true, teamId: existing.data[0].team_id }

    const tz = opts.timezone || 'America/New_York'
    const ownerName = opts.ownerName || opts.ownerEmail.split('@')[0]
    const teamName = opts.teamName || `${ownerName}'s Team`

    const teamIns = await supabase.from('teams')
      .insert({ name: teamName, owner_id: uid, seats_total: 5, timezone: tz, billing_email: opts.ownerEmail })
      .select('id').single()
    if (teamIns.error || !teamIns.data) return { ok: false, error: teamIns.error?.message || 'Could not create team' }
    const teamId = teamIns.data.id

    const ownerIns = await supabase.from('team_members')
      .insert({ team_id: teamId, user_id: uid, name: ownerName, email: opts.ownerEmail, role: 'owner', status: 'active', title: 'Owner', timezone: tz, tz_offset: opts.tzOffset ?? -5, hue: hueFrom(opts.ownerEmail) })
      .select('id').single()
    if (ownerIns.error || !ownerIns.data) return { ok: false, error: ownerIns.error?.message || 'Could not add you as owner' }
    const ownerMemberId = ownerIns.data.id

    // Starter data (best-effort; individual failures are non-fatal).
    await supabase.from('shared_calendars').insert({ team_id: teamId, name: 'General', colour: 'brass', visibility: 'full', member_ids: [ownerMemberId], description: 'Shared team calendar.' })
    await supabase.from('team_resources').insert([
      { team_id: teamId, name: 'Meeting Room', type: 'room', capacity: 8, location: 'Office', requires_approval: true, colour: 'brass', amenities: ['Display', 'Whiteboard'] },
      { team_id: teamId, name: 'Hot Desk', type: 'desk', capacity: 4, location: 'Office', requires_approval: false, colour: 'forest', amenities: ['Monitor'] },
    ])
    await supabase.from('team_booking_pages').insert({ team_id: teamId, name: 'Intro call', slug: `intro-${teamId.slice(0, 8)}`, type: 'round-robin', member_ids: [ownerMemberId], duration_min: 30, active: false, description: 'Public scheduling link for the team.' })
    await supabase.from('team_audit_log').insert({ team_id: teamId, actor_id: ownerMemberId, action: 'created the team', target: teamName, scope: 'member' })

    return { ok: true, teamId }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Provisioning failed' }
  }
}

// Append an audit entry (RLS lets editors+ insert on team_audit_log). Best-effort.
export async function logTeamAction(
  supabase: any, teamId: string, actorMemberId: string,
  action: string, target: string, scope: AuditEntry['scope'],
): Promise<void> {
  try {
    await supabase.from('team_audit_log').insert({ team_id: teamId, actor_id: actorMemberId || null, action, target, scope })
  } catch { /* non-fatal */ }
}
