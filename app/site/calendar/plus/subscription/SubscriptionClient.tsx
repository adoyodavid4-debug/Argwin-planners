'use client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Sparkles, Check, CreditCard, Users, ArrowRight } from 'lucide-react'
import PlusShell, { SectionCard } from '../PlusShell'
import { type PlusWorkspace } from '@/lib/calendar/plus'

const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

const INCLUDED = [
  'Unlimited connected calendar accounts, unified view',
  'Daily Outlook Briefing — email + SMS + evening preview',
  'Full AI: time-blocking, smart reschedule, email→event, prep briefs',
  'Personal booking pages + meeting polls',
  'Calendar-health analytics & weekly review',
  'Focus protection, boundary rules & travel buffers',
]

export default function SubscriptionClient({ ws }: { ws: PlusWorkspace }) {
  const { profile } = ws
  return (
    <PlusShell workspace={ws} title="Subscription"
      subtitle="Your plan, billing and what’s included.">

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Current plan">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--gold)' }}><Sparkles size={22} color="white" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Plus</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile.price} / month · renews {fmtDate(profile.renews_on)} · cancel anytime</p>
              </div>
              <button onClick={() => toast.success('Redirecting to billing portal…')} className="btn-outline px-3.5 py-2 text-sm"><CreditCard size={15} /> Manage billing</button>
            </div>

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
              <Detail label="Phone (SMS)" value={profile.phone} />
              <Detail label="Time zone" value={profile.timezone.replace('_', ' ')} />
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <Users size={18} style={{ color: 'var(--gold)' }} />
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Working with a team?</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Arwign Teams adds shared calendars, roles, resource booking and an admin console — $23.99/mo.</p>
            <Link href="/calendar/team" className="btn-outline mt-3 w-full justify-center py-2 text-sm">Explore Teams <ArrowRight size={14} /></Link>
          </div>

          <SectionCard title="Cancel">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can cancel anytime — Plus features stay active until the end of your billing period.</p>
            <button onClick={() => toast('Manage cancellation in the billing portal', { icon: 'ℹ️' })}
              className="mt-3 w-full rounded-lg border py-2 text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancel subscription
            </button>
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
