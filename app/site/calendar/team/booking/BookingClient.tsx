'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Users, Repeat, UsersRound, Link2, Copy, Check, Power, X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import {
  type TeamWorkspace, type TeamBookingPage, type PageType, type WorkingHours,
  DEFAULT_WORKING_HOURS, byId, logTeamAction,
} from '@/lib/calendar/team'

const TYPE_META: Record<PageType, { icon: typeof Repeat; label: string; blurb: string }> = {
  'round-robin': { icon: Repeat, label: 'Round-robin', blurb: 'Distributes bookings evenly across the team.' },
  collective:    { icon: Users, label: 'Collective', blurb: 'Books only when every host is free.' },
  group:         { icon: UsersRound, label: 'Group', blurb: 'Many invitees share one slot, up to capacity.' },
}

// US/UK only, per market policy.
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London']
const DAYS = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['7', 'Sun']] as const

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

interface FormState {
  id?: string
  name: string
  type: PageType
  duration: number
  timezone: string
  days: Set<string>
  start: string
  end: string
  buffer_min: number
  min_notice_hours: number
  advance_days: number
  capacity: number
  memberIds: string[]
}

function toWorkingHours(f: FormState): WorkingHours {
  const wh: WorkingHours = {}
  Array.from(f.days).sort().forEach((d) => { wh[d] = [[f.start, f.end]] })
  return wh
}

