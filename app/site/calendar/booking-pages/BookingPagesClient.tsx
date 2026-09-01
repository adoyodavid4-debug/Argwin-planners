'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Link2, Copy, Pencil, Trash2, Calendar, Clock, Check, X, ExternalLink, ArrowLeft, Power } from 'lucide-react'

interface Page {
  id: string; slug: string; title: string; description: string | null
  duration_min: number; buffer_min: number; min_notice_hours: number; advance_days: number
  timezone: string; working_hours: Record<string, [string, string][]>; location: string | null
  colour: string | null; is_active: boolean
  requires_payment?: boolean; price_cents?: number; currency?: string
}
interface Booking { id: string; name: string; email: string; notes: string | null; start_at: string; end_at: string; status: string; booking_page_id: string }

const DAYS = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['7', 'Sun']] as const
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
const fmt = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

const blankForm = {
  id: '' as string, title: '', slug: '', description: '', duration_min: 30, buffer_min: 0,
  min_notice_hours: 4, advance_days: 30, timezone: 'Africa/Nairobi', location: '',
  days: new Set(['1', '2', '3', '4', '5']), start: '09:00', end: '17:00', is_active: true,
  requires_payment: false, price: 0, currency: 'USD',
}

export default function BookingPagesClient({ initialPages, bookings }: { initialPages: Page[]; bookings: Booking[] }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [pages, setPages] = useState<Page[]>(initialPages)
  const [form, setForm] = useState<typeof blankForm | null>(null)
  const [saving, setSaving] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const openNew = () => setForm({ ...blankForm, days: new Set(['1', '2', '3', '4', '5']) })
  const openEdit = (p: Page) => {
    const firstDay = Object.entries(p.working_hours || {})[0]?.[1]?.[0]
    setForm({
      id: p.id, title: p.title, slug: p.slug, description: p.description ?? '', duration_min: p.duration_min,
      buffer_min: p.buffer_min, min_notice_hours: p.min_notice_hours, advance_days: p.advance_days,
      timezone: p.timezone, location: p.location ?? '', days: new Set(Object.keys(p.working_hours || {})),
      start: firstDay?.[0] ?? '09:00', end: firstDay?.[1] ?? '17:00', is_active: p.is_active,
      requires_payment: p.requires_payment ?? false, price: p.price_cents ? p.price_cents / 100 : 0, currency: p.currency ?? 'USD',
    })
  }

  const save = async () => {
    if (!form) return
    const title = form.title.trim()
    const slug = (form.slug.trim() || slugify(title))
    if (!title || !slug) { toast.error('Add a title.'); return }
    if (form.days.size === 0) { toast.error('Pick at least one available day.'); return }
    const working_hours: Record<string, [string, string][]> = {}
    Array.from(form.days).forEach((d) => { working_hours[d] = [[form.start, form.end]] })

    const payload = {
      title, slug, description: form.description.trim() || null, duration_min: Number(form.duration_min),
      buffer_min: Number(form.buffer_min), min_notice_hours: Number(form.min_notice_hours),
      advance_days: Number(form.advance_days), timezone: form.timezone.trim() || 'Africa/Nairobi',
      location: form.location.trim() || null, working_hours, is_active: form.is_active,
      requires_payment: !!form.requires_payment,
      price_cents: form.requires_payment ? Math.max(0, Math.round(Number(form.price) * 100)) : 0,
      currency: (form.currency || 'USD').toUpperCase(),
    }
    setSaving(true)
    try {
      if (form.id) {
        const { data, error } = await supabase.from('booking_pages').update(payload).eq('id', form.id).select().single()
        if (error) throw error
        setPages((ps) => ps.map((p) => (p.id === form.id ? data : p)))
      } else {
        const { data, error } = await supabase.from('booking_pages').insert(payload).select().single()
        if (error) throw error
        setPages((ps) => [data, ...ps])
      }
      toast.success('Booking page saved ✦')
      setForm(null)
    } catch (e: any) {
      toast.error(e?.code === '23505' ? 'That link (slug) is already taken.' : e?.message || 'Could not save.')
    } finally { setSaving(false) }
  }

  const toggleActive = async (p: Page) => {
    const { data, error } = await supabase.from('booking_pages').update({ is_active: !p.is_active }).eq('id', p.id).select().single()
    if (!error) { setPages((ps) => ps.map((x) => (x.id === p.id ? data : x))); toast.success(data.is_active ? 'Page live' : 'Page paused') }
  }
  const remove = async (p: Page) => {
    if (!confirm(`Delete “${p.title}”? Existing bookings are kept but the link stops working.`)) return
    const { error } = await supabase.from('booking_pages').delete().eq('id', p.id)
    if (!error) { setPages((ps) => ps.filter((x) => x.id !== p.id)); toast.success('Page deleted') }
  }
  const copyLink = (slug: string) => { navigator.clipboard.writeText(`${origin}/calendar/book/${slug}`); toast.success('Link copied') }

  const bookingsByPage = (id: string) => bookings.filter((b) => b.booking_page_id === id)

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/calendar/app" className="inline-flex items-center gap-1.5 text-sm mb-2 hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={15} /> Calendar</Link>
            <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>Booking pages</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Share a link and let people book a time that’s genuinely free on your calendar.</p>
          </div>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> New page</button>
        </div>

        {pages.length === 0 && !form && (
          <div className="rounded-3xl border p-10 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Link2 size={24} style={{ color: 'var(--gold)' }} /></div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No booking pages yet</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Create one to get a shareable scheduling link.</p>
            <button onClick={openNew} className="btn-primary mx-auto"><Plus size={16} /> Create your first page</button>
          </div>
        )}

        {/* Pages list */}
        <div className="space-y-4">
          {pages.map((p) => (
            <div key={p.id} className="rounded-3xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: p.is_active ? 'rgba(110,139,122,0.18)' : 'var(--bg-secondary)', color: p.is_active ? 'var(--sage,#6E8B7A)' : 'var(--text-muted)' }}>{p.is_active ? 'Live' : 'Paused'}</span>
                  </div>
                  <p className="text-xs mb-2 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {p.duration_min} min</span>
                    <span>/calendar/book/{p.slug}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyLink(p.slug)} title="Copy link" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}><Copy size={15} /></button>
                  <Link href={`/calendar/book/${p.slug}`} target="_blank" title="Open" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}><ExternalLink size={15} /></Link>
                  <button onClick={() => toggleActive(p)} title={p.is_active ? 'Pause' : 'Go live'} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}><Power size={15} /></button>
                  <button onClick={() => openEdit(p)} title="Edit" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}><Pencil size={15} /></button>
                  <button onClick={() => remove(p)} title="Delete" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--clay,#B4664A)' }}><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Upcoming bookings */}
              {bookingsByPage(p.id).length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Upcoming bookings</p>
                  <ul className="space-y-1.5">
                    {bookingsByPage(p.id).map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 min-w-0" style={{ color: 'var(--text-primary)' }}><Calendar size={13} style={{ color: 'var(--gold)' }} /> <span className="truncate">{b.name}</span> <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {b.email}</span></span>
                        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{fmt(b.start_at, p.timezone)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Editor */}
        {form && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
            <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Edit booking page' : 'New booking page'}</h2>
                <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <Field label="Title *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} className={inp} style={inpStyle}placeholder="Discovery call" /></Field>
                <Field label="Link (slug) *"><div className="flex items-center gap-1 text-sm"><span style={{ color: 'var(--text-muted)' }}>/calendar/book/</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className={inp} style={inpStyle}placeholder="discovery" /></div></Field>
                <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inp + ' resize-none'} style={inpStyle} placeholder="What this meeting is for." /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (min)"><input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: +e.target.value })} className={inp} style={inpStyle}/></Field>
                  <Field label="Buffer (min)"><input type="number" value={form.buffer_min} onChange={(e) => setForm({ ...form, buffer_min: +e.target.value })} className={inp} style={inpStyle}/></Field>
                  <Field label="Min notice (hrs)"><input type="number" value={form.min_notice_hours} onChange={(e) => setForm({ ...form, min_notice_hours: +e.target.value })} className={inp} style={inpStyle}/></Field>
                  <Field label="Bookable up to (days)"><input type="number" value={form.advance_days} onChange={(e) => setForm({ ...form, advance_days: +e.target.value })} className={inp} style={inpStyle}/></Field>
                </div>
                <Field label="Available days">
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map(([iso, label]) => {
                      const on = form.days.has(iso)
                      return <button key={iso} type="button" onClick={() => { const d = new Set(form.days); on ? d.delete(iso) : d.add(iso); setForm({ ...form, days: d }) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{label}</button>
                    })}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Day starts"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inp} style={inpStyle}/></Field>
                  <Field label="Day ends"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inp} style={inpStyle}/></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Timezone (IANA)"><input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={inp} style={inpStyle}placeholder="Africa/Nairobi" /></Field>
                  <Field label="Location / link"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inp} style={inpStyle}placeholder="Google Meet" /></Field>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={form.requires_payment} onChange={(e) => setForm({ ...form, requires_payment: e.target.checked })} /> Require payment to book
                  </label>
                  {form.requires_payment && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Field label="Price"><input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} className={inp} style={inpStyle} placeholder="25" /></Field>
                      <Field label="Currency"><input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} className={inp} style={inpStyle} placeholder="USD" /></Field>
                      <p className="col-span-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>Guests pay securely via Stripe; the meeting is confirmed and added to your calendar once payment succeeds.</p>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Live (accepting bookings)
                </label>
                <div className="flex gap-3 pt-2">
                  <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : <><Check size={15} /> Save page</>}</button>
                  <button onClick={() => setForm(null)} className="btn-outline justify-center">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm'
const inpStyle = { borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' } as const
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div style={{ ['--tw' as any]: '' }}>{children}</div>
    </div>
  )
}
