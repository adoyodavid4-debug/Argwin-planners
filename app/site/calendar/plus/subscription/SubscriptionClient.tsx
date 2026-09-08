'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Sparkles, Check, CreditCard, Users, ArrowRight, Loader2, ExternalLink } from 'lucide-react'
import PlusShell, { SectionCard } from '../PlusShell'
import { type PlusWorkspace } from '@/lib/calendar/plus'
import { type PlanInfo, PLAN_LABEL, PLAN_PRICE } from '@/lib/calendar/plan'
import { fmtDateLong } from '@/lib/calendar/fmt'

const INCLUDED = [
  'Unlimited connected calendar accounts, unified view',
  'Daily Outlook Briefing — email + SMS + evening preview',
  'Full AI: time-blocking, smart reschedule, email→event, prep briefs',
  'Personal booking pages + meeting polls',
  'Calendar-health analytics & weekly review',
  'Focus protection, boundary rules & travel buffers',
]

export default function SubscriptionClient({ ws, plan }: { ws: PlusWorkspace; plan: PlanInfo }) {
  const { profile } = ws
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const paidPlan = plan.plan === 'teams' ? 'teams' : 'plus'
  const planLabel = PLAN_LABEL[plan.plan] ?? 'Arwign Plus'
  const price = plan.plan === 'free' ? null : `$${PLAN_PRICE[paidPlan].toFixed(2)}`
  const renews = plan.expiresAt ? fmtDateLong(plan.expiresAt, profile.timezone) : null

  // Subscriptions are billed through PayPal — their autopay page is the billing portal.
  const manageBilling = () => {
    window.open('https://www.paypal.com/myaccount/autopay/', '_blank', 'noopener')
  }

  const cancel = async () => {
    if (!confirming) { setConfirming(true); return }
    setCancelling(true)
    try {
      const res = await fetch('/api/calendar/subscribe/cancel', { method: 'POST' })
      const out = await res.json()
      if (res.ok && out.ok) {
        toast.success(out.until
          ? `Subscription cancelled — access continues until ${fmtDateLong(out.until, profile.timezone)}.`
          : 'Subscription cancelled.')
        router.refresh()
      } else {
        toast.error(out.error ?? 'Could not cancel. Please try again.')
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setCancelling(false); setConfirming(false)
    }
  }

  const billingLine = [
    price ? `${price} / month` : 'Included with your account',
    renews ? `renews ${renews}` : null,
    plan.subscribed ? 'cancel anytime' : null,
  ].filter(Boolean).join(' · ')

  return (
    <PlusShell workspace={ws} title="Subscription"
      subtitle="Your plan, billing and what’s included.">

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Current plan">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--gold)' }}><Sparkles size={22} color="white" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{planLabel}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{billingLine}</p>
              </div>
              {plan.subscribed ? (
                <button onClick={manageBilling} className="btn-outline px-3.5 py-2 text-sm"><CreditCard size={15} /> Manage billing <ExternalLink size={12} /></button>
              ) : (
                <Link href="/calendar/subscribe/plus" className="btn-outline px-3.5 py-2 text-sm"><CreditCard size={15} /> Set up billing</Link>
              )}
            </div>
            {plan.subscribed && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Billing is handled securely by PayPal — “Manage billing” opens your PayPal automatic-payments page in a new tab.
              </p>
            )}

            <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>What’s included</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Check size={12} style={{ color: 'var(--gold)' }} /></span>
                  {f}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Detail label="Name" value={profile.name} />
              <Detail label="Email" value={profile.email} />
              <Detail label="Phone (SMS)" value={profile.phone || '—'} />
              <Detail label="Time zone" value={profile.timezone.replace('_', ' ')} />
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          {plan.plan !== 'teams' && (
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <Users size={18} style={{ color: 'var(--gold)' }} />
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Working with a team?</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Arwign Teams adds shared calendars, roles, resource booking and an admin console — $49.99/mo.</p>
              <Link href="/calendar/subscribe/teams" className="btn-outline mt-3 w-full justify-center py-2 text-sm">Explore Teams <ArrowRight size={14} /></Link>
            </div>
          )}

          <SectionCard title="Cancel">
            {plan.subscribed ? (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  You can cancel anytime — paid features stay active until the end of your billing period.
                </p>
                <button onClick={cancel} disabled={cancelling}
                  className="mt-3 w-full rounded-lg border py-2 text-sm font-medium disabled:opacity-60"
                  style={confirming ? { borderColor: 'rgba(180,102,74,0.5)', color: '#B4664A' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {cancelling ? <Loader2 size={14} className="mx-auto animate-spin" /> : confirming ? 'Click again to confirm cancellation' : 'Cancel subscription'}
                </button>
                {confirming && !cancelling && (
                  <button onClick={() => setConfirming(false)} className="mt-2 w-full text-center text-xs" style={{ color: 'var(--text-muted)' }}>Keep my subscription</button>
                )}
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No active recurring subscription on this account — nothing to cancel.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </PlusShell>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  )
}
