'use client'
import { useState } from 'react'
import { DoorOpen, Monitor, Armchair, Car, Plus, Check, X, MapPin, Users, ShieldAlert } from 'lucide-react'
import TeamShell, { SectionCard } from '../TeamShell'
import { type TeamWorkspace, type Resource, type ResourceBooking, type ResourceType, TEAM_COLOURS, byId, memberName } from '@/lib/calendar/team'

const TYPE_ICON: Record<ResourceType, typeof DoorOpen> = { room: DoorOpen, equipment: Monitor, desk: Armchair, vehicle: Car }
const TYPE_LABEL: Record<ResourceType, string> = { room: 'Room', equipment: 'Equipment', desk: 'Desk', vehicle: 'Vehicle' }
const fmtWhen = (iso: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))

export default function ResourcesClient({ ws }: { ws: TeamWorkspace }) {
  const [bookings, setBookings] = useState<ResourceBooking[]>(ws.resourceBookings)
  const [filter, setFilter] = useState<ResourceType | 'all'>('all')

  const decide = (id: string, status: 'approved' | 'declined') =>
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)))

  const pending = bookings.filter((b) => b.status === 'pending')
  const resources = ws.resources.filter((r) => filter === 'all' || r.type === filter)
  const types: (ResourceType | 'all')[] = ['all', 'room', 'equipment', 'desk', 'vehicle']

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Rooms & resources"
      subtitle="Bookable rooms, equipment and vehicles — with approval workflows where you need control."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> Add resource</button>}>

      {/* Approval queue */}
      <SectionCard title={`Approval queue · ${pending.length}`}>
        {pending.length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No requests waiting on you.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((b) => {
              const res = byId(ws.resources, b.resource_id)
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
                  <ShieldAlert size={16} style={{ color: 'var(--gold)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{res?.name} · {memberName(ws.members, b.requester_id)} · {fmtWhen(b.start_at)}</p>
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
              <button className="btn-outline mt-4 w-full justify-center py-2 text-sm">Book</button>
            </div>
          )
        })}
      </div>
    </TeamShell>
  )
}
