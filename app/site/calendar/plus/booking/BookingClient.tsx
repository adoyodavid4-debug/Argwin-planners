'use client'
import { useState } from 'react'
import { Plus, Link2, Copy, Check, Power, Vote } from 'lucide-react'
import PlusShell, { StatCard, SectionCard } from '../PlusShell'
import { type PlusWorkspace, type PersonalBookingPage } from '@/lib/calendar/plus'

export default function BookingClient({ ws }: { ws: PlusWorkspace }) {
  const [pages, setPages] = useState<PersonalBookingPage[]>(ws.bookingPages)
  const [copied, setCopied] = useState<string | null>(null)

  const toggle = (id: string) => setPages((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
  const copy = (slug: string) => {
    navigator.clipboard?.writeText(`https://arwign.com/${slug}`).catch(() => {})
    setCopied(slug); setTimeout(() => setCopied(null), 1500)
  }

  const bookings30d = pages.reduce((s, p) => s + p.bookings_30d, 0)

  return (
    <PlusShell workspace={ws} title="Booking & polls"
      subtitle="Personal scheduling links and meeting polls — no separate Calendly or Doodle."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New page</button>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Booking pages" value={pages.length} hint={`${pages.filter((p) => p.active).length} active`} />
        <StatCard label="Bookings · 30d" value={bookings30d} hint="across all pages" />
        <StatCard label="Open polls" value={ws.polls.filter((p) => p.status === 'open').length} hint="awaiting votes" />
        <StatCard label="Responses" value={ws.polls.reduce((s, p) => s + p.responses, 0)} hint="collected" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Booking pages</p>
          {pages.map((p) => (
            <div key={p.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <Link2 size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={p.active ? { background: 'rgba(75,122,78,0.15)', color: '#4B7A4E' } : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {p.active ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <button onClick={() => copy(p.slug)} className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    arwign.com/{p.slug} {copied === p.slug ? <Check size={12} style={{ color: 'var(--gold)' }} /> : <Copy size={12} />}
                  </button>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{p.duration_min} min · {p.bookings_30d} bookings / 30d</p>
                </div>
                <button onClick={() => toggle(p.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <Power size={13} /> {p.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <SectionCard title="Meeting polls">
          <div className="space-y-2.5">
            {ws.polls.map((p) => (
              <div key={p.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Vote size={15} style={{ color: 'var(--gold)' }} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={p.status === 'open' ? { background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' } : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                    {p.status}
                  </span>
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.options} time options · {p.responses} responses</p>
              </div>
            ))}
          </div>
          <button className="btn-outline mt-3 w-full justify-center py-2 text-sm"><Plus size={14} /> New poll</button>
        </SectionCard>
      </div>
    </PlusShell>
  )
}
