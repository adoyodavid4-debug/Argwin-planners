'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Users, Repeat, UsersRound, Link2, Copy, Check, Power, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type TeamBookingPage, type PageType, byId, logTeamAction } from '@/lib/calendar/team'

const TYPE_META: Record<PageType, { icon: typeof Repeat; label: string; blurb: string }> = {
  'round-robin': { icon: Repeat, label: 'Round-robin', blurb: 'Distributes bookings evenly across the team.' },
  collective:    { icon: Users, label: 'Collective', blurb: 'Books only when every host is free.' },
  group:         { icon: UsersRound, label: 'Group', blurb: 'Many invitees, one shared slot.' },
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

export default function BookingClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [pages, setPages] = useState<TeamBookingPage[]>(ws.pages)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; type: PageType; duration: number; memberIds: string[] } | null>(null)

  const createPage = async () => {
    if (!form) return
    const name = form.name.trim()
    if (!name) { toast.error('Give the page a name.'); return }
    if (form.memberIds.length === 0) { toast.error('Pick at least one host.'); return }
    const slug = slugify(name)
    const duration_min = Math.max(5, Number(form.duration) || 30)
    if (ws.live) {
      const { data, error } = await supabase.from('team_booking_pages')
        .insert({ team_id: ws.team.id, name, slug, type: form.type, member_ids: form.memberIds, duration_min, active: true, description: '' })
        .select('id').single()
      if (error || !data) { toast.error(error?.code === '23505' ? 'That link (slug) is already taken.' : error?.message ?? 'Could not create page'); return }
      setPages((ps) => [...ps, { id: data.id, name, slug, type: form.type, member_ids: form.memberIds, duration_min, bookings_30d: 0, active: true, description: '' }])
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'created booking page', name, 'booking')
      toast.success('Booking page created')
    } else {
      setPages((ps) => [...ps, { id: `p-${Date.now()}`, name, slug, type: form.type, member_ids: form.memberIds, duration_min, bookings_30d: 0, active: true, description: '' }])
    }
    setForm(null)
  }

  const toggle = (id: string) => {
    const next = !(byId(pages, id)?.active)
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, active: next } : p)))
    if (ws.live) supabase.from('team_booking_pages').update({ active: next }).eq('id', id).then(({ error }: any) => { if (error) toast.error(error.message) })
  }
  const copyLink = (slug: string) => {
    const url = `arwign.com/t/${ws.team.id === 'team-sample' ? 'arwign' : ws.team.id}/${slug}`
    navigator.clipboard?.writeText(`https://${url}`).catch(() => {})
    setCopied(slug); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <TeamShell workspace={ws} title="Team booking pages"
      subtitle="Public links that book across the team — no more Calendly or Doodle bolted on the side."
      actions={<button onClick={() => setForm({ name: '', type: 'round-robin', duration: 30, memberIds: [] })} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New page</button>}>

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
                    <Link2 size={12} /> arwign.com/t/arwign/{p.slug}
                    {copied === p.slug ? <Check size={12} style={{ color: 'var(--gold)' }} /> : <Copy size={12} />}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{p.duration_min} min</span>
                    <span>·</span>
                    <span>{p.bookings_30d} bookings / 30d</span>
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

                <button onClick={() => toggle(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <Power size={13} /> {p.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>New booking page</h2>
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
              <Field label="Duration (min)"><input type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} className={inp} style={inpStyle} /></Field>
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
                <button onClick={createPage} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> Create page</button>
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
