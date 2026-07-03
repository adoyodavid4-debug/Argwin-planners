'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import toast from 'react-hot-toast'

// Matches the zod schemas in /api/admin/sequences (steps use i18n records;
// this form edits the 'en' locale).
export interface SequenceStep {
  id?: string
  step_order: number
  delay_hours: number
  template_key: string
  subject_i18n: Record<string, string>
  body_i18n: Record<string, string>
  cta_i18n: Record<string, string>
}

export interface SequenceData {
  id?: string
  slug: string
  name: string
  trigger: 'on_confirm' | 'on_tag'
  is_active: boolean
  email_sequence_steps?: SequenceStep[]
}

const TRIGGERS = [
  { value: 'on_confirm', label: 'On subscription confirm' },
  { value: 'on_tag',     label: 'On tag applied' },
]

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
      {children}
    </p>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-300"
      style={{ background: value ? 'var(--gold)' : 'var(--border)' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: value ? '22px' : '2px' }} />
    </button>
  )
}

interface StepState {
  delay_hours: string
  template_key: string
  subject: string
  body: string
  cta: string
  // Preserve non-'en' locales so editing doesn't wipe translations
  subject_i18n: Record<string, string>
  body_i18n: Record<string, string>
  cta_i18n: Record<string, string>
}

export default function SequenceForm({ sequence }: { sequence?: SequenceData }) {
  const router = useRouter()
  const isEdit = !!sequence?.id

  const [name,       setName]       = useState(sequence?.name ?? '')
  const [slug,       setSlug]       = useState(sequence?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const [trigger,    setTrigger]    = useState<'on_confirm' | 'on_tag'>(sequence?.trigger ?? 'on_confirm')
  const [isActive,   setIsActive]   = useState(sequence?.is_active ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const initialSteps: StepState[] = (sequence?.email_sequence_steps ?? [])
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({
      delay_hours:  String(s.delay_hours ?? 0),
      template_key: s.template_key ?? '',
      subject:      s.subject_i18n?.en ?? '',
      body:         s.body_i18n?.en ?? '',
      cta:          s.cta_i18n?.en ?? '',
      subject_i18n: s.subject_i18n ?? {},
      body_i18n:    s.body_i18n ?? {},
      cta_i18n:     s.cta_i18n ?? {},
    }))

  const [steps, setSteps] = useState<StepState[]>(initialSteps)

  const addStep = () =>
    setSteps((p) => [...p, {
      delay_hours: '0', template_key: '', subject: '', body: '', cta: '',
      subject_i18n: {}, body_i18n: {}, cta_i18n: {},
    }])

  const updateStep = (i: number, patch: Partial<StepState>) =>
    setSteps((p) => p.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const removeStep = (i: number) =>
    setSteps((p) => p.filter((_, j) => j !== i))

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    setSteps((p) => {
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    const finalSlug = slug.trim() || slugify(name)
    if (!finalSlug)  { toast.error('Slug is required'); return }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].template_key.trim()) {
        toast.error(`Step ${i + 1} needs a template key`)
        return
      }
    }

    setSubmitting(true)
    const payload = {
      name:      name.trim(),
      trigger,
      is_active: isActive,
      ...(isEdit ? {} : { slug: finalSlug }),
      steps: steps.map((s, i) => ({
        step_order:   i,
        delay_hours:  parseInt(s.delay_hours) || 0,
        template_key: s.template_key.trim(),
        subject_i18n: { ...s.subject_i18n, en: s.subject },
        body_i18n:    { ...s.body_i18n, en: s.body },
        cta_i18n:     { ...s.cta_i18n, en: s.cta },
      })),
    }

    try {
      const res = await fetch(
        isEdit ? `/api/admin/sequences/${sequence!.id}` : '/api/admin/sequences',
        {
          method:  isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save')
      toast.success(isEdit ? 'Sequence updated' : 'Sequence created')
      router.push('/admin/sequences')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm(`Delete sequence "${name}" and all its steps?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/sequences/${sequence!.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      toast.success('Sequence deleted')
      router.push('/admin/sequences')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/sequences" className="btn-ghost flex-shrink-0" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-lg leading-none truncate" style={{ color: 'var(--text-primary)' }}>
              {name || (isEdit ? 'Edit Sequence' : 'New Sequence')}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting || submitting}
                className="btn-outline" style={{ padding: '0.55rem 1.2rem', fontSize: '0.8rem', color: '#C9847C' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button type="button" onClick={handleSubmit} disabled={submitting || deleting}
              className="btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.8rem' }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : isEdit ? 'Save Changes' : 'Create Sequence'}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            Sequence Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Name *</FieldLabel>
              <input type="text" value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slugEdited) setSlug(slugify(e.target.value))
                }}
                placeholder="Welcome Series" className="input-field" />
            </div>
            <div>
              <FieldLabel>Slug {isEdit && '(read-only)'}</FieldLabel>
              <input type="text" value={slug} disabled={isEdit}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                placeholder="welcome-series" className="input-field disabled:opacity-60" />
            </div>
            <div>
              <FieldLabel>Trigger</FieldLabel>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as 'on_confirm' | 'on_tag')}
                className="input-field">
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
              <Toggle value={isActive} onChange={setIsActive} />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Email Steps ({steps.length})
            </h2>
            <button type="button" onClick={addStep} className="btn-outline text-xs" style={{ padding: '0.45rem 0.9rem' }}>
              <Plus size={13} /> Add Step
            </button>
          </div>

          {steps.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No steps yet. Each step is one email in the sequence.
            </p>
          )}

          <div className="space-y-5">
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>
                    Step {i + 1}
                  </p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}
                      className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move up">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                      className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move down">
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" onClick={() => removeStep(i)}
                      className="btn-ghost" style={{ padding: '0.3rem', color: '#C9847C' }} aria-label="Remove step">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <FieldLabel>Delay (hours after previous)</FieldLabel>
                    <input type="number" min="0" value={step.delay_hours}
                      onChange={(e) => updateStep(i, { delay_hours: e.target.value })}
                      placeholder="24" className="input-field" />
                  </div>
                  <div>
                    <FieldLabel>Template Key *</FieldLabel>
                    <input type="text" value={step.template_key}
                      onChange={(e) => updateStep(i, { template_key: e.target.value })}
                      placeholder="nurture_day_1" className="input-field" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Subject</FieldLabel>
                    <input type="text" value={step.subject}
                      onChange={(e) => updateStep(i, { subject: e.target.value })}
                      placeholder="Welcome to Arwign — your free planner inside" className="input-field" />
                  </div>
                  <div>
                    <FieldLabel>Body</FieldLabel>
                    <textarea value={step.body} rows={4}
                      onChange={(e) => updateStep(i, { body: e.target.value })}
                      placeholder="Email body copy..." className="input-field" style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <FieldLabel>CTA Label</FieldLabel>
                    <input type="text" value={step.cta}
                      onChange={(e) => updateStep(i, { cta: e.target.value })}
                      placeholder="Download your planner" className="input-field" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
