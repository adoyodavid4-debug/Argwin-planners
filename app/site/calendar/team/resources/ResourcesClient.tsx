'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { DoorOpen, Monitor, Armchair, Car, Plus, Check, X, MapPin, Users, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard } from '../TeamShell'
import { type TeamWorkspace, type Resource, type ResourceBooking, type ResourceType, TEAM_COLOURS, byId, memberName, logTeamAction } from '@/lib/calendar/team'

const TYPE_ICON: Record<ResourceType, typeof DoorOpen> = { room: DoorOpen, equipment: Monitor, desk: Armchair, vehicle: Car }
const TYPE_LABEL: Record<ResourceType, string> = { room: 'Room', equipment: 'Equipment', desk: 'Desk', vehicle: 'Vehicle' }
const fmtWhen = (iso: string, tz?: string) => {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz || 'America/New_York' }).format(new Date(iso))
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export default function ResourcesClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [allResources, setAllResources] = useState<Resource[]>(ws.resources)
  const [bookings, setBookings] = useState<ResourceBooking[]>(ws.resourceBookings)
  const [filter, setFilter] = useState<ResourceType | 'all'>('all')
  const [resForm, setResForm] = useState<{ name: string; type: ResourceType; capacity: number; location: string; requires_approval: boolean } | null>(null)
  const [bookForm, setBookForm] = useState<{ resource: Resource; title: string; date: string; time: string; duration: number } | null>(null)

  const addResource = async () => {
    if (!resForm) return
    const name = resForm.name.trim()
    if (!name) { toast.error('Give the resource a name.'); return }
    const colours = Object.keys(TEAM_COLOURS)
    const base = {
      name, type: resForm.type, capacity: Math.max(1, Number(resForm.capacity) || 1),
      location: resForm.location.trim(), requires_approval: resForm.requires_approval,
      colour: colours[allResources.length % colours.length], amenities: [] as string[],
    }
    if (ws.live) {
      const { data, error } = await supabase.from('team_resources').insert({ team_id: ws.team.id, ...base }).select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Could not add resource'); return }
      setAllResources((rs) => [...rs, { id: data.id, ...base }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'added resource', name, 'resource')
      toast.success('Resource added')
    } else {
      setAllResources((rs) => [...rs, { id: `r-${Date.now()}`, ...base }])
    }
    setResForm(null)
  }

  const book = async () => {
    if (!bookForm) return
    const title = bookForm.title.trim()
    if (!title || !bookForm.date || !bookForm.time) { toast.error('Add a title, date and time.'); return }
    const start_at = `${bookForm.date}T${bookForm.time}:00`
    const startMs = new Date(start_at).getTime()
    if (Number.isNaN(startMs)) { toast.error('That date and time doesn’t look right.'); return }
    const e = new Date(startMs + Math.max(5, Number(bookForm.duration) || 30) * 60000)
    const end_at = `${e.getFullYear()}-${pad2(e.getMonth() + 1)}-${pad2(e.getDate())}T${pad2(e.getHours())}:${pad2(e.getMinutes())}:00`
    const status: ResourceBooking['status'] = bookForm.resource.requires_approval ? 'pending' : 'approved'
    const base = { resource_id: bookForm.resource.id, title, requester_id: ws.currentMemberId, start_at, end_at, status }
    if (ws.live) {
      const { data, error } = await supabase.from('resource_bookings').insert({ team_id: ws.team.id, ...base }).select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Could not book'); return }
      setBookings((bs) => [...bs, { id: data.id, ...base }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId,
        status === 'pending' ? 'requested resource' : 'booked resource', `${bookForm.resource.name} — ${title}`, 'booking')
      toast.success(status === 'pending' ? 'Request sent for approval' : 'Booked')
    } else {
      setBookings((bs) => [...bs, { id: `rb-${Date.now()}`, ...base }])
      toast.success(status === 'pending' ? 'Request sent for approval' : 'Booked')
    }
    setBookForm(null)
  }

  const decide = async (id: string, status: 'approved' | 'declined') => {
    const b = byId(bookings, id)
    const prevStatus = b?.status
    setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status } : x)))
    if (!ws.live) return
    const { data, error } = await supabase.from('resource_bookings').update({ status }).eq('id', id).select('id')
    if (error || !data?.length) {
      setBookings((bs) => bs.map((x) => (x.id === id ? { ...x, status: (prevStatus ?? x.status) as ResourceBooking['status'] } : x)))
      toast.error(error?.message ?? 'You don’t have permission to decide this request.')
      return
    }
    const resName = byId(allResources, b?.resource_id ?? '')?.name ?? 'Resource'
    logTeamAction(supabase, ws.team.id, ws.currentMemberId, status === 'approved' ? 'approved room request' : 'declined room request', `${resName} — ${b?.title ?? ''}`, 'resource')
  }

  const pending = bookings.filter((b) => b.status === 'pending')
  const resources = allResources.filter((r) => filter === 'all' || r.type === filter)
  const types: (ResourceType | 'all')[] = ['all', 'room', 'equipment', 'desk', 'vehicle']

  return (
    <TeamShell workspace={ws} title="Rooms & resources"
      subtitle="Bookable rooms, equipment and vehicles — with approval workflows where you need control."
      actions={<button onClick={() => setResForm({ name: '', type: 'room', capacity: 4, location: '', requires_approval: false })} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> Add resource</button>}>

      {/* Approval queue */}
      <SectionCard title={`Approval queue · ${pending.length}`}>
        {pending.length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No requests waiting on you.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((b) => {
              const res = byId(allResources, b.resource_id)
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
                  <ShieldAlert size={16} style={{ color: 'var(--gold)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{res?.name} · {memberName(ws.members, b.requester_id)} · {fmtWhen(b.start_at, ws.team.timezone)}</p>
                  </div>
                  <button onClick={() => decide(b.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'var(--gold)' }}><Check size={13} /> Approve</button>
                  <button onClick={() => decide(b.id, 'declined')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}><X size={13} /> Decline</button>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Filter */}
      <div className="my-6 flex flex-wrap gap-2">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className="rounded-full border px-3 py-1.5 text-xs font-medium capitalize"
            style={filter === t ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {t === 'all' ? 'All' : TYPE_LABEL[t as ResourceType]}
          </button>
        ))}
      </div>

      {/* Resource grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => {
          const Icon = TYPE_ICON[r.type]
          const col = TEAM_COLOURS[r.colour] ?? TEAM_COLOURS.brass
          const upcoming = bookings.filter((b) => b.resource_id === r.id && b.status === 'approved').length
          return (
            <div key={r.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: col.soft }}>
                  <Icon size={20} style={{ color: col.dot }} />
                </div>
                {r.requires_approval && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>Approval</span>
                )}
              </div>
              <p className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><MapPin size={12} /> {r.location}</p>
              <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="inline-flex items-center gap-1"><Users size={12} /> {r.capacity}</span>
                <span>·</span>
                <span>{TYPE_LABEL[r.type]}</span>
                {upcoming > 0 && <><span>·</span><span>{upcoming} booked</span></>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.amenities.map((a) => (
                  <span key={a} className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{a}</span>
                ))}
              </div>
              <button onClick={() => setBookForm({ resource: r, title: '', date: new Intl.DateTimeFormat('en-CA', { timeZone: ws.team.timezone }).format(new Date()), time: '09:00', duration: 60 })}
                className="btn-outline mt-4 w-full justify-center py-2 text-sm">Book</button>
            </div>
          )
        })}
      </div>

      {/* Add-resource dialog */}
      {resForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setResForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Add resource</h2>
              <button onClick={() => setResForm(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name *"><input value={resForm.name} onChange={(e) => setResForm({ ...resForm, name: e.target.value })} className={inp} style={inpStyle} placeholder="New York · Boardroom" /></Field>
              <Field label="Type">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(TYPE_LABEL) as ResourceType[]).map((t) => {
                    const on = resForm.type === t
                    return (
                      <button key={t} type="button" onClick={() => setResForm({ ...resForm, type: t })}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: 'var(--text-primary)' }}>
                        {TYPE_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity"><input type="number" min={1} value={resForm.capacity} onChange={(e) => setResForm({ ...resForm, capacity: +e.target.value })} className={inp} style={inpStyle} /></Field>
                <Field label="Location"><input value={resForm.location} onChange={(e) => setResForm({ ...resForm, location: e.target.value })} className={inp} style={inpStyle} placeholder="HQ, 4th floor" /></Field>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={resForm.requires_approval} onChange={(e) => setResForm({ ...resForm, requires_approval: e.target.checked })} /> Bookings need approval
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={addResource} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> Add resource</button>
                <button onClick={() => setResForm(null)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book dialog */}
      {bookForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setBookForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Book {bookForm.resource.name}</h2>
              <button onClick={() => setBookForm(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Title *"><input value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} className={inp} style={inpStyle} placeholder="Board prep" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><input type="date" value={bookForm.date} onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })} className={inp} style={inpStyle} /></Field>
                <Field label="Start"><input type="time" value={bookForm.time} onChange={(e) => setBookForm({ ...bookForm, time: e.target.value })} className={inp} style={inpStyle} /></Field>
              </div>
              <Field label="Duration (min)"><input type="number" min={5} step={5} value={bookForm.duration} onChange={(e) => setBookForm({ ...bookForm, duration: +e.target.value })} className={inp} style={inpStyle} /></Field>
              {bookForm.resource.requires_approval && (
                <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><ShieldAlert size={13} style={{ color: 'var(--gold)' }} /> This resource needs approval — your request goes to the queue.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={book} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> {bookForm.resource.requires_approval ? 'Request booking' : 'Book'}</button>
                <button onClick={() => setBookForm(null)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
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
