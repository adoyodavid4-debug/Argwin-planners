'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CalendarDays, Sparkles, ShieldCheck, Wand2, Users, Palette, Bell, Mail,
  MessageSquare, Clock, MapPin, RefreshCcw, Repeat, Layers, Globe2,
  Check, ArrowRight, ChevronDown, Brain, PlugZap, CalendarClock, BellRing,
  BarChart3, FileText, LifeBuoy, Route, Moon, WifiOff, Vote,
} from 'lucide-react'

// ════════════════════════════════════════════════════════════
//  Content — sourced from the Arwign Calendar masterplan
// ════════════════════════════════════════════════════════════

const PRINCIPLES = [
  {
    icon: RefreshCcw,
    title: 'Sync is sacred',
    body: 'A calendar you can’t fully trust is worthless. Two-way sync correctness, conflict handling and offline reliability outrank every shiny feature.',
  },
  {
    icon: ShieldCheck,
    title: 'AI proposes, you dispose',
    body: 'Automation is always a suggestion you can accept, edit or dismiss. Arwign Calendar never silently moves, deletes or books anything you didn’t authorise.',
  },
  {
    icon: Sparkles,
    title: 'Calm by default',
    body: 'No clutter, no dark patterns, no engagement-farming notifications. The best outcome is often fewer meetings and more protected focus time.',
  },
]

