'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, X, Loader2, CalendarPlus, LayoutTemplate, Clock, Users, Video, Timer,
} from 'lucide-react'
import {
  TEMPLATE_COLOURS, CONFERENCING_OPTIONS, conferencingLabel,
  type EventTemplate, type TemplatesData,
} from '@/lib/calendar/templates'

const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none'
const inpStyle = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' } as const

const COLOUR_HEX: Record<string, string> = {
  brass: '#C79A3E', sage: '#6E8B7A', ocean: '#4C7C9B', clay: '#B4664A',
  lavender: '#8B7BB4', honey: '#D9A441', forest: '#3E7A5B', rose: '#B15B7E',
}

type Draft = {
  id?: string; name: string; title: string; description: string; durationMin: number
  colour: string; eventType: string; location: string; conferencing: string
  attendees: string; bufferBeforeMin: number; bufferAfterMin: number
}
const emptyDraft = (): Draft => ({
  name: '', title: '', description: '', durationMin: 30, colour: 'brass', eventType: '',
  location: '', conferencing: '', attendees: '', bufferBeforeMin: 0, bufferAfterMin: 0,
})
const toDraft = (t: EventTemplate): Draft => ({
  id: t.id, name: t.name, title: t.title, description: t.description, durationMin: t.durationMin,
  colour: t.colour, eventType: t.eventType ?? '', location: t.location, conferencing: t.conferencing,
  attendees: t.attendees.join(', '), bufferBeforeMin: t.bufferBeforeMin, bufferAfterMin: t.bufferAfterMin,
})

export default function TemplatesManager({ initial }: { initial: TemplatesData }) {
  const router = useRouter()
  const { templates } = initial
  const [draft, setDraft] = useState<Draft | null>(null)
  const [applying, setApplying] = useState<EventTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const post = async (payload: any) => {
    const res = await fetch('/api/calendar/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Something went wrong.')
    return json
  }

  const save = async () => {
    if (!draft) return
    if (!draft.name.trim()) return toast.error('Name the template.')
    if (!draft.title.trim()) return toast.error('The event needs a title.')
    setSaving(true)
    try {
      await post({
        action: draft.id ? 'update' : 'create', id: draft.id,
        name: draft.name, title: draft.title, description: draft.description, durationMin: draft.durationMin,
        colour: draft.colour, eventType: draft.eventType, location: draft.location, conferencing: draft.conferencing,
        attendees: draft.attendees.split(',').map((s) => s.trim()).filter(Boolean),
        bufferBeforeMin: draft.bufferBeforeMin, bufferAfterMin: draft.bufferAfterMin,
      })
      toast.success(draft.id ? 'Template updated' : 'Template saved')
      setDraft(null); router.refresh()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async (t: EventTemplate) => {
    if (!confirm(`Delete the “${t.name}” template?`)) return
    try { await post({ action: 'delete', id: t.id }); toast.success('Template deleted'); router.refresh() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Save the meetings you set up again and again — duration, colour, agenda, attendees, conferencing and buffers — then drop them onto your calendar in one click.
        </p>
        <button onClick={() => setDraft(emptyDraft())} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={16} /> New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <LayoutTemplate size={30} className="mx-auto" style={{ color: 'var(--gold)' }} />
          <h3 className="mt-3 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No templates yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Create a blueprint like “Weekly 1:1” or “Client kickoff” and reuse it whenever you schedule.
          </p>
          <button onClick={() => setDraft(emptyDraft())} className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} /> Create your first template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: COLOUR_HEX[t.colour] ?? '#C79A3E' }} />
                    <h3 className="truncate font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</h3>
                  </div>
                  <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>Creates “{t.title}”</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="inline-flex items-center gap-1"><Clock size={13} /> {t.durationMin} min</span>
                {(t.bufferBeforeMin > 0 || t.bufferAfterMin > 0) && <span className="inline-flex items-center gap-1"><Timer size={13} /> +{t.bufferBeforeMin}/{t.bufferAfterMin}m buffer</span>}
                {t.conferencing && <span className="inline-flex items-center gap-1"><Video size={13} /> {conferencingLabel(t.conferencing)}</span>}
                {t.attendees.length > 0 && <span className="inline-flex items-center gap-1"><Users size={13} /> {t.attendees.length}</span>}
              </div>
              {t.description && <p className="mt-3 line-clamp-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => setApplying(t)} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                  <CalendarPlus size={13} /> Use template
                </button>
                <button onClick={() => setDraft(toDraft(t))} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => remove(t)} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ color: '#B4664A' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && <TemplateDialog draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={save} saving={saving} />}
      {applying && <ApplyDialog template={applying} onClose={() => setApplying(null)} onApplied={() => { setApplying(null); router.refresh() }} post={post} />}
    </div>
  )
}