export default function BookingClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [pages, setPages] = useState<TeamBookingPage[]>(ws.pages)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)

  const blankForm = (): FormState => ({
    name: '', type: 'round-robin', duration: 30, timezone: ws.team.timezone || 'America/New_York',
    days: new Set(['1', '2', '3', '4', '5']), start: '09:00', end: '17:00',
    buffer_min: 0, min_notice_hours: 4, advance_days: 30, capacity: 10, memberIds: [],
  })

  const editForm = (p: TeamBookingPage): FormState => {
    const wh = p.working_hours && Object.keys(p.working_hours).length ? p.working_hours : DEFAULT_WORKING_HOURS
    const first = Object.values(wh)[0]?.[0]
    return {
      id: p.id, name: p.name, type: p.type, duration: p.duration_min, timezone: p.timezone || ws.team.timezone,
      days: new Set(Object.keys(wh)), start: first?.[0] ?? '09:00', end: first?.[1] ?? '17:00',
      buffer_min: p.buffer_min ?? 0, min_notice_hours: p.min_notice_hours ?? 4,
      advance_days: p.advance_days ?? 30, capacity: p.capacity ?? 10, memberIds: p.member_ids,
    }
  }

  const save = async () => {
    if (!form) return
    const name = form.name.trim()
    if (!name) { toast.error('Give the page a name.'); return }
    if (form.memberIds.length === 0) { toast.error('Pick at least one host.'); return }
    if (form.days.size === 0) { toast.error('Choose at least one available day.'); return }
    if (form.end <= form.start) { toast.error('End time must be after the start time.'); return }

    const duration_min = Math.max(5, Number(form.duration) || 30)
    const working_hours = toWorkingHours(form)
    const capacity = form.type === 'group' ? Math.max(1, Number(form.capacity) || 1) : 1
    const cfg = {
      timezone: form.timezone, working_hours,
      buffer_min: Math.max(0, Number(form.buffer_min) || 0),
      min_notice_hours: Math.max(0, Number(form.min_notice_hours) || 0),
      advance_days: Math.max(1, Number(form.advance_days) || 30),
      capacity,
    }

    // ── Edit an existing page ──
    if (form.id) {
      const patch = { name, type: form.type, member_ids: form.memberIds, duration_min, ...cfg }
      if (ws.live) {
        const { error } = await supabase.from('team_booking_pages').update(patch).eq('id', form.id)
        if (error) { toast.error(error.message ?? 'Could not save changes'); return }
        logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'updated booking page', name, 'booking')
        toast.success('Booking page updated')
      }
      setPages((ps) => ps.map((p) => (p.id === form.id ? { ...p, ...patch } : p)))
      setForm(null)
      return
    }

    // ── Create a new page ──
    const slug = slugify(name)
    const row = { name, slug, type: form.type, member_ids: form.memberIds, duration_min, active: true, description: '', ...cfg }
    if (ws.live) {
      const { data, error } = await supabase.from('team_booking_pages')
        .insert({ team_id: ws.team.id, ...row }).select('id').single()
      if (error || !data) { toast.error(error?.code === '23505' ? 'That link (slug) is already taken.' : error?.message ?? 'Could not create page'); return }
      setPages((ps) => [...ps, { id: data.id, bookings_30d: 0, ...row }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'created booking page', name, 'booking')
      toast.success('Booking page created')
    } else {
      setPages((ps) => [...ps, { id: `p-${Date.now()}`, bookings_30d: 0, ...row }])
    }
    setForm(null)
  }

  const toggle = async (id: string) => {
    const prev = byId(pages, id)?.active
    const next = !prev
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, active: next } : p)))
    if (!ws.live) return
    const { data, error } = await supabase.from('team_booking_pages').update({ active: next }).eq('id', id).select('id')
    if (error || !data?.length) {
      setPages((ps) => ps.map((p) => (p.id === id ? { ...p, active: prev ?? p.active } : p)))
      toast.error(error?.message ?? 'You don’t have permission to change this page.')
    }
  }

  const bookingPath = (slug: string) => `/calendar/team-book/${ws.team.id}/${slug}`
  const copyLink = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    navigator.clipboard?.writeText(`${origin}${bookingPath(slug)}`).catch(() => {})
    setCopied(slug); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <TeamShell workspace={ws} title="Team booking pages"
      subtitle="Public links that book across the team — no more Calendly or Doodle bolted on the side."
      actions={<button onClick={() => setForm(blankForm())} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New page</button>}>

      {/* Type legend */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(Object.keys(TYPE_META) as PageType[]).map((t) => {
          const M = TYPE_META[t]
          return (
            <div key={t} className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <M.icon size={17} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{M.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{M.blurb}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pages */}
      <div className="space-y-3">
        {pages.map((p) => {
          const M = TYPE_META[p.type]
          const activeDays = Object.keys(p.working_hours ?? {}).length
          return (
            <div key={p.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <M.icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{M.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={p.active ? { background: 'rgba(75,122,78,0.15)', color: '#4B7A4E' } : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {p.active ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>

                  <button onClick={() => copyLink(p.slug)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Link2 size={12} /> /calendar/team-book/…/{p.slug}
                    {copied === p.slug ? <Check size={12} style={{ color: 'var(--gold)' }} /> : <Copy size={12} />}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{p.duration_min} min</span>
                    <span>·</span>
                    <span>{p.bookings_30d} bookings / 30d</span>
                    <span>·</span>
                    <span>{activeDays} day{activeDays === 1 ? '' : 's'}/wk · {p.timezone}</span>
                    {p.type === 'group' && (<><span>·</span><span>{p.capacity} seats/slot</span></>)}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      Hosts:
                      <span className="flex -space-x-1.5">
                        {p.member_ids.map((id) => {
                          const m = byId(ws.members, id)
                          return m ? <Avatar key={id} name={m.name} hue={m.hue} size={20} /> : null
                        })}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setForm(editForm(p))}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => toggle(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Power size={13} /> {p.active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / edit dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-lg sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Edit booking page' : 'New booking page'}</h2>
              <button onClick={() => setForm(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} style={inpStyle} placeholder="Talk to Sales" /></Field>

              <Field label="Type">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(TYPE_META) as PageType[]).map((t) => {
                    const on = form.type === t
                    return (
                      <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: 'var(--text-primary)' }}>
                        {TYPE_META[t].label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Duration (min)"><input type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} className={inp} style={inpStyle} /></Field>
                {form.type === 'group'
                  ? <Field label="Seats per slot"><input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} className={inp} style={inpStyle} /></Field>
                  : <Field label="Timezone"><select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={inp} style={inpStyle}>{TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></Field>}
              </div>

              {form.type === 'group' && (
                <Field label="Timezone"><select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={inp} style={inpStyle}>{TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></Field>
              )}

              <Field label="Available days">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(([iso, lbl]) => {
                    const on = form.days.has(iso)
                    return (
                      <button key={iso} type="button"
                        onClick={() => { const d = new Set(form.days); on ? d.delete(iso) : d.add(iso); setForm({ ...form, days: d }) }}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: 'var(--text-primary)' }}>
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Day starts"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inp} style={inpStyle} /></Field>
                <Field label="Day ends"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inp} style={inpStyle} /></Field>
              </div>

              <details className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <summary className="cursor-pointer px-3.5 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Advanced scheduling</summary>
                <div className="grid grid-cols-3 gap-3 p-3.5 pt-0">
                  <Field label="Buffer (min)"><input type="number" min={0} value={form.buffer_min} onChange={(e) => setForm({ ...form, buffer_min: +e.target.value })} className={inp} style={inpStyle} /></Field>
                  <Field label="Min notice (h)"><input type="number" min={0} value={form.min_notice_hours} onChange={(e) => setForm({ ...form, min_notice_hours: +e.target.value })} className={inp} style={inpStyle} /></Field>
                  <Field label="Horizon (days)"><input type="number" min={1} value={form.advance_days} onChange={(e) => setForm({ ...form, advance_days: +e.target.value })} className={inp} style={inpStyle} /></Field>
                </div>
              </details>

              <Field label="Hosts *">
                <div className="flex flex-wrap gap-1.5">
                  {ws.members.filter((m) => m.status === 'active').map((m) => {
                    const on = form.memberIds.includes(m.id)
                    return (
                      <button key={m.id} type="button"
                        onClick={() => setForm({ ...form, memberIds: on ? form.memberIds.filter((id) => id !== m.id) : [...form.memberIds, m.id] })}
                        className="inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs"
                        style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: 'var(--text-primary)' }}>
                        <Avatar name={m.name} hue={m.hue} size={20} /> {m.name}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button onClick={save} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> {form.id ? 'Save changes' : 'Create page'}</button>
                <button onClick={() => setForm(null)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeamShell>
  )
}

const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none'
const inpStyle = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' } as const
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}
