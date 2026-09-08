'use client'
import Link from 'next/link'
import { Users, DoorOpen, CalendarDays, Link2, ArrowRight, Clock, ShieldCheck, Sparkles } from 'lucide-react'
import TeamShell, { StatCard, SectionCard, Avatar } from './TeamShell'
import { type TeamWorkspace, memberName, byId, ROLES } from '@/lib/calendar/team'
import { fmtTime as fmtTimeSafe, fmtDateTime as fmtWhenSafe } from '@/lib/calendar/fmt'

export default function OverviewClient({ ws }: { ws: TeamWorkspace }) {
  const fmtTime = (iso: string) => fmtTimeSafe(iso, ws.team.timezone).replace(':00', '')
  const fmtWhen = (iso: string) => fmtWhenSafe(iso, ws.team.timezone)
  const pending = ws.resourceBookings.filter((b) => b.status === 'pending')
  const activeMembers = ws.members.filter((m) => m.status === 'active')
  const bookings30d = ws.pages.reduce((s, p) => s + p.bookings_30d, 0)

  return (
    <TeamShell workspace={ws} title="Team Overview"
      subtitle={`${ws.team.name} · ${activeMembers.length} people across ${new Set(ws.members.map((m) => m.timezone)).size} time zones`}
      actions={<Link href="/calendar/team/members" className="btn-primary px-3.5 py-2 text-sm"><Users size={15} /> Invite people</Link>}>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={activeMembers.length} hint={`${ws.team.seats_total - ws.team.seats_used} seats free`} />
        <StatCard label="Shared calendars" value={ws.calendars.length} hint={`${ws.calendars.reduce((s, c) => s + c.events_week, 0)} events this week`} />
        <StatCard label="Pending approvals" value={pending.length} hint="rooms & resources" />
        <StatCard label="Bookings · 30d" value={bookings30d} hint={`${ws.pages.filter((p) => p.active).length} active pages`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Pending approvals */}
          <SectionCard title="Awaiting your approval"
            action={<Link href="/calendar/team/resources" className="text-xs font-medium" style={{ color: 'var(--gold-dark)' }}>Resources →</Link>}>
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nothing waiting. You’re all clear.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((b) => {
                  const res = byId(ws.resources, b.resource_id)
                  return (
                    <li key={b.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)' }}>
                      <DoorOpen size={16} style={{ color: 'var(--gold)' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{res?.name} · {memberName(ws.members, b.requester_id)} · {fmtWhen(b.start_at)}</p>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>Pending</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          {/* Team roster snapshot */}
          <SectionCard title="Who’s on the team"
            action={<Link href="/calendar/team/members" className="text-xs font-medium" style={{ color: 'var(--gold-dark)' }}>Manage →</Link>}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {ws.members.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                  <Avatar name={m.name} hue={m.hue} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{m.title}</p>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{ROLES[m.role].label}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-6">
          {/* Recent activity */}
          <SectionCard title="Recent activity"
            action={<Link href="/calendar/team/audit" className="text-xs font-medium" style={{ color: 'var(--gold-dark)' }}>Audit →</Link>}>
            <ol className="space-y-3">
              {ws.audit.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                    <ShieldCheck size={13} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      <strong>{memberName(ws.members, a.actor_id)}</strong> {a.action}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{a.target} · {fmtTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Jump to */}
          <SectionCard title="Jump to">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/calendar/team/availability', label: 'Find a time', icon: Clock },
                { href: '/calendar/team/booking', label: 'Booking pages', icon: Link2 },
                { href: '/calendar/team/calendars', label: 'Calendars', icon: CalendarDays },
                { href: '/calendar/team/analytics', label: 'Analytics', icon: Sparkles },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <q.icon size={15} style={{ color: 'var(--gold)' }} /> {q.label}
                  <ArrowRight size={13} className="ml-auto opacity-40" />
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </TeamShell>
  )
}
