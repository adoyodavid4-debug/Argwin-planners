'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, Share2, X, Loader2, ImagePlus, Sparkles,
  CalendarHeart, Gift, Users, Mail,
} from 'lucide-react'
import { fmtDateLong } from '@/lib/calendar/fmt'
import {
  MOMENT_TYPES, momentEmoji, momentLabel, ordinal, deriveOccurrence,
  momentAnchorISO, type Moment, type MomentsData, type MomentType, type MomentInvitee,
} from '@/lib/calendar/moments'

const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none'
const inpStyle = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' } as const

type InviteeDraft = { email: string; name: string; notify: boolean }
type Draft = {
  id?: string
  title: string
  type: MomentType
  date: string
  recurring: boolean
  note: string
  imageUrl: string | null
  invitees: InviteeDraft[]
}

const emptyDraft = (): Draft => ({
  title: '', type: 'anniversary', date: '', recurring: true, note: '', imageUrl: null,
  invitees: [{ email: '', name: '', notify: true }],
})

function toDraft(m: Moment): Draft {
  return {
    id: m.id, title: m.title, type: m.type, date: m.date, recurring: m.recurring,
    note: m.note, imageUrl: m.imageUrl,
    invitees: m.invitees.length
      ? m.invitees.map((i) => ({ email: i.email, name: i.name, notify: i.notify }))
      : [{ email: '', name: '', notify: true }],
  }
}

function whenBadge(days: number, occurrenceISO: string, tz: string): { label: string; hot: boolean } {
  if (days === 0) return { label: 'Today 🎉', hot: true }
  if (days === 1) return { label: 'Tomorrow', hot: true }
  if (days > 1 && days <= 30) return { label: `in ${days} days`, hot: days <= 7 }
  if (days < 0) return { label: `was ${fmtDateLong(momentAnchorISO(occurrenceISO), tz)}`, hot: false }
  return { label: fmtDateLong(momentAnchorISO(occurrenceISO), tz), hot: false }
}

