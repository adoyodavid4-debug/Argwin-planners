'use client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Sparkles, Users, ArrowRight, Lock } from 'lucide-react'

// What the free calendar actually includes.
const FREE_FEATURES = [
  'Full calendar: unlimited events, all views, recurrence',
  '⌘K natural-language quick-add',
  '1 connected external calendar account',
  'Standard reminders incl. the 30-min pre-event push',
  'Email + push Daily Briefing (no SMS)',
]

// Paid upgrades — shown as locked so it is clear they are not part of Free.
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

function PlanContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
        <span className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Your plan</span>
        {onClose && <button onClick={onClose} className="btn-ghost ml-auto" aria-label="Close"><X size={18} /></button>}
      </div>

      <div className="space-y-5 px-4 py-5">
        {/* ── Free (current plan) ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Free</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your current plan · free forever</p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: 'var(--gold)', letterSpacing: '0.06em' }}>Active</span>
          </div>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}>
                  <Check size={12} style={{ color: 'var(--gold)' }} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Plus (upgrade) ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'rgba(var(--gold-rgb),0.4)', background: 'rgba(var(--gold-rgb),0.06)' }}>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'var(--gold)' }} />
            <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Plus</h3>
            <span className="ml-auto text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>$9.99<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span></span>
          </div>
          <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Everything in Free, plus:</p>
          <ul className="mb-4 space-y-2.5">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Lock size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold-dark)' }} />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/calendar/subscribe/plus" className="btn-primary w-full justify-center py-2.5">
            Upgrade to Plus <ArrowRight size={15} />
          </Link>
        </section>

        {/* ── Teams (upgrade) ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="mb-1 flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--gold)' }} />
            <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Teams</h3>
            <span className="ml-auto text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>$23.99<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span></span>
          </div>
          <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Everything in Plus, for your whole team:</p>
          <ul className="mb-4 space-y-2.5">
            {TEAMS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Lock size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/calendar/subscribe/teams" className="btn-outline w-full justify-center py-2.5">
            See Arwign Teams <ArrowRight size={15} />
          </Link>
        </section>

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
