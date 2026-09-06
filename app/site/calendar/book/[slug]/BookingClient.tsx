'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MapPin, Globe, ChevronLeft, ChevronRight, Check, CalendarCheck, Download, ArrowLeft, Loader2, CreditCard } from 'lucide-react'

export interface PublicPage {
  slug: string
  title: string
  description: string | null
  duration_min: number
  timezone: string
  location: string | null
  colour: string | null
  is_active: boolean
  price_cents?: number
  currency?: string
  requires_payment?: boolean
}

interface Slot { startISO: string; endISO: string }
interface Result { id: string; title: string; name: string; email: string; startISO: string; endISO: string; timezone: string; location: string | null }

// ── date helpers (date-only, UTC-anchored for stable labels) ──
const todayLocalStr = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
function dayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(dt),
    day: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' }).format(dt),
    month: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(dt),
  }
}
const timeInTz = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
const fullInTz = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

function downloadIcs(r: Result) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arwign//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${r.id}@arwignplanners.com`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(r.startISO)}`, `DTEND:${stamp(r.endISO)}`,
    `SUMMARY:${esc(r.title)}`, r.location ? `LOCATION:${esc(r.location)}` : '', `DESCRIPTION:${esc('Booked with Arwign Calendar')}`, 'END:VEVENT', 'END:VCALENDAR']
    .filter(Boolean).join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a'); a.href = url; a.download = 'arwign-booking.ics'; a.click(); URL.revokeObjectURL(url)
}

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100)