export default function MomentsManager({ initial }: { initial: MomentsData }) {
  const router = useRouter()
  const { moments, timezone } = initial

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(0) // increment to re-trigger burst
  const fileRef = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => {
    const upcoming = moments.filter((m) => m.daysUntil >= 0)
    const next = upcoming[0]
    const shared = moments.filter((m) => m.invitees.length > 0).length
    return { total: moments.length, next, shared }
  }, [moments])

  const popConfetti = () => setConfetti((n) => n + 1)

  const post = async (payload: any) => {
    const res = await fetch('/api/calendar/moments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Something went wrong.')
    return json
  }

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) return toast.error('Give this moment a title.')
    if (!draft.date) return toast.error('Pick the date it happened.')
    setSaving(true)
    try {
      const invitees = draft.invitees
        .map((i) => ({ email: i.email.trim(), name: i.name.trim(), notify: i.notify }))
        .filter((i) => i.email)
      await post({
        action: draft.id ? 'update' : 'create',
        id: draft.id, title: draft.title, type: draft.type, date: draft.date,
        recurring: draft.recurring, note: draft.note, imageUrl: draft.imageUrl, invitees,
      })
      toast.success(draft.id ? 'Moment updated' : 'Moment saved 🎉')
      popConfetti()
      setDraft(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (m: Moment) => {
    if (!confirm(`Delete “${m.title}”? This can't be undone.`)) return
    setDeletingId(m.id)
    try {
      await post({ action: 'delete', id: m.id })
      toast.success('Moment deleted')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const share = async (m: Moment) => {
    if (!m.invitees.length) return toast.error('Add people to this moment first, then share.')
    setSharingId(m.id)
    try {
      const { sent, total } = await post({ action: 'share', id: m.id })
      toast.success(`Sent to ${sent}/${total} ${total === 1 ? 'person' : 'people'} 🎈`)
      popConfetti()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSharingId(null)
    }
  }

  const onPickFile = async (file: File) => {
    if (!draft) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/calendar/moments/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Upload failed.')
      setDraft({ ...draft, imageUrl: json.url })
      toast.success('Photo added')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <ConfettiBurst trigger={confetti} />

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Moments saved" value={stats.total} hint="Dates you're tracking" />
        <Stat
          label="Next up"
          value={stats.next ? whenBadge(stats.next.daysUntil, stats.next.nextOccurrenceISO, timezone).label : '—'}
          hint={stats.next ? stats.next.title : 'Add your first moment'}
        />
        <Stat label="Shared with people" value={stats.shared} hint="Moments with invitees" />
      </div>

      {/* Header + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Keep the dates that matter — anniversaries, birthdays, milestones — and celebrate them with the people you love.
        </p>
        <button onClick={() => setDraft(emptyDraft())} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={16} /> Add a moment
        </button>
      </div>

      {/* List */}
      {moments.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <CalendarHeart size={30} className="mx-auto" style={{ color: 'var(--gold)' }} />
          <h3 className="mt-3 font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No moments yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Add the important dates in your life. On each anniversary we'll email you — and anyone you invite — a celebration with balloons and confetti.
          </p>
          <button onClick={() => setDraft(emptyDraft())} className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} /> Add your first moment
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {moments.map((m) => {
            const badge = whenBadge(m.daysUntil, m.nextOccurrenceISO, timezone)
            return (
              <div key={m.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                {m.imageUrl && (
                  <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(${m.imageUrl})` }} />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{momentEmoji(m.type)}</span>
                        <h3 className="truncate font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{m.title}</h3>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {momentLabel(m.type)} · {fmtDateLong(momentAnchorISO(m.date), timezone)}
                        {m.recurring && m.yearsAtNext > 0 && <> · turning {ordinal(m.yearsAtNext)}</>}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={badge.hot
                        ? { background: 'rgba(var(--gold-rgb),0.15)', color: 'var(--gold-dark)' }
                        : { background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                      {badge.label}
                    </span>
                  </div>

                  {m.note && <p className="mt-3 line-clamp-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{m.note}</p>}

                  <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Users size={13} />
                    {m.invitees.length ? `Shared with ${m.invitees.length} ${m.invitees.length === 1 ? 'person' : 'people'}` : 'Not shared yet'}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => share(m)} disabled={sharingId === m.id || !m.invitees.length}
                      className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
                      title={m.invitees.length ? 'Email this memory now' : 'Add invitees first'}>
                      {sharingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Share now
                    </button>
                    <button onClick={() => setDraft(toDraft(m))} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => remove(m)} disabled={deletingId === m.id}
                      className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50" style={{ color: '#B4664A' }}>
                      {deletingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {draft && (
        <MomentDialog
          draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={save}
          saving={saving} uploading={uploading} onPickFile={onPickFile} fileRef={fileRef} timezone={timezone}
        />
      )}
    </div>
  )
}

// ── Dialog ────────────────────────────────────────────────────
function MomentDialog({
  draft, setDraft, onClose, onSave, saving, uploading, onPickFile, fileRef, timezone,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
  uploading: boolean
  onPickFile: (f: File) => void
  fileRef: React.RefObject<HTMLInputElement>
  timezone: string
}) {
  const preview = draft.date ? deriveOccurrence(draft.date, draft.recurring) : null
  const setInvitee = (i: number, patch: Partial<InviteeDraft>) => {
    const next = draft.invitees.slice()
    next[i] = { ...next[i], ...patch }
    setDraft({ ...draft, invitees: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 my-4 w-full max-w-2xl rounded-2xl border shadow-xl"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {draft.id ? 'Edit moment' : 'Add a moment'}
          </h2>
          <button onClick={onClose} className="btn-ghost"><X size={18} /></button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          {/* Left: fields */}
          <div className="space-y-4">
            <Field label="What are we celebrating?">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Our wedding anniversary" className={inp} style={inpStyle} maxLength={120} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as MomentType })} className={inp} style={inpStyle}>
                  {MOMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inp} style={inpStyle} />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <MiniSwitch on={draft.recurring} onClick={() => setDraft({ ...draft, recurring: !draft.recurring })} />
              Celebrate every year on this date
            </label>

            <Field label="A note or memory (optional)">
              <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={3}
                placeholder="The day everything began…" className={`${inp} resize-none`} style={inpStyle} maxLength={2000} />
            </Field>

            <Field label="Photo (optional)">
              {draft.imageUrl ? (
                <div className="relative">
                  <img src={draft.imageUrl} alt="" className="h-32 w-full rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
                  <button onClick={() => setDraft({ ...draft, imageUrl: null })}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"><X size={14} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-sm disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><ImagePlus size={16} /> Add a photo</>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f) }} />
            </Field>
          </div>

          {/* Right: invitees + preview */}
          <div className="space-y-4">
            <Field label="Share with (invitees)">
              <div className="space-y-2">
                {draft.invitees.map((inv, i) => (
                  <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <input value={inv.email} onChange={(e) => setInvitee(i, { email: e.target.value })}
                        placeholder="name@email.com" type="email" className={`${inp} flex-1 !py-1.5 text-sm`} style={inpStyle} />
                      <button onClick={() => setDraft({ ...draft, invitees: draft.invitees.filter((_, j) => j !== i) })}
                        className="btn-ghost !p-1.5" aria-label="Remove"><X size={14} /></button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input value={inv.name} onChange={(e) => setInvitee(i, { name: e.target.value })}
                        placeholder="Name (optional)" className={`${inp} flex-1 !py-1.5 text-sm`} style={inpStyle} />
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <MiniSwitch on={inv.notify} onClick={() => setInvitee(i, { notify: !inv.notify })} /> yearly
                      </label>
                    </div>
                  </div>
                ))}
                <button onClick={() => setDraft({ ...draft, invitees: [...draft.invitees, { email: '', name: '', notify: true }] })}
                  className="btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                  <Plus size={13} /> Add another person
                </button>
              </div>
            </Field>

            {/* Live email preview */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <Mail size={12} /> Anniversary email preview
              </p>
              <EmailPreview draft={draft} years={preview?.years ?? 0} timezone={timezone} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {draft.id ? 'Save changes' : 'Save moment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// A compact, festive mirror of the celebratory email the recipient will get.
function EmailPreview({ draft, years, timezone }: { draft: Draft; years: number; timezone: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
      <div className="relative overflow-hidden px-4 py-5" style={{ background: 'linear-gradient(135deg,#FBF3D9 0%,#F4E2A8 45%,#E9CE7A 100%)' }}>
        <div className="pointer-events-none absolute inset-0">
          {['#C9A84C', '#E86A6A', '#4C9AC9', '#7BC96F', '#B47BE8', '#E8B24C'].map((c, i) => (
            <span key={i} className="absolute block h-1.5 w-1.5 rounded-sm opacity-80"
              style={{ left: `${8 + i * 15}%`, top: `${10 + (i % 3) * 22}%`, background: c }} />
          ))}
        </div>
        <div className="text-2xl">🎈🎈🎈</div>
        <p className="mt-1 text-[9px] font-bold tracking-widest" style={{ color: '#8A6D12' }}>A MOMENT TO CELEBRATE</p>
        <p className="mt-1 font-display text-base font-semibold" style={{ color: '#1A1820' }}>
          {momentEmoji(draft.type)} {draft.title || 'Your moment'}
        </p>
        <span className="mt-2 inline-block rounded-full bg-white px-3 py-0.5 text-[11px] font-semibold" style={{ color: '#8A6D12', border: '1px solid #E9CE7A' }}>
          {years > 0 ? `${ordinal(years)} ${momentLabel(draft.type).toLowerCase()} 🎉` : 'Today 🎉'}
        </span>
      </div>
      <div className="px-4 py-3">
        {draft.date && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>🗓️ {fmtDateLong(momentAnchorISO(draft.date), timezone)}</p>}
        {draft.note && <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{draft.note}</p>}
        <p className="mt-2 text-base">🎉✨🎊✨🎉</p>
      </div>
    </div>
  )
}

// ── Small shared bits (shell-agnostic so both Plus & Teams can render it) ──────
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
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

function MiniSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} role="switch" aria-checked={on}
      className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors"
      style={{ background: on ? 'var(--gold)' : 'var(--border)' }}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: on ? '18px' : '2px' }} />
    </button>
  )
}

// Confetti burst overlay — re-fires whenever `trigger` changes.
function ConfettiBurst({ trigger }: { trigger: number }) {
  if (!trigger) return null
  const colours = ['#C9A84C', '#E86A6A', '#4C9AC9', '#7BC96F', '#B47BE8', '#E8B24C', '#E86AB0']
  return (
    <div key={trigger} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: 44 }).map((_, i) => {
        const c = colours[i % colours.length]
        const left = (i * 97) % 100
        const delay = (i % 10) * 0.05
        const dur = 1 + (i % 6) * 0.18
        const size = 6 + (i % 4) * 3
        return (
          <span key={i} className="cf-pop absolute block rounded-sm"
            style={{ left: `${left}%`, top: '-16px', width: size, height: size, background: c, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        )
      })}
      <style>{`
        @keyframes cf-pop-fall { 0% { transform: translateY(-16px) rotate(0); opacity: 1 } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0 } }
        .cf-pop { animation-name: cf-pop-fall; animation-timing-function: cubic-bezier(.3,.7,.4,1); animation-fill-mode: forwards; }
      `}</style>
    </div>
  )
}
