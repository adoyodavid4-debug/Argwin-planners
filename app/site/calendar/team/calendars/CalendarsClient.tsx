'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Eye, EyeOff, Users, Calendar as CalIcon, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type SharedCalendar, TEAM_COLOURS, byId, logTeamAction } from '@/lib/calendar/team'

export default function CalendarsClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [cals, setCals] = useState<SharedCalendar[]>(ws.calendars)
  const [selected, setSelected] = useState<string>(ws.calendars[0]?.id ?? '')
  const [form, setForm] = useState<{ name: string; description: string; colour: string; visibility: SharedCalendar['visibility'] } | null>(null)

  const createCalendar = async () => {
    if (!form) return
    const name = form.name.trim()
    if (!name) { toast.error('Give the calendar a name.'); return }
    const description = form.description.trim()
    const add = (id: string) => {
      setCals((cs) => [...cs, { id, name, colour: form.colour, visibility: form.visibility, member_ids: [], events_week: 0, description }])
      setSelected(id)
    }
    if (ws.live) {
      const { data, error } = await supabase.from('shared_calendars')
        .insert({ team_id: ws.team.id, name, colour: form.colour, visibility: form.visibility, member_ids: [], description })
        .select('id').single()
      if (error || !data) { toast.error(error?.message ?? 'Could not create calendar'); return }
      add(data.id)
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'created shared calendar', name, 'calendar')
      toast.success('Calendar created')
    } else {
      add(`c-${Date.now()}`)
    }
    setForm(null)
  }

  const toggleVisibility = (id: string) => {
    const cur = byId(cals, id)
    const next: SharedCalendar['visibility'] = cur?.visibility === 'full' ? 'busy' : 'full'
    setCals((cs) => cs.map((c) => (c.id === id ? { ...c, visibility: next } : c)))
    if (ws.live) supabase.from('shared_calendars').update({ visibility: next }).eq('id', id).then(({ error }: any) => { if (error) toast.error(error.message) })
  }

  const active = byId(cals, selected)

  return (
    <TeamShell workspace={ws} title="Shared calendars"
      subtitle="Calendars the whole team can see. Choose how much detail each one reveals."
      actions={<button onClick={() => setForm({ name: '', description: '', colour: 'brass', visibility: 'full' })} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New calendar</button>}>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* List */}
        <div className="space-y-2 lg:col-span-1">
          {cals.map((c) => {
            const on = c.id === selected
            const col = TEAM_COLOURS[c.colour] ?? TEAM_COLOURS.brass
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
                style={{ borderColor: on ? 'rgba(var(--gold-rgb),0.5)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.06)' : 'var(--bg-card)' }}>
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: col.dot }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.member_ids.length} members · {c.events_week} events/wk</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {c.visibility === 'full' ? <Eye size={13} /> : <EyeOff size={13} />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {active && (
            <SectionCard title={active.name}
              action={
                <button onClick={() => toggleVisibility(active.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {active.visibility === 'full' ? <><Eye size={13} /> Full details</> : <><EyeOff size={13} /> Busy only</>}
                </button>
              }>
              <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{active.description}</p>

              <div className="mb-5 grid grid-cols-3 gap-3">
                <MiniStat icon={CalIcon} label="Events / week" value={active.events_week} />
                <MiniStat icon={Users} label="Members" value={active.member_ids.length} />
                <MiniStat icon={active.visibility === 'full' ? Eye : EyeOff} label="Sharing" value={active.visibility === 'full' ? 'Full' : 'Busy'} />
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Shared with</p>
              <div className="flex flex-wrap gap-2">
                {active.member_ids.map((id) => {
                  const m = byId(ws.members, id)
                  if (!m) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3" style={{ borderColor: 'var(--border)' }}>
                      <Avatar name={m.name} hue={m.hue} size={22} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                    </span>
                  )
                })}
              </div>

              <div className="mt-5 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {active.visibility === 'full'
                  ? 'Members see event titles, locations and attendees on this calendar.'
                  : 'Members see only busy/free blocks — titles and details stay private.'}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Create dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>New shared calendar</h2>
              <button onClick={() => setForm(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} style={inpStyle} placeholder="Product & Eng" /></Field>
              <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inp + ' resize-none'} style={inpStyle} placeholder="What lives on this calendar." /></Field>
              <Field label="Colour">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(TEAM_COLOURS).map((key) => {
                    const on = form.colour === key
                    return (
                      <button key={key} type="button" onClick={() => setForm({ ...form, colour: key })} aria-label={key}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                        style={{ borderColor: on ? 'var(--gold)' : 'transparent', background: TEAM_COLOURS[key].soft }}>
                        <span className="h-3.5 w-3.5 rounded-full" style={{ background: TEAM_COLOURS[key].dot }} />
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Sharing">
                <div className="flex gap-1.5">
                  {(['full', 'busy'] as const).map((v) => {
                    const on = form.visibility === v
                    return (
                      <button key={v} type="button" onClick={() => setForm({ ...form, visibility: v })}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: 'var(--text-primary)' }}>
                        {v === 'full' ? <><Eye size={13} /> Full details</> : <><EyeOff size={13} /> Busy only</>}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <div className="flex gap-3 pt-2">
                <button onClick={createCalendar} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> Create calendar</button>
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

function MiniStat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
      <Icon size={15} style={{ color: 'var(--gold)' }} />
      <p className="mt-1.5 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
