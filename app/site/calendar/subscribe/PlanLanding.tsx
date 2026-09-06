'use client'
import { useState, useEffect, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import SubscribePayPal from './SubscribePayPal'
import {
  Check, Loader2, ArrowLeft, ArrowRight, Mail, Lock, User, Sparkles, Users,
  PlugZap, Brain, Palette, Vote, Bell, MessageSquare, Clock, CalendarDays,
  BellRing, MapPin, RefreshCcw, ShieldCheck, CalendarClock, Layers, Globe2,
  BarChart3, FileText, Wand2, LifeBuoy, Route, Moon, WifiOff, Building2,
} from 'lucide-react'

type Plan = 'plus' | 'teams'
type Pillar = { icon: ElementType; title: string; points: string[] }
type Pain = { icon: ElementType; pain: string; fix: string }
type CompareRow = { label: string; from: string; to: string }

interface TierContent {
  plan: Plan
  name: string
  price: string
  period: string
  tagline: string
  popular?: boolean
  intro: string
  builtOn: string
  heroBenefits: string[]
  pillarsHeading: string
  pillars: Pillar[]
  briefing: boolean
  pains: Pain[]
  more: string[]
  compareTitle: string
  compareFrom: string
  compareTo: string
  compare: CompareRow[]
  enterprise: boolean
}

// ════════════════════════════════════════════════════════════
//  Tier content — only the sections relevant to each plan
// ════════════════════════════════════════════════════════════
const CONTENT: Record<Plan, TierContent> = {
  plus: {
    plan: 'plus',
    name: 'Arwign Plus',
    price: '$19.99',
    period: 'per month',
    tagline: 'The individual power user',
    popular: true,
    intro:
      'Everything in Free, supercharged — the full AI scheduling layer, unlimited connected calendars, and a proactive daily briefing that reaches you before you open the app.',
    builtOn: 'Everything in Arwign Free',
    heroBenefits: [
      'Unlimited connected calendar accounts, in one conflict-aware view',
      'SMS Daily Outlook Briefing + an evening preview of tomorrow',
      'Full AI: time-blocking, smart reschedule, email→event & prep briefs',
      'Personal booking pages + Doodle-style meeting polls',
      'Calendar-health analytics & a weekly review digest',
      'Focus protection, boundary rules and smart travel buffers',
    ],
    pillarsHeading: 'What Arwign Plus unlocks',
    pillars: [
      {
        icon: PlugZap,
        title: 'Seamless ecosystem integration',
        points: [
          'Two-way sync with Google Calendar & Microsoft 365 / Outlook',
          'Apple Calendar via CalDAV + ICS import / export',
          'Email event detection — Gmail & Microsoft Graph (read-only)',
          'Task managers: Todoist, Notion, Asana, ClickUp, Linear & Trello',
          'Auto Google Meet / Zoom / Teams links on every event',
          'One unified, conflict-aware view across every account',
        ],
      },
      {
        icon: Brain,
        title: 'Smart automation (AI)',
        points: [
          'Detects events in your email — one tap to add, fully pre-filled',
          'Auto time-blocks your tasks into real, defended slots',
          'Natural language: “coffee with Amara Thursday 3pm” → event',
          'Smart reschedule — the least-disruptive shift on conflict',
          'Meeting prep briefs from agenda & attendee history',
          'Post-meeting action extraction into your task manager',
        ],
      },
      {
        icon: Palette,
        title: 'Deep customisability',
        points: [
          'Rules-based auto-colour, tags and custom event types',
          'Recurring templates for your regular meetings',
          'Saved views & filters, one click away',
          'Light, dark & warm themes with a density toggle',
          'Command palette (⌘K) and keyboard-first navigation',
        ],
      },
    ],
    briefing: true,
    pains: [
      { icon: BellRing, pain: 'The calendar is a passive grid — you must open it to know your day.', fix: 'The Daily Outlook Briefing pushes your day to you by email + SMS before you open anything.' },
      { icon: MapPin, pain: 'Reminders are dumb — no travel, no prep, no context.', fix: 'Smart pre-event push with join link, prep note and live “leave now” travel timing.' },
      { icon: RefreshCcw, pain: 'One change cascades and you fix the fallout by hand.', fix: 'One-tap AI reflow proposes the least-disruptive shift for every knock-on conflict.' },
      { icon: ShieldCheck, pain: 'Deep work gets eaten alive by meetings.', fix: 'Focus time that defends itself — protected blocks auto-decline or propose alternates.' },
      { icon: CalendarClock, pain: 'Tasks with deadlines never actually get time on the calendar.', fix: 'Auto time-blocking slots tasks from your task manager into real, defended slots.' },
      { icon: Layers, pain: 'Double-booking across personal + work accounts.', fix: 'A unified, conflict-aware multi-account view that guards against overlaps.' },
      { icon: BarChart3, pain: 'No idea where your time actually goes.', fix: 'Calendar-health analytics — meeting load, focus ratio and biggest time sinks.' },
      { icon: Moon, pain: 'Evenings and weekends quietly get colonised.', fix: 'Boundary rules — “protect my evenings / no-meeting Fridays” enforced automatically.' },
      { icon: WifiOff, pain: 'Nothing works properly offline.', fix: 'Local-first architecture — full function offline, clean reconciliation on reconnect.' },
    ],
    more: [
      'Personal booking pages — one-off & group',
      'Meeting polls — propose times, invitees vote, auto-books the winner',
      'Paid bookings by credit & debit card — invoices & auto-refunds',
      'Holiday & multi-country calendars, birthdays & weather on outdoor events',
      'Home-screen & lock-screen widgets; Apple Watch & Wear OS complications',
      'Snooze, undo & bulk-edit on every event action',
      'Privacy modes — “Busy”-only sharing, private & end-to-end-encrypted events',
      'Layered reminders & quiet hours — respectful by default',
      'Installable PWA now; native iOS & Android apps to follow',
      'Templates marketplace, a public API & an embeddable booking widget',
    ],
    compareTitle: 'What you unlock over Free',
    compareFrom: 'Free',
    compareTo: 'Plus',
    compare: [
      { label: 'Connected calendar accounts', from: '1 account', to: 'Unlimited + unified view' },
      { label: 'Daily Outlook Briefing', from: 'Email + push', to: '+ SMS + evening preview' },
      { label: 'AI scheduling (time-block, reflow, email→event, prep)', from: '—', to: 'Full AI suite' },
      { label: 'Booking pages & meeting polls', from: '—', to: 'Personal booking + polls' },
      { label: 'Calendar-health analytics', from: '—', to: 'Included + weekly review' },
      { label: 'Focus protection, boundary rules & travel buffers', from: '—', to: 'Included' },
    ],
    enterprise: false,
  },

  teams: {
    plan: 'teams',
    name: 'Arwign Teams',
    price: '$49.99',
    period: 'per month',
    tagline: 'For teams',
    intro:
      'Everything in Plus for your whole team — shared calendars with roles, resource booking, cross-timezone scheduling and centralised admin, so a distributed team can find time and manage it together.',
    builtOn: 'Everything in Arwign Plus, for your team',
    heroBenefits: [
      'Shared team calendars with granular roles (view / propose / edit / manage)',
      'Conference room & resource booking with approval workflows',
      'Team availability finder across time zones',
      'Round-robin & collective booking pages',
      'Delegation with a full audit trail',
      'Admin console & centralised billing',
    ],
    pillarsHeading: 'What Arwign Teams adds',
    pillars: [
      {
        icon: Users,
        title: 'Resource & team management',
        points: [
          'Shared team calendars with granular roles',
          'Conference room & resource booking with approvals',
          'Team availability finder across time zones',
          'Multi-timezone mastery — world-clock strip & keep-in-original-zone',
          'Delegation with a full audit trail',
          'Admin console & centralised billing',
        ],
      },
      {
        icon: Vote,
        title: 'Collaborative scheduling',
        points: [
          'Round-robin, collective & group booking pages',
          'Meeting polls — invitees vote, Arwign auto-books the winner',
          'Ranks the best meeting times across everyone’s free/busy',
          'No separate Calendly or Doodle — it’s built in',
        ],
      },
      {
        icon: PlugZap,
        title: 'Connected to the tools you sell & ship with',
        points: [
          'CRM: HubSpot, Salesforce & Pipedrive — meetings logged to the record',
          'Two-way sync with Google Calendar & Microsoft 365 / Outlook',
          'Task managers: Todoist, Notion, Asana, ClickUp, Linear & Trello',
          'Auto Google Meet / Zoom / Teams links on every event',
          'One unified, conflict-aware view across every account',
        ],
      },
      {
        icon: Brain,
        title: 'Smart automation (AI)',
        points: [
          'Meeting prep briefs from agenda, attendees & CRM context',
          'Post-meeting action extraction into your team’s task manager',
          'Smart reschedule — least-disruptive reflow on conflict',
          'Rescue mode — proposes what to decline, move, shorten or delegate',
        ],
      },
    ],
    briefing: true,
    pains: [
      { icon: Vote, pain: 'Scheduling with others is endless back-and-forth.', fix: 'Built-in booking pages + meeting polls — round-robin, collective and group.' },
      { icon: Globe2, pain: 'Time zones cause wrong-time and missed meetings.', fix: 'A timezone-correct core, inline “this is 6am for them” warnings and a world-clock strip.' },
      { icon: Layers, pain: 'Double-booking across personal + work accounts.', fix: 'A unified, conflict-aware multi-account view that guards against overlaps.' },
      { icon: LifeBuoy, pain: 'Overbooked weeks with no way out.', fix: 'Rescue mode — AI proposes what to decline, move, shorten or delegate.' },
      { icon: FileText, pain: 'You arrive at meetings cold, with no context.', fix: 'AI prep briefs assembled from agenda, attendee/CRM history and last-meeting notes.' },
      { icon: Wand2, pain: 'Meetings end and nothing captures what was decided.', fix: 'Post-meeting action extraction turns notes into tasks in your connected tools.' },
      { icon: Route, pain: 'Back-to-back days with no breathing room.', fix: 'Automatic buffers + travel blocks inserted around every meeting.' },
      { icon: BarChart3, pain: 'No idea where the team’s time actually goes.', fix: 'Team calendar-health analytics — meeting load, focus ratio and after-hours creep.' },
    ],
    more: [
      'Public booking pages — one-off, round-robin, collective & group',
      'Meeting polls — propose times, invitees vote, auto-books the winner',
      'Paid bookings by credit & debit card — invoices & auto-refunds',
      'Delegation with a full audit trail for shared actions',
      'Privacy modes — “Busy”-only sharing, private & end-to-end-encrypted events',
      'Admin console — roles, provisioning & centralised billing',
      'A public API & an embeddable booking widget',
      'Team calendar-health analytics & weekly review',
    ],
    compareTitle: 'What you unlock over Plus',
    compareFrom: 'Plus',
    compareTo: 'Teams',
    compare: [
      { label: 'Shared team calendars with roles', from: '—', to: 'View / propose / edit / manage' },
      { label: 'Conference room & resource booking', from: '—', to: 'With approval workflows' },
      { label: 'Team availability finder across zones', from: '—', to: 'Included' },
      { label: 'Booking page types', from: 'Personal (one-off)', to: 'Round-robin, collective & group' },
      { label: 'Delegation & audit trail', from: '—', to: 'Full audit trail' },
      { label: 'Admin & billing', from: 'Personal', to: 'Admin console + centralised billing' },
    ],
    enterprise: true,
  },
}

// ════════════════════════════════════════════════════════════
//  Page
// ════════════════════════════════════════════════════════════
export default function PlanLanding({ plan }: { plan: Plan }) {
  const c = CONTENT[plan]
  const PlanIcon = plan === 'plus' ? Sparkles : Users

  return (
    <div style={{ background: 'var(--bg-primary)' }}>
      {/* ── Hero: plan summary + auth card ─────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-20 animate-float pointer-events-none"
          style={{ width: 460, height: 460, top: -140, right: '4%', background: 'var(--gold)' }}
          aria-hidden
        />
        <div className="container-site py-10 lg:py-16 relative">
          <Link href="/calendar" className="mb-8 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={15} /> Back to Arwign Calendar
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:gap-12 items-start">
            {/* Left: summary */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
                  <PlanIcon size={13} /> {c.name}
                </span>
                {c.popular && (
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: 'var(--gold)', letterSpacing: '0.08em' }}>
                    Most popular
                  </span>
                )}
              </div>

              <h1 className="font-display font-semibold mt-5 mb-2" style={{ fontSize: 'clamp(2.2rem,5vw,3.25rem)', color: 'var(--text-primary)' }}>
                Subscribe to {c.name}
              </h1>
              <p className="text-lg mb-6 max-w-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.intro}</p>

              <div className="mb-7 flex items-baseline gap-2">
                <span className="font-display font-semibold" style={{ fontSize: '2.6rem', color: 'var(--text-primary)' }}>{c.price}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{c.period}</span>
                <span className="ml-2 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(var(--gold-rgb),0.1)', color: 'var(--gold-dark)' }}>cancel anytime</span>
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                <Check size={13} style={{ color: 'var(--gold)' }} /> {c.builtOn}
              </p>
              <ul className="space-y-3">
                {c.heroBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}>
                      <Check size={12} style={{ color: 'var(--gold)' }} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right: functional auth / subscribe card */}
            <SubscribeCard plan={c.plan} name={c.name} price={c.price} period={c.period} />
          </div>
        </div>
      </section>

      {/* ── Pillars: relevant capability groups ────────────── */}
      <section className="py-16 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
              {c.pillarsHeading}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Not a wall you hang obligations on — an assistant that manages your time.
            </p>
          </div>
          <div className={`grid gap-6 ${c.pillars.length >= 4 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {c.pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
                className="rounded-2xl border p-6"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <p.icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                <ul className="space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flagship: Daily Outlook Briefing ───────────────── */}
      {c.briefing && (
        <section className="container-site py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
                <Bell size={14} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>Flagship feature</span>
              </div>
              <h2 className="font-display font-semibold mb-4" style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
                The Daily Outlook Briefing
              </h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                A proactive, AI-composed summary of your day that reaches you on the channels you already
                check — <strong>email and SMS on {c.name}</strong> — before you open anything. It removes the
                “open the app to find out” step entirely.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: MessageSquare, t: 'A one-line human headline: “4 meetings, 2h focus protected, leave by 08:40.”' },
                  { icon: Clock, t: 'Your timeline, flags that need action, and leave-by times with live travel.' },
                  { icon: Mail, t: 'Rich email in the morning, a compressed SMS, an evening preview of tomorrow.' },
                ].map((row) => (
                  <li key={row.t} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <row.icon size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                    {row.t}
                  </li>
                ))}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border p-6 shadow-glass-md"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold)' }}>
                  <CalendarDays size={16} color="white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Monday</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Good morning · 07:00</p>
                </div>
              </div>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                4 meetings, 2h focus protected, 1 conflict to resolve. Leave by 08:40 for your 09:00 in Midtown.
              </p>
              {[
                { time: '09:00', title: 'Client kickoff — Midtown', flag: 'Leave 08:40' },
                { time: '11:30', title: 'Design review', flag: 'Join link' },
                { time: '14:00', title: 'Focus block — protected', flag: null },
                { time: '15:00', title: 'Team sync', flag: '⚠ Clash' },
              ].map((ev) => (
                <div key={ev.time} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{ev.time}</span>
                  <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{ev.title}</span>
                  {ev.flag && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>{ev.flag}</span>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Pain points eliminated (relevant subset) ───────── */}
      <section className="py-16 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
              The pain points {c.name} eliminates
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Every ordinary-calendar frustration, answered by a concrete feature.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.pains.map((d, i) => (
              <motion.div
                key={d.pain}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
                className="rounded-2xl border p-6"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <d.icon size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <p className="text-sm line-through decoration-1 mb-2 opacity-70" style={{ color: 'var(--text-muted)' }}>{d.pain}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.fix}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison strip ───────────────────────────────── */}
      <section className="container-site py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
            {c.compareTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Exactly what changes when you upgrade.</p>
        </div>
        <div className="max-w-3xl mx-auto rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="grid grid-cols-[1.4fr,0.8fr,1fr] px-5 py-3 text-[11px] font-bold uppercase tracking-widest border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', letterSpacing: '0.08em' }}>
            <span>Capability</span>
            <span className="text-center">{c.compareFrom}</span>
            <span className="text-center" style={{ color: 'var(--gold-dark)' }}>{c.compareTo}</span>
          </div>
          {c.compare.map((row) => (
            <div key={row.label} className="grid grid-cols-[1.4fr,0.8fr,1fr] items-center px-5 py-3.5 border-b last:border-0 text-sm" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{row.label}</span>
              <span className="text-center" style={{ color: 'var(--text-muted)' }}>{row.from}</span>
              <span className="text-center font-medium inline-flex items-center justify-center gap-1.5" style={{ color: 'var(--gold-dark)' }}>
                <Check size={14} style={{ color: 'var(--gold)' }} />{row.to}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Everything else (relevant) ─────────────────────── */}
      <section className="py-16 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
              And everything else, by design
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>The whole toolkit — scheduling, payments, privacy and reach — built to the same calm standard.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-4xl mx-auto">
            {c.more.map((m) => (
              <div key={m} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                {m}
              </div>
            ))}
          </div>
          {c.enterprise && (
            <div className="max-w-3xl mx-auto mt-10 rounded-2xl border p-5 flex items-start gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <Building2 size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Need Enterprise?</strong> SSO / SCIM, audit exports and data-residency follow for
                larger teams. Final pricing announced at launch — waitlist members get founder pricing.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────── */}
      <section className="container-site py-20 text-center">
        <h2 className="font-display font-semibold mb-4" style={{ fontSize: 'clamp(2rem,4vw,2.75rem)', color: 'var(--text-primary)' }}>
          Ready to try {c.name}?
        </h2>
        <p className="max-w-xl mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
          {c.price} {c.period} · cancel anytime. Start now and your calendar is ready in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#subscribe" className="btn-primary justify-center px-7 py-3">
            Get {c.name} <ArrowRight size={16} />
          </a>
          <Link href="/calendar" className="btn-outline justify-center px-7 py-3">Compare all plans</Link>
        </div>
      </section>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Functional subscribe card (sign up / log in)
// ════════════════════════════════════════════════════════════
function SubscribeCard({ plan, name, price, period }: { plan: Plan; name: string; price: string; period: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [payStep, setPayStep] = useState(false)

  // Already signed in? Skip straight to payment.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (alive && user) setPayStep(true)
    })()
    return () => { alive = false }
  }, [])

  // Teams lands in the team workspace; Plus in the Plus workspace.
  const dest = plan === 'teams' ? '/calendar/team' : '/calendar/plus'
  const nextUrl = dest

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setSubmitting(true); setError(null)
    const supabase = createClient()
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setPayStep(true) // now authenticated → collect payment
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: { full_name: fullName.trim(), intended_plan: plan },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          },
        })
        if (error) throw error
        if (data.session) setPayStep(true)
        else setCheckEmail(true)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <div id="subscribe" className="scroll-mt-24 rounded-2xl border p-6 lg:p-7 lg:sticky lg:top-24 shadow-glass-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      {checkEmail ? (
        <div className="py-6 text-center">
          <div className="mb-3 text-4xl">📩</div>
          <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Confirm your email</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            We’ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to finish subscribing to {name}.
          </p>
        </div>
      ) : payStep ? (
        <div>
          <div className="mb-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{price}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{period}</span>
          </div>
          <p className="mb-4 mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            You’re signed in. Pay securely to activate <strong>{name}</strong> — one month, billed monthly. Cancel anytime.
          </p>
          <SubscribePayPal
            plan={plan}
            onPaid={() => { toast.success(`${name} activated — welcome!`); router.push(dest); router.refresh() }}
          />
          <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {price} {period} · secure payment via PayPal or card · by continuing you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--gold)' }}>Terms</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{price}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{period}</span>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-xl border p-1 mt-4" style={{ borderColor: 'var(--border)' }}>
            {(['signup', 'signin'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null) }}
                className="rounded-lg py-2 text-sm font-semibold transition-colors"
                style={mode === m ? { background: 'var(--gold)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                {m === 'signup' ? 'Create account' : 'Log in'}
              </button>
            ))}
          </div>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signup' ? `Create your account to start ${name}.` : `Log in to add ${name} to your account.`}
          </p>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <Field icon={<User size={15} />}><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" autoComplete="name" className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
            )}
            <Field icon={<Mail size={15} />}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
            <Field icon={<Lock size={15} />}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Create a password' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></Field>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : (mode === 'signup' ? 'Create account & subscribe' : 'Log in & subscribe')}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {price} {period} · cancel anytime. By continuing you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--gold)' }}>Terms</Link>.
          </p>
        </>
      )}
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      {children}
    </div>
  )
}
