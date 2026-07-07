'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CalendarDays, Sparkles, ShieldCheck, Wand2, Users, Palette, Bell, Mail,
  MessageSquare, Clock, MapPin, RefreshCcw, Repeat, Layers, Globe2, Zap,
  Check, ArrowRight, ChevronDown, Brain, PlugZap, CalendarClock, BellRing,
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
      'One unified, conflict-aware view across every account',
      'Auto Google Meet / Zoom / Teams links on every event',
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
    ],
  },
  {
    icon: Users,
    title: 'Resource & team management',
    points: [
      'Shared team calendars with granular roles',
      'Conference room & resource booking with approvals',
      'Team availability finder across time zones',
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
    icon: Globe2,
    pain: 'Time zones cause wrong-time and missed meetings.',
    fix: 'A timezone-correct core, inline “this is 6am for them” warnings and a world-clock strip.',
  },
]

const TIERS = [
  {
    name: 'Arwign Free',
    tagline: 'Acquisition & habit',
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
    tagline: 'Per seat',
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
    q: 'When is Arwign Calendar launching?',
    a: 'We’re building it in careful, trustworthy phases — starting with a rock-solid core calendar and two-way Google/Outlook sync. Join the waitlist and you’ll be first in line for early access.',
  },
  {
    q: 'Will it sync with my existing calendar?',
    a: 'Yes. Two-way sync with Google Calendar and Microsoft 365 / Outlook is core, with Apple Calendar via CalDAV and standard ICS import/export. Your existing calendar keeps working — Arwign just makes it smarter.',
  },
  {
    q: 'Does the AI do things without asking?',
    a: 'Never. Every AI action is a proposal you can accept, edit or dismiss. Arwign Calendar never silently moves, deletes or books anything, and every suggestion is logged and reversible.',
  },
  {
    q: 'What’s the Daily Outlook Briefing?',
    a: 'A proactive, AI-composed summary of your day delivered to your inbox and phone before you open anything — your timeline, what needs action, leave-by times and a gentle nudge if the day is overloaded.',
  },
  {
    q: 'Will there be a free plan?',
    a: 'Yes. Arwign Free gives you the full calendar, all views, recurrence, quick-add and one connected account — free forever. Advanced automation, unlimited accounts and SMS briefings live on Plus and Teams.',
  },
]

// ════════════════════════════════════════════════════════════
//  Waitlist form (posts to the existing /api/optin endpoint)
// ════════════════════════════════════════════════════════════
function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.')
      setState('error')
      return
    }
    setState('loading'); setError('')
    try {
      const res = await fetch('/api/optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale: 'en',
          utm: { utm_source: 'arwign-calendar', utm_campaign: 'calendar-waitlist' },
          consent_text: 'I want early access to Arwign Calendar and agree to receive emails about it.',
          honeypot: '',
        }),
      })
      if (res.ok) { setState('done') }
      else {
        const data = await res.json().catch(() => ({}))
        setError(data.error?.email?.[0] ?? data.error ?? 'Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setError('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="text-4xl mb-2">🗓️</div>
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>You’re on the list!</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          We’ll email you the moment early access opens.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
          placeholder="Your email address"
          autoComplete="email"
          className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="btn-primary justify-center whitespace-nowrap px-6 py-3 disabled:opacity-60"
        >
          {state === 'loading' ? 'Joining…' : 'Join the waitlist'}
          {state !== 'loading' && <ArrowRight size={16} />}
        </button>
      </div>
      {state === 'error' && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <p className="text-[11px] mt-2 opacity-70" style={{ color: 'var(--text-muted)' }}>
        Be first to try it. No spam — just launch news. Unsubscribe any time.
      </p>
    </form>
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
                Arwign Calendar · Coming soon
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

            <WaitlistForm />

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

      {/* ── Pillars ──────────────────────────────────────── */}
      <section className="container-site py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
            Everything a calendar should have done all along
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Not a wall you hang your obligations on — an assistant that manages your time.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border p-7"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <pillar.icon size={19} style={{ color: 'var(--gold)' }} />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{pillar.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {pillar.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                    {pt}
                  </li>
                ))}
              </ul>
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

      {/* ── Differentiators ──────────────────────────────── */}
      <section className="container-site py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--text-primary)' }}>
            The pain points we eliminate
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Every ordinary-calendar frustration, answered by a concrete feature.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DIFFERENTIATORS.map((d, i) => (
            <motion.div
              key={d.pain}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (i % 3) * 0.06 }}
              className="rounded-2xl border p-6"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <d.icon size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="text-sm line-through decoration-1 mb-2 opacity-70" style={{ color: 'var(--text-muted)' }}>{d.pain}</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.fix}</p>
            </motion.div>
          ))}
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
              <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{tier.tagline}</p>
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-6 opacity-70" style={{ color: 'var(--text-muted)' }}>
          Final pricing announced at launch. Waitlist members get founder pricing.
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
            Be first to a calmer calendar
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Join the waitlist for early access and founder pricing when Arwign Calendar launches.
          </p>
          <div className="flex justify-center">
            <WaitlistForm />
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
