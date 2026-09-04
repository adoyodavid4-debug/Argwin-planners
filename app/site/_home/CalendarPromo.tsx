// Homepage sidebar promo for the Arwign Calendar — inviting card with plan
// tiers, pricing and directional CTAs (Free · Arwign Plus · Arwign Teams).
import Link from 'next/link'
import { CalendarDays, ArrowRight, Sparkles, Users, Check, type LucideIcon } from 'lucide-react'

interface Tier {
  name: string
  price: string
  unit?: string
  blurb: string
  cta: string
  href: string
  icon: LucideIcon
  highlight?: boolean
}

// NOTE: prices are launch defaults — adjust freely.
const TIERS: Tier[] = [
  {
    name: 'Arwign Calendar', price: 'Free', icon: CalendarDays,
    blurb: 'Sync your planners · day, week & month views · reminders.',
    cta: 'Open your calendar', href: '/calendar',
  },
  {
    name: 'Arwign Plus', price: '$6', unit: '/mo', icon: Sparkles, highlight: true,
    blurb: 'AI scheduling, unlimited sync, booking pages & a daily briefing.',
    cta: 'Subscribe to Arwign Plus', href: '/calendar?plan=plus',
  },
  {
    name: 'Arwign Teams', price: '$9', unit: '/user · mo', icon: Users,
    blurb: 'Shared team calendars, meeting polls, roles & admin controls.',
    cta: 'Explore Arwign Teams', href: '/calendar?plan=teams',
  },
]

export default function CalendarPromo() {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="p-5 pb-4" style={{ background: 'linear-gradient(135deg, rgba(var(--gold-rgb),0.16) 0%, rgba(168,181,160,0.10) 55%, transparent 100%)' }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>
          <CalendarDays size={12} /> Companion App
        </span>
        <h3 className="font-display text-2xl mt-3" style={{ color: 'var(--text-primary)' }}>Arwign Calendar</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Plan, book and sync — one calm calendar for your whole life.
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {['GoodNotes sync', 'Bookings', 'Reminders'].map((f) => (
            <span key={f} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Check size={11} style={{ color: 'var(--sage)' }} /> {f}
            </span>
          ))}
        </div>
      </div>

      {/* Plan tiers */}
      <div className="p-4 pt-3 flex flex-col gap-3">
        {TIERS.map((t) => (
          <div key={t.name} className="rounded-xl border p-3.5 transition-colors" style={{ borderColor: t.highlight ? 'var(--gold)' : 'var(--border)', background: t.highlight ? 'rgba(var(--gold-rgb),0.06)' : 'transparent' }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                <t.icon size={14} style={{ color: 'var(--gold)' }} /> {t.name}
                {t.highlight && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--gold)' }}>Popular</span>}
              </span>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                {t.price}{t.unit && <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>{t.unit}</span>}
              </span>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.blurb}</p>
            <Link href={t.href} className={`${t.highlight ? 'btn-primary' : 'btn-outline'} w-full justify-center !py-2 text-xs`}>
              {t.cta} <ArrowRight size={13} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
