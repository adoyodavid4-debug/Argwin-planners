'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CalendarDays, PlugZap, BellRing, Brain, Link2, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react'
import PlusShell, { SectionCard } from '../PlusShell'
import { type PlusWorkspace } from '@/lib/calendar/plus'

export default function PlusGuideClient({ ws }: { ws: PlusWorkspace }) {
  return (
    <PlusShell workspace={ws} title="How to use & integrate"
      subtitle="Everything you need to get the most out of Arwign Plus — step by step.">

      <div className="grid gap-6 lg:grid-cols-2">
        <Guide icon={CalendarDays} title="1 · Start with the calendar" cta={{ href: '/calendar/app', label: 'Open your calendar' }}>
          <Step>Create an event: click any day (or <b>New event</b>), set the time, location and reminders.</Step>
          <Step><b>Quick-add</b> in plain English — type <i>“Lunch with Sara tomorrow 1pm at Java for 45m”</i> and press Enter.</Step>
          <Step>Press <Kbd>⌘K</Kbd> for the command palette; switch between <b>day / week / month / agenda / year</b> views.</Step>
          <Step>Add <b>recurrence</b> (e.g. “every weekday 9am”) and colour-code by tag for a calendar you can scan at a glance.</Step>
        </Guide>

        <Guide icon={PlugZap} title="2 · Connect Google & Outlook" cta={{ href: '/calendar/integrations', label: 'Open Integrations' }}>
          <Step>Go to <b>Integrations</b> → click <b>Connect</b> on <b>Google</b> or <b>Microsoft 365 / Outlook</b> → approve access.</Step>
          <Step>Your events sync <b>two-way</b> — changes in either place stay in step.</Step>
          <Step>On <b>Plus</b> you can connect <b>unlimited accounts</b> and see them in one conflict-aware view (Free = 1 account).</Step>
          <Step>Prefer manual? Use <b>ICS import/export</b> from the calendar toolbar to move calendars in and out.</Step>
        </Guide>

        <Guide icon={BellRing} title="3 · Daily Outlook Briefing (email)" cta={{ href: '/calendar/settings', label: 'Briefing settings' }}>
          <Step>Toggle the <b>Email</b> briefing, pick the <b>send time</b>, and set an <b>evening preview</b> of tomorrow.</Step>
          <Step>Set <b>quiet hours</b> so nothing pings you at the wrong time.</Step>
        </Guide>

        <Guide icon={Brain} title="4 · AI scheduling" cta={{ href: '/calendar/plus/ai', label: 'AI Scheduling' }}>
          <Step><b>Auto time-blocking</b> turns tasks with deadlines into real, defended slots on your calendar.</Step>
          <Step><b>Smart reschedule</b> proposes the least-disruptive shift when something clashes — you accept, edit or dismiss.</Step>
          <Step><b>Email → event</b> detects bookings in your inbox; <b>prep briefs</b> summarise the meeting before it starts.</Step>
          <Step className="opacity-80">Every AI action is a suggestion — Arwign never moves or books anything without your OK.</Step>
        </Guide>

        <Guide icon={Link2} title="5 · Booking pages & polls" cta={{ href: '/calendar/booking-pages', label: 'Booking pages' }}>
          <Step>Create a <b>booking page</b>, set your availability and duration, then share the link — people self-book into your free time.</Step>
          <Step>Use a <b>meeting poll</b> to propose a few times; invitees vote and Arwign books the winner. No Calendly/Doodle needed.</Step>
          <Step>Paid bookings are supported via card, with automatic invoices and refunds on cancellation.</Step>
        </Guide>

        <Guide icon={ShieldCheck} title="6 · Focus, boundaries & insight" cta={{ href: '/calendar/analytics', label: 'Calendar analytics' }}>
          <Step><b>Protect focus time</b> so deep-work blocks auto-decline or propose alternates instead of being booked over.</Step>
          <Step>Set <b>boundary rules</b> — protect evenings, mark <b>no-meeting days</b> — and add automatic <b>buffers</b> around meetings.</Step>
          <Step>Check <b>Analytics</b> to see meeting load, focus ratio, after-hours creep and your biggest time sinks.</Step>
        </Guide>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border p-5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
        <BarChart3 size={18} style={{ color: 'var(--gold)' }} />
        <p className="min-w-0 flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Managing a group? <b>Arwign Teams</b> adds shared calendars, roles, resource booking and cross-timezone scheduling.
        </p>
        <Link href="/calendar/team" className="btn-outline px-4 py-2 text-sm">Explore Teams <ArrowRight size={14} /></Link>
      </div>
    </PlusShell>
  )
}

function Guide({ icon: Icon, title, cta, children }: { icon: typeof CalendarDays; title: string; cta?: { href: string; label: string }; children: ReactNode }) {
  return (
    <SectionCard title={title} action={cta ? <Link href={cta.href} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{cta.label} →</Link> : undefined}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
        <Icon size={18} style={{ color: 'var(--gold)' }} />
      </div>
      <ol className="space-y-2.5">{children}</ol>
    </SectionCard>
  )
}
function Step({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <li className={`flex items-start gap-2.5 text-sm ${className}`} style={{ color: 'var(--text-secondary)' }}>
    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--gold)' }} />
    <span>{children}</span>
  </li>
}
function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border px-1.5 py-0.5 text-[11px] font-mono" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{children}</kbd>
}