function TemplateDialog({ draft, setDraft, onClose, onSave, saving }: {
  draft: Draft; setDraft: (d: Draft) => void; onClose: () => void; onSave: () => void; saving: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 my-4 w-full max-w-lg rounded-2xl border shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{draft.id ? 'Edit template' : 'New template'}</h2>
          <button onClick={onClose} className="btn-ghost"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Template name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Weekly 1:1" className={inp} style={inpStyle} /></Field>
            <Field label="Duration (min)"><input type="number" min={5} max={1440} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: +e.target.value })} className={inp} style={inpStyle} /></Field>
          </div>
          <Field label="Event title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="1:1 with —" className={inp} style={inpStyle} /></Field>
          <Field label="Colour">
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_COLOURS.map((c) => (
                <button key={c} type="button" onClick={() => setDraft({ ...draft, colour: c })} aria-label={c}
                  className="h-7 w-7 rounded-full border-2 transition-transform" style={{ background: COLOUR_HEX[c], borderColor: draft.colour === c ? 'var(--text-primary)' : 'transparent', transform: draft.colour === c ? 'scale(1.1)' : 'none' }} />
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Optional" className={inp} style={inpStyle} /></Field>
            <Field label="Conferencing">
              <select value={draft.conferencing} onChange={(e) => setDraft({ ...draft, conferencing: e.target.value })} className={inp} style={inpStyle}>
                {CONFERENCING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buffer before (min)"><input type="number" min={0} max={240} value={draft.bufferBeforeMin} onChange={(e) => setDraft({ ...draft, bufferBeforeMin: +e.target.value })} className={inp} style={inpStyle} /></Field>
            <Field label="Buffer after (min)"><input type="number" min={0} max={240} value={draft.bufferAfterMin} onChange={(e) => setDraft({ ...draft, bufferAfterMin: +e.target.value })} className={inp} style={inpStyle} /></Field>
          </div>
          <Field label="Attendees (comma-separated emails)"><input value={draft.attendees} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} placeholder="alex@team.com, sam@team.com" className={inp} style={inpStyle} /></Field>
          <Field label="Agenda / notes"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} placeholder="Standing agenda for this meeting…" className={`${inp} resize-none`} style={inpStyle} /></Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <LayoutTemplate size={15} />} {draft.id ? 'Save changes' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplyDialog({ template, onClose, onApplied, post }: {
  template: EventTemplate; onClose: () => void; onApplied: () => void; post: (p: any) => Promise<any>
}) {
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)
  const apply = async () => {
    if (!when) return toast.error('Pick a date and time.')
    setBusy(true)
    try {
      const { message } = await post({ action: 'apply', id: template.id, startISO: new Date(when).toISOString() })
      toast.success(message || 'Added to your calendar')
      onApplied()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Use “{template.name}”</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Creates “{template.title}” ({template.durationMin} min){template.bufferBeforeMin || template.bufferAfterMin ? ' with buffers' : ''} at the time you pick.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Start</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inp} style={inpStyle} />
        </label>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={apply} disabled={busy} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />} Add to calendar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  )
}
