'use client'
import Link from 'next/link'
import {
  BellRing, Brain, PlugZap, ShieldCheck, ArrowRight, MessageSquare, Clock,
  Link2, BarChart3, Sparkles, CalendarDays,
} from 'lucide-react'
import PlusShell, { StatCard, SectionCard } from './PlusShell'
import { type PlusWorkspace } from '@/lib/calendar/plus'

const SUGGESTION_ICON = { reschedule: BellRing, 'email-event': MessageSquare, 'time-block': Clock, prep: Brain, rescue: ShieldCheck }

export default function OverviewClient({ ws }: { ws: PlusWorkspace }) {
  const connected = ws.integrations.filter((i) => i.status === 'connected').length
  const focusOn = ws.focusRules.filter((r) => r.on).length
  const briefingChannels = [ws.briefing.email && 'Email', ws.briefing.sms && 'SMS', ws.briefing.evening && 'Evening'].filter(Boolean)

  return (
    <PlusShell workspace={ws} title={`Good morning, ${ws.profile.name.split(' ')[0]}`}
      subtitle="Your calendar, run by an assistant — briefings, AI scheduling and focus, all in one place."
      actions={<Link href="/calendar/app" className="btn-primary px-3.5 py-2 text-sm"><CalendarDays size={15} /> Open calendar</Link>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="AI suggestions" value={ws.suggestions.length} hint="waiting for you" />
        <StatCard label="Connected accounts" value={connected} hint={`${ws.integrations.length - connected} available`} />
        <StatCard label="Focus rules on" value={focusOn} hint="protecting your time" />
        <StatCard label="Reclaimed" value={`${ws.analytics.reclaimed_hours}h`} hint="this week" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Briefing hero */}
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
              <BellRing size={16} style={{ color: 'var(--gold)' }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>Daily Outlook Briefing</span>
              <Link href="/calendar/plus/briefing" className="ml-auto text-xs font-medium" style={{ color: 'var(--gold-dark)' }}>Configure →</Link>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                4 meetings, 2h focus protected, 1 conflict to resolve. Leave by 08:40 for your 09:00 in Westlands.
              </p>
              <div className="mt-4 space-y-0">
                {[
                  { time: '09:00', title: 'Client kickoff — Westlands', flag: 'Leave 08:40' },
                  { time: '11:30', title: 'Design review', flag: 'Join link' },
                  { time: '14:00', title: 'Focus block — protected', flag: null },
                  { time: '15:00', title: 'Team sync', flag: '⚠ Clash' },
                ].map((ev) => (
                  <div key={ev.time} className="flex items-center gap-3 border-b py-2 last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <span className="w-12 flex-shrink-0 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{ev.time}</span>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{ev.title}</span>
                    {ev.flag && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>{ev.flag}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Delivered via {briefingChannels.join(' · ') || 'no channels yet'} at {String(ws.briefing.hour).padStart(2, '0')}:00.</p>
            </div>
          </div>

          {/* AI suggestions */}
          <SectionCard title="Your assistant suggests"
            action={<Link href="/calendar/plus/ai" className="text-xs font-medium" style={{ color: 'var(--gold-dark)' }}>All suggestions →</Link>}>
            <ul className="space-y-2">
              {ws.suggestions.slice(0, 4).map((s) => {
                const Icon = SUGGESTION_ICON[s.type]
                return (
                  <li key={s.id} className="flex items-start gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                      <Icon size={15} style={{ color: 'var(--gold)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.detail}</p>
                    </div>
                    {s.when && <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.when}</span>}
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Jump to">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/calendar/plus/briefing', label: 'Briefing', icon: BellRing },
                { href: '/calendar/plus/ai', label: 'AI Scheduling', icon: Brain },
                { href: '/calendar/plus/focus', label: 'Focus', icon: ShieldCheck },
                { href: '/calendar/plus/integrations', label: 'Integrations', icon: PlugZap },
                { href: '/calendar/plus/booking', label: 'Booking', icon: Link2 },
                { href: '/calendar/plus/analytics', label: 'Analytics', icon: BarChart3 },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <q.icon size={15} style={{ color: 'var(--gold)' }} /> {q.label}
                  <ArrowRight size={13} className="ml-auto opacity-40" />
                </Link>
              ))}
            </div>
          </SectionCard>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <Sparkles size={18} style={{ color: 'var(--gold)' }} />
            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>You’re on Arwign Plus</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {ws.profile.price}/mo · renews {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ws.profile.renews_on))}
            </p>
            <Link href="/calendar/plus/subscription" className="btn-outline mt-3 w-full justify-center py-2 text-sm">Manage subscription</Link>
          </div>
        </div>
      </div>
    </PlusShell>
  )
}