export default function BookingClient({ page }: { page: PublicPage }) {
  const guestTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  const today = todayLocalStr(page.timezone)
  const [windowStart, setWindowStart] = useState(today)
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [form, setForm] = useState({ name: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [cancelledNote, setCancelledNote] = useState(false)

  const isPaid = !!page.requires_payment && Number(page.price_cents) > 0
  const days = Array.from({ length: 14 }, (_, i) => addDays(windowStart, i))

  // Returning from Stripe: ?confirmed=<bookingId> or ?cancelled=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const confirmed = params.get('confirmed')
    if (params.get('cancelled')) setCancelledNote(true)
    if (confirmed) {
      fetch(`/api/calendar/bookings?id=${encodeURIComponent(confirmed)}`)
        .then((r) => r.json())
        .then((j) => { if (j.booking) setResult(j.booking) })
        .catch(() => {})
    }
  }, [])

  const loadSlots = useCallback(async (d: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/calendar/availability?slug=${encodeURIComponent(page.slug)}&date=${d}`)
      const json = await res.json()
      setSlots(res.ok ? json.slots ?? [] : [])
    } catch { setSlots([]) } finally { setLoading(false) }
  }, [page.slug])

  useEffect(() => { loadSlots(date) }, [date, loadSlots])

  const submit = async () => {
    if (!slot || !form.name.trim() || !form.email.trim()) { setError('Please add your name and email.'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/calendar/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: page.slug, startISO: slot.startISO, name: form.name, email: form.email, notes: form.notes, guestTz }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Something went wrong.'); if (res.status === 409) { setSlot(null); loadSlots(date) }; return }
      if (json.payment && json.url) { window.location.href = json.url; return } // to Stripe Checkout
      setResult(json.booking)
    } catch { setError('Network error — please try again.') } finally { setSubmitting(false) }
  }

  const accent = 'var(--gold)'

  // ── Confirmation ──────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-16" style={{ background: 'var(--bg-primary)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-3xl border p-8 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(110,139,122,0.16)' }}>
            <CalendarCheck size={30} style={{ color: 'var(--sage, #6E8B7A)' }} />
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>You’re booked in ✦</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>A calendar invite is ready below. We’ve noted your details for <strong>{result.title}</strong>.</p>
          <div className="rounded-2xl border p-5 text-left mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{result.title}</p>
            <p className="text-sm flex items-center gap-2 mb-1.5" style={{ color: 'var(--text-secondary)' }}><Clock size={14} style={{ color: accent }} /> {fullInTz(result.startISO, result.timezone)}</p>
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Times shown in {result.timezone}{guestTz !== result.timezone ? ` · ${timeInTz(result.startISO, guestTz)} your time` : ''}</p>
            {result.location && <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><MapPin size={14} style={{ color: accent }} /> {result.location}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => downloadIcs(result)} className="btn-primary justify-center"><Download size={15} /> Add to calendar</button>
            <Link href="/calendar" className="btn-outline justify-center">Done</Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Booking screen ────────────────────────────────────────
  return (
    <div className="min-h-[80vh] px-4 sm:px-6 py-10 lg:py-14" style={{ background: `linear-gradient(160deg, rgba(var(--gold-rgb),0.08) 0%, var(--bg-primary) 45%)` }}>
      <div className="max-w-4xl mx-auto">
        <nav className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          <Link href="/calendar" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Arwign Calendar</Link> · Book
        </nav>

        <div className="grid lg:grid-cols-[1fr,1.4fr] gap-6 lg:gap-8">
          {/* Summary */}
          <div className="rounded-3xl border p-6 h-fit lg:sticky lg:top-24" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: accent, letterSpacing: '0.12em' }}>Arwign Calendar</p>
            <h1 className="font-display text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>{page.title}</h1>
            {page.description && <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{page.description}</p>}
            <ul className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2.5"><Clock size={15} style={{ color: accent }} /> {page.duration_min} minutes</li>
              {page.location && <li className="flex items-center gap-2.5"><MapPin size={15} style={{ color: accent }} /> {page.location}</li>}
              <li className="flex items-center gap-2.5"><Globe size={15} style={{ color: accent }} /> Times in {page.timezone}</li>
              {isPaid && <li className="flex items-center gap-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}><CreditCard size={15} style={{ color: accent }} /> {money(page.price_cents!, page.currency)}</li>}
            </ul>
            {cancelledNote && <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(180,102,74,0.12)', color: 'var(--clay, #B4664A)' }}>Payment was cancelled — your time wasn’t booked. You can try again.</p>}
          </div>

          {/* Date + slots / form */}
          <div className="rounded-3xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <AnimatePresence mode="wait">
              {!slot ? (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pick a day &amp; time</h2>
                    <div className="flex items-center gap-1">
                      <button aria-label="Earlier days" disabled={windowStart <= today} onClick={() => setWindowStart(addDays(windowStart, -14) < today ? today : addDays(windowStart, -14))} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={16} /></button>
                      <button aria-label="Later days" onClick={() => setWindowStart(addDays(windowStart, 14))} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={16} /></button>
                    </div>
                  </div>

                  {/* Day strip */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
                    {days.map((d) => {
                      const l = dayLabel(d); const active = d === date
                      return (
                        <button key={d} onClick={() => setDate(d)} className="flex-shrink-0 w-16 rounded-2xl border py-2.5 text-center transition-all"
                          style={{ borderColor: active ? accent : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.12)' : 'var(--bg-secondary)' }}>
                          <span className="block text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>{l.weekday}</span>
                          <span className="block text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.day}</span>
                          <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.month}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Slots */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}><Loader2 size={20} className="animate-spin" /></div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No times available on this day — try another.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {slots.map((s) => (
                        <button key={s.startISO} onClick={() => { setSlot(s); setError(null) }} className="py-2.5 rounded-xl border text-sm font-medium tabular-nums transition-all hover:-translate-y-0.5"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                          {timeInTz(s.startISO, page.timezone)}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <button onClick={() => { setSlot(null); setError(null) }} className="inline-flex items-center gap-1.5 text-sm mb-4 hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={15} /> Change time</button>
                  <div className="rounded-2xl border p-4 mb-5 flex items-center gap-2.5" style={{ borderColor: accent, background: 'rgba(var(--gold-rgb),0.08)' }}>
                    <Check size={16} style={{ color: accent }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fullInTz(slot.startISO, page.timezone)}</p>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Your name *</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Jordan Miller" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Anything to share? (optional)</label>
                      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border px-3.5 py-2.5 text-sm resize-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="What would you like to cover?" />
                    </div>
                    {error && <p className="text-sm" style={{ color: 'var(--clay, #B4664A)' }}>{error}</p>}
                    <button onClick={submit} disabled={submitting} className="btn-primary w-full justify-center">
                      {submitting
                        ? <><Loader2 size={15} className="animate-spin" /> {isPaid ? 'Redirecting to payment…' : 'Booking…'}</>
                        : isPaid
                          ? <>Pay &amp; book · {money(page.price_cents!, page.currency)} <CreditCard size={15} /></>
                          : <>Confirm booking <Check size={15} /></>}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                      Times shown in {page.timezone}. {isPaid ? 'Secure payment via Stripe.' : 'You’ll get a calendar invite to add.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {error && !slot && <p className="text-sm mt-3" style={{ color: 'var(--clay, #B4664A)' }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