const PILLARS = [
  {
    icon: PlugZap,
    title: 'Seamless ecosystem integration',
    points: [
      'Two-way sync with Google Calendar & Microsoft 365 / Outlook',
      'Apple Calendar via CalDAV + ICS import / export',
      'Email connectivity for event detection — Gmail & Microsoft Graph (read-only)',
      'Task managers: Todoist, Notion, Asana, ClickUp, Linear & Trello',
      'CRM: HubSpot, Salesforce & Pipedrive — meetings logged to the record',
      'Auto Google Meet / Zoom / Teams links on every event',
      'One unified, conflict-aware view across every account',
    ],
  },
  {
    icon: Brain,
    title: 'Smart automation (AI)',
    points: [
      'Detects events in your email — one tap to add, fully pre-filled',
      'Ranks the best meeting times across everyone’s free/busy',
      'Auto time-blocks your tasks into real, defended slots',
      'Natural language: “coffee with Amara Thursday 3pm” → event',
      'Smart reschedule — proposes the least-disruptive shift on conflict',
      'Meeting prep briefs from agenda, attendees & CRM context',
      'Post-meeting action extraction into your connected task manager',
    ],
  },
  {
    icon: Users,
    title: 'Resource & team management',
    points: [
      'Shared team calendars with granular roles',
      'Conference room & resource booking with approvals',
      'Team availability finder across time zones',
      'Multi-timezone mastery — world-clock strip & keep-in-original-zone',
      'Delegation with a full audit trail',
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
]

const DIFFERENTIATORS = [
  {
    icon: BellRing,
    pain: 'The calendar is a passive grid — you must open it to know your day.',
    fix: 'The Daily Outlook Briefing pushes your day to you by email + SMS before you open anything.',
  },
  {
    icon: MapPin,
    pain: 'Reminders are dumb — no travel, no prep, no context.',
    fix: 'Smart pre-event push at 30 min with join link, prep note and live “leave now” travel timing.',
  },
  {
    icon: RefreshCcw,
    pain: 'One change cascades and you fix the fallout by hand.',
    fix: 'One-tap AI reflow proposes the least-disruptive shift for every knock-on conflict.',
  },
  {
    icon: ShieldCheck,
    pain: 'Deep work gets eaten alive by meetings.',
    fix: 'Focus time that defends itself — protected blocks auto-decline or propose alternates.',
  },
  {
    icon: CalendarClock,
    pain: 'Tasks with deadlines never actually get time on the calendar.',
    fix: 'Auto time-blocking slots tasks from your task manager into real, defended slots.',
  },
  {
    icon: Repeat,
    pain: '“Sometime this week” items don’t fit a rigid time grid.',
    fix: 'Flexible, floating items the calendar auto-places and re-places as the week fills.',
  },
  {
    icon: Vote,
    pain: 'Scheduling with others is endless back-and-forth.',
    fix: 'Built-in booking pages + meeting polls — no separate Calendly or Doodle.',
  },
  {
    icon: Globe2,
    pain: 'Time zones cause wrong-time and missed meetings.',
    fix: 'A timezone-correct core, inline “this is 6am for them” warnings and a world-clock strip.',
  },
  {
    icon: Layers,
    pain: 'Double-booking across personal + work accounts.',
    fix: 'A unified, conflict-aware multi-account view that guards against overlaps.',
  },
  {
    icon: BarChart3,
    pain: 'No idea where your time actually goes.',
    fix: 'Calendar-health analytics — meeting load, focus ratio, after-hours creep, biggest time sinks.',
  },
  {
    icon: FileText,
    pain: 'You arrive at meetings cold, with no context.',
    fix: 'AI prep briefs assembled from agenda, attendee/CRM history and last-meeting notes.',
  },
  {
    icon: Wand2,
    pain: 'Meetings end and nothing captures what was decided.',
    fix: 'Post-meeting action extraction turns notes into tasks in your connected tools.',
  },
  {
    icon: LifeBuoy,
    pain: 'Overbooked weeks with no way out.',
    fix: 'Rescue mode — AI proposes what to decline, move, shorten or delegate.',
  },
  {
    icon: Route,
    pain: 'Back-to-back days with no breathing room.',
    fix: 'Automatic buffers + travel blocks inserted around your meetings.',
  },
  {
    icon: Bell,
    pain: 'Notifications are either noisy or silently missed.',
    fix: 'Respectful, reliable delivery — quiet hours, batching, delivery receipts, no engagement-bait.',
  },
  {
    icon: Moon,
    pain: 'Evenings and weekends quietly get colonised.',
    fix: 'Boundary rules — “protect my evenings / no-meeting Fridays” enforced automatically.',
  },
  {
    icon: WifiOff,
    pain: 'Nothing works properly offline.',
    fix: 'Local-first architecture — full function offline, clean reconciliation on reconnect.',
  },
]

// Everything else from the masterplan, in one scannable checklist
const MORE = [
  'Public booking pages — one-off, round-robin, collective & group',
  'Meeting polls — propose times, invitees vote, auto-books the winner',
  'Paid bookings via Stripe, Paystack & M-Pesa — invoices & auto-refunds',
  'Holiday & multi-country calendars, birthdays & weather on outdoor events',
  'Home-screen & lock-screen widgets; Apple Watch & Wear OS complications',
  'Snooze, undo & bulk-edit on every event action',
  'Privacy modes — “Busy”-only sharing, private & end-to-end-encrypted events',
  'Layered reminders & quiet hours — respectful by default',
  'Installable PWA now; native iOS & Android apps to follow',
  'Templates marketplace, a public API & an embeddable booking widget',
]

const TIERS = [
  {
    name: 'Arwign Free',
    tagline: 'Acquisition & habit',
    price: 'Free',
    period: 'forever',
    cta: 'Create your free calendar',
    href: '/calendar/app',
    highlight: false,
    features: [
      'Full calendar: unlimited events, all views, recurrence',
      '⌘K natural-language quick-add',
      '1 connected external calendar account',
      'Standard reminders incl. the 30-min pre-event push',
      'Email + push Daily Briefing (no SMS)',
    ],
  },
  {
    name: 'Arwign Plus',
    tagline: 'The individual power user',
    price: '$9.99',
    period: '/month',
    cta: 'Subscribe to Arwign Plus',
    href: '/calendar/subscribe/plus',
    highlight: true,
    features: [
      'Everything in Free, plus:',
      'Unlimited connected accounts + unified view',
      'SMS Daily Outlook Briefing + evening preview',
      'Full AI: time-blocking, reflow, email→event, prep briefs',
      'Personal booking pages + meeting polls',
      'Calendar-health analytics & weekly review',
    ],
  },
  {
    name: 'Arwign Teams',
    tagline: 'For teams',
    price: '$23.99',
    period: '/month',
    cta: 'Subscribe to Arwign Teams',
    href: '/calendar/subscribe/teams',
    highlight: false,
    features: [
      'Everything in Plus, plus:',
      'Shared team calendars with roles',
      'Resource / room booking with approvals',
      'Team availability finder across zones',
      'Round-robin & collective booking pages',
      'Admin console & centralised billing',
    ],
  },
]

const FAQS = [
  {
    q: 'Is Arwign Calendar available now?',
    a: 'Yes — the core calendar is live and free: events, recurring series, reminders, day/week/month/agenda/year views, natural-language quick-add, ⌘K, booking pages, meeting polls, a daily email briefing and ICS import/export. Google/Outlook two-way sync and SMS briefings switch on as each provider is connected.',
  },
  {
    q: 'Will it sync with my existing calendar?',
    a: 'Yes. Two-way sync with Google Calendar and Microsoft 365 / Outlook is core, with Apple Calendar via CalDAV and standard ICS import/export. Your existing calendar keeps working — Arwign just makes it smarter.',
  },
  {
    q: 'Will there be a free plan?',
    a: 'Yes. Arwign Free gives you the full calendar, all views, recurrence, quick-add and one connected account — free forever. Advanced automation, unlimited accounts and SMS briefings live on Plus and Teams.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Arwign Calendar is local-first — it works fully offline and reconciles cleanly when you reconnect. It installs as a PWA today, with native iOS and Android apps to follow.',
  },
]

// ════════════════════════════════════════════════════════════
//  Product call-to-action (the calendar is live)
// ════════════════════════════════════════════════════════════
function ProductCTA({ center = false }: { center?: boolean }) {
  return (
    <div className={center ? 'flex flex-col items-center gap-3' : 'w-full max-w-md'}>
      <div className={`flex flex-col sm:flex-row gap-3 ${center ? 'justify-center' : ''}`}>
        <Link href="/calendar/app" className="btn-primary justify-center whitespace-nowrap px-6 py-3">
          Create your free calendar <ArrowRight size={16} />
        </Link>
        <Link href="/calendar/book/arwign" className="btn-outline justify-center whitespace-nowrap px-6 py-3">
          Book a meeting with us
        </Link>
      </div>
      <p className="text-[11px] mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>
        Free forever plan · no card required · works offline.
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Page
// ════════════════════════════════════════════════════════════
export default function CalendarClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div style={{ background: 'var(--bg-primary)' }}>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-25 animate-float pointer-events-none"
          style={{ width: 420, height: 420, top: -120, right: '6%', background: 'var(--gold)' }}
          aria-hidden
        />
        <div className="container-site py-20 lg:py-28 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
              style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)' }}
            >
              <CalendarDays size={14} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
                Arwign Calendar · Now live
              </span>
            </div>

            <h1
              className="font-display font-semibold leading-[1.05] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', color: 'var(--text-primary)' }}
            >
              A calendar that <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>thinks with you.</em>
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Arwign Calendar understands your commitments, protects your time, schedules on your behalf,
              and stays perfectly in sync everywhere you work — calm, considered and quietly intelligent
              time management that respects your attention.
            </p>

            <ProductCTA />

            <p className="mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/calendar/app" className="font-semibold" style={{ color: 'var(--gold)' }}>
                Open your calendar →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Principles ───────────────────────────────────── */}
      <section className="container-site py-16 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="grid md:grid-cols-3 gap-6">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border p-6"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(var(--gold-rgb),0.12)' }}
              >
                <p.icon size={19} style={{ color: 'var(--gold)' }} />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Flagship: Daily Outlook Briefing ─────────────── */}
      <section className="py-16" style={{ background: 'var(--bg-card)' }}>
        <div className="container-site grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
              <Bell size={14} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>Flagship feature</span>
            </div>
            <h2 className="font-display font-semibold mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
              The Daily Outlook Briefing
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              A proactive, AI-composed summary of your day that reaches you on the channels you already
              check — email and SMS — before you open anything. It removes the “open the app to find out”
              step entirely.
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

          {/* mock briefing card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border p-6 shadow-glass-md"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
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
              4 meetings, 2h focus protected, 1 conflict to resolve. Leave by 08:40 for your 09:00 in Westlands.
            </p>
            {[
              { time: '09:00', title: 'Client kickoff — Westlands', flag: 'Leave 08:40' },
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

      {/* ── Pricing ──────────────────────────────────────── */}
      <section className="container-site py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
            Simple, fair pricing
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            A genuinely useful free tier, with high-value automation on Plus and Teams. Regional pricing that reflects local purchasing power.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="rounded-2xl border p-7 relative"
              style={{
                background: 'var(--bg-card)',
                borderColor: tier.highlight ? 'var(--gold)' : 'var(--border)',
                boxShadow: tier.highlight ? '0 12px 40px rgba(var(--gold-rgb),0.18)' : 'none',
              }}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white" style={{ background: 'var(--gold)', letterSpacing: '0.1em' }}>
                  Most popular
                </span>
              )}
              <h3 className="font-display font-semibold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>{tier.name}</h3>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{tier.tagline}</p>
              <div className="mb-5 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{tier.price}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tier.period}</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={tier.href} className={`${tier.highlight ? 'btn-primary' : 'btn-outline'} w-full justify-center py-2.5 text-sm`}>
                {tier.cta} <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-6 opacity-70" style={{ color: 'var(--text-muted)' }}>
          Enterprise (SSO/SCIM, audit exports & data-residency) follows for larger teams. Final pricing announced at launch — waitlist members get founder pricing.
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="container-site py-16 max-w-3xl">
        <h2 className="font-display font-semibold text-center mb-10" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
          Questions, answered
        </h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{f.q}</span>
                <ChevronDown size={18} className={`flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: 'var(--gold)' }} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--bg-card)' }}>
        <div className="container-site text-center max-w-2xl mx-auto">
          <Sparkles size={28} className="mx-auto mb-5" style={{ color: 'var(--gold)' }} />
          <h2 className="font-display font-semibold mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
            Start with a calmer calendar
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Create your free calendar, connect an account and let Arwign do the rest — no card required.
          </p>
          <div className="flex justify-center">
            <ProductCTA center />
          </div>
          <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            Looking for our planners in the meantime?{' '}
            <Link href="/shop" className="font-semibold" style={{ color: 'var(--gold)' }}>Explore the shop →</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
