'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { getPlanInfo, PLAN_RANK, PLAN_LABEL, type CalendarPlan, type PlanInfo } from '@/lib/calendar/plan'
import { X, Check, Sparkles, Users, ArrowRight, Lock, CalendarDays } from 'lucide-react'
import { fmtDateLong } from '@/lib/calendar/fmt'

const localTZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'
const fmtDate = (iso: string) => fmtDateLong(iso, localTZ)

const FREE_FEATURES = [
  'Full calendar: unlimited events, all views, recurrence',
  '⌘K natural-language quick-add',
  '1 connected external calendar account',
  'Standard reminders incl. the 30-min pre-event push',
  'Email + push Daily Briefing (no SMS)',
]
const PLUS_FEATURES = [
  'SMS Daily Outlook Briefing + an evening preview of tomorrow',
  'Full AI: time-blocking, smart reschedule, email→event & prep briefs',
  'Unlimited connected accounts, in one conflict-aware view',
  'Personal booking pages + Doodle-style meeting polls',
  'Calendar-health analytics & a weekly review digest',
  'Focus protection, boundary rules and smart travel buffers',
]
const TEAMS_FEATURES = [
  'Shared team calendars with granular roles',
  'Rooms & resources with approval workflows',
  'Team availability finder across time zones',
  'Round-robin & collective booking pages',
]

type CardState = 'active' | 'included' | 'upgrade'
const TIERS: { tier: CalendarPlan; name: string; price: string; icon: typeof Sparkles; features: string[]; href: string; cta: string; accent: boolean }[] = [
  { tier: 'free',  name: 'Arwign Free',  price: 'Free',     icon: CalendarDays, features: FREE_FEATURES,  href: '',                          cta: '',                 accent: false },
  { tier: 'plus',  name: 'Arwign Plus',  price: '$19.99/mo', icon: Sparkles,     features: PLUS_FEATURES,  href: '/calendar/subscribe/plus',  cta: 'Upgrade to Plus',  accent: true  },
  { tier: 'teams', name: 'Arwign Teams', price: '$49.99/mo',icon: Users,        features: TEAMS_FEATURES, href: '/calendar/subscribe/teams', cta: 'See Arwign Teams', accent: false },
]

function TierCard({ t, state }: { t: typeof TIERS[number]; state: CardState }) {
  const owned = state === 'active' || state === 'included'
  return (
    <section className="rounded-2xl border p-5"
      style={t.accent && state === 'upgrade'
        ? { borderColor: 'rgba(var(--gold-rgb),0.4)', background: 'rgba(var(--gold-rgb),0.06)' }
        : { borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="mb-1 flex items-center gap-2">
        <t.icon size={16} style={{ color: 'var(--gold)' }} />
        <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</h3>
        {state === 'active' && (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: 'var(--gold)', letterSpacing: '0.06em' }}>Active</span>
        )}
        {state === 'included' && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>Included</span>
        )}
        {state === 'upgrade' && (
          <span className="ml-auto text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.price}</span>
        )}
      </div>
      {t.tier === 'free' && state === 'active' && <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Your current plan · free forever</p>}
      <ul className="mb-4 space-y-2.5">
        {t.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {owned
              ? <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Check size={12} style={{ color: 'var(--gold)' }} /></span>
              : <Lock size={13} className="mt-0.5 flex-shrink-0" style={{ color: t.accent ? 'var(--gold-dark)' : 'var(--text-muted)' }} />}
            {f}
          </li>
        ))}
      </ul>
      {state === 'upgrade' && (
        <Link href={t.href} className={`${t.accent ? 'btn-primary' : 'btn-outline'} w-full justify-center py-2.5`}>
          {t.cta} <ArrowRight size={15} />
        </Link>
      )}
    </section>
  )
}

function PlanContent({ onClose }: { onClose?: () => void }) {
  const [info, setInfo] = useState<PlanInfo | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => { const i = await getPlanInfo(createClient() as any); if (alive) setInfo(i) })()
    return () => { alive = false }
  }, [])
  const [cancelling, setCancelling] = useState(false)
  const plan: CalendarPlan = info?.plan ?? 'free'
  const rank = PLAN_RANK[plan]
  const stateFor = (tier: CalendarPlan): CardState =>
    rank === PLAN_RANK[tier] ? 'active' : rank > PLAN_RANK[tier] ? 'included' : 'upgrade'

  const doCancel = async () => {
    if (!window.confirm('Cancel your subscription? You keep access until the end of the current period.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/calendar/subscribe/cancel', { method: 'POST' })
      const out = await res.json()
      if (res.ok && out.ok) {
        toast.success('Subscription cancelled — access continues until it expires.')
        setInfo((prev) => (prev ? { ...prev, subscribed: false } : prev))
      } else toast.error(out.error ?? 'Could not cancel. Please try again.')
    } catch { toast.error('Network error. Please try again.') }
    setCancelling(false)
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
        <span className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Your plan</span>
        {info?.isAdmin && <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>admin</span>}
        {onClose && <button onClick={onClose} className="btn-ghost ml-auto" aria-label="Close"><X size={18} /></button>}
      </div>

      <div className="space-y-5 px-4 py-5">
        {plan !== 'free' && info?.expiresAt && !info.isAdmin && (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            {info.subscribed ? (
              <>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your <strong style={{ color: 'var(--text-primary)' }}>{PLAN_LABEL[plan]}</strong> renews automatically on{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(info.expiresAt)}</strong>.
                </p>
                <button onClick={doCancel} disabled={cancelling}
                  className="mt-3 w-full rounded-lg border py-2 text-sm font-medium disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your <strong style={{ color: 'var(--text-primary)' }}>{PLAN_LABEL[plan]}</strong> is active until{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(info.expiresAt)}</strong> and won’t renew.
                </p>
                <Link href={`/calendar/subscribe/${plan}`} className="btn-primary mt-3 w-full justify-center py-2 text-sm">
                  Resubscribe <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        )}
        {TIERS.map((t) => <TierCard key={t.tier} t={t} state={stateFor(t.tier)} />)}
        <p className="px-1 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Your free calendar keeps working forever. Upgrade or cancel anytime.
        </p>
      </div>
    </div>
  )
}

// Slide-over wrapper (opened from the calendar toolbar / sidebar / Today rail).
export default function PlusPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80]" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} aria-hidden
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 z-[81] h-full w-full max-w-[460px] overflow-y-auto shadow-glass-lg"
            style={{ background: 'var(--bg-primary)' }}
            aria-label="Your plan"
          >
            <PlanContent onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
