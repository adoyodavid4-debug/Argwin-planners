'use client'

import { useState } from 'react'
import { Plus, Star, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Testimonial } from '@/types/database'

const GRADIENTS = [
  { label: 'Gold',     value: 'linear-gradient(135deg,#C9A84C,#E2C97E)' },
  { label: 'Lavender', value: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)' },
  { label: 'Rose',     value: 'linear-gradient(135deg,#E8C5C0,#C9847C)' },
  { label: 'Sage',     value: 'linear-gradient(135deg,#A8B5A0,#6E7E66)' },
  { label: 'Terracotta', value: 'linear-gradient(135deg,#C97B5A,#AE6244)' },
  { label: 'Amber',    value: 'linear-gradient(135deg,#C9A84C,#C28E1C)' },
]

interface FormState {
  id?: string
  name: string
  role: string
  quote: string
  rating: number
  product_label: string
  gradient: string
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

const EMPTY: FormState = {
  name: '', role: '', quote: '', rating: 5, product_label: '',
  gradient: GRADIENTS[0].value, is_featured: false, is_active: true, sort_order: 0,
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
      {children}
    </p>
  )
}

export default function TestimonialsClient({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const [items,      setItems]      = useState(initialTestimonials)
  const [form,       setForm]       = useState<FormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busy,       setBusy]       = useState<string | null>(null)

  const openNew = () => setForm({ ...EMPTY, sort_order: items.length })
  const openEdit = (t: Testimonial) => setForm({
    id: t.id, name: t.name, role: t.role ?? '', quote: t.quote, rating: t.rating,
    product_label: t.product_label ?? '', gradient: t.gradient ?? GRADIENTS[0].value,
    is_featured: t.is_featured, is_active: t.is_active, sort_order: t.sort_order,
  })

  const save = async () => {
    if (!form) return
    if (!form.name.trim())  { toast.error('Name is required');  return }
    if (!form.quote.trim()) { toast.error('Quote is required'); return }

    setSubmitting(true)
    const payload = {
      name:          form.name.trim(),
      role:          form.role.trim(),
      quote:         form.quote.trim(),
      rating:        form.rating,
      product_label: form.product_label.trim() || null,
      gradient:      form.gradient,
      is_featured:   form.is_featured,
      is_active:     form.is_active,
      sort_order:    form.sort_order,
    }

    try {
      const res = await fetch(
        form.id ? `/api/admin/testimonials/${form.id}` : '/api/admin/testimonials',
        {
          method:  form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save')
      setItems((p) => form.id
        ? p.map((t) => (t.id === form.id ? data : t))
        : [...p, data])
      toast.success(form.id ? 'Testimonial updated' : 'Testimonial added')
      setForm(null)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const patchItem = async (id: string, patch: Partial<Testimonial>) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update')
      setItems((p) => p.map((t) => (t.id === id ? data : t)))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (t: Testimonial) => {
    if (!confirm(`Delete testimonial from "${t.name}"?`)) return
    setBusy(t.id)
    try {
      const res = await fetch(`/api/admin/testimonials/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      setItems((p) => p.filter((x) => x.id !== t.id))
      toast.success('Testimonial deleted')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    // Swap sort orders locally then persist both
    const next = [...items]
    next[index]  = { ...b, sort_order: a.sort_order }
    next[target] = { ...a, sort_order: b.sort_order }
    // Keep array visually ordered
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    await Promise.all([
      fetch(`/api/admin/testimonials/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/testimonials/${b.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ])
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={openNew} className="btn-primary text-sm">
          <Plus size={15} /> Add Testimonial
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
            No testimonials yet — add your first one.
          </p>
        )}
        {items.map((t, i) => (
          <div key={t.id} className="rounded-2xl border p-5 flex items-start gap-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', opacity: t.is_active ? 1 : 0.55 }}>
            <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
              style={{ width: 44, height: 44, background: t.gradient ?? GRADIENTS[0].value, fontSize: 15 }}>
              {t.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <span className="inline-flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={11}
                      style={{ fill: s <= t.rating ? 'var(--gold)' : 'transparent', stroke: s <= t.rating ? 'var(--gold)' : 'var(--border)' }} />
                  ))}
                </span>
                {t.is_featured && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.14)', color: 'var(--gold)' }}>Featured</span>
                )}
                {t.product_label && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{t.product_label}</span>
                )}
              </div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.role}</p>
              <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button onClick={() => move(i, -1)} disabled={i === 0 || busy === t.id}
                  className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move up">
                  <ArrowUp size={13} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1 || busy === t.id}
                  className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move down">
                  <ArrowDown size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Active</span>
                <Toggle value={t.is_active} onChange={(v) => patchItem(t.id, { is_active: v })} />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => openEdit(t)} className="hover:underline" style={{ color: 'var(--gold)' }}>Edit</button>
                <button onClick={() => remove(t)} disabled={busy === t.id}
                  className="hover:underline disabled:opacity-50" style={{ color: '#C9847C' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => !submitting && setForm(null)}>
          <div className="w-full max-w-lg rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                {form.id ? 'Edit Testimonial' : 'New Testimonial'}
              </h2>
              <button onClick={() => setForm(null)} className="btn-ghost" style={{ padding: '0.375rem' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Name *</FieldLabel>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Amara N." className="input-field" />
                </div>
                <div>
                  <FieldLabel>Role / Location</FieldLabel>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Verified buyer · London" className="input-field" />
                </div>
              </div>
              <div>
                <FieldLabel>Quote *</FieldLabel>
                <textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })}
                  rows={4} placeholder="What did they say?" className="input-field" style={{ resize: 'vertical' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Rating</FieldLabel>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, rating: s })} aria-label={`${s} stars`}>
                        <Star size={20}
                          style={{ fill: s <= form.rating ? 'var(--gold)' : 'transparent', stroke: s <= form.rating ? 'var(--gold)' : 'var(--border)' }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Product Label</FieldLabel>
                  <input type="text" value={form.product_label}
                    onChange={(e) => setForm({ ...form, product_label: e.target.value })}
                    placeholder="Ultimate Digital Planner" className="input-field" />
                </div>
              </div>
              <div>
                <FieldLabel>Avatar Gradient</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GRADIENTS.map((g) => (
                    <button key={g.value} type="button" onClick={() => setForm({ ...form, gradient: g.value })}
                      className="w-9 h-9 rounded-full border-2 transition-all"
                      style={{
                        background: g.value,
                        borderColor: form.gradient === g.value ? 'var(--gold)' : 'transparent',
                        transform: form.gradient === g.value ? 'scale(1.12)' : 'scale(1)',
                      }}
                      aria-label={g.label}
                      title={g.label} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-8 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Featured</span>
                  <Toggle value={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
                  <Toggle value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort</span>
                  <input type="number" value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="input-field w-20" style={{ padding: '0.4rem 0.6rem' }} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setForm(null)} disabled={submitting}
                  className="btn-outline" style={{ padding: '0.55rem 1.2rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button onClick={save} disabled={submitting}
                  className="btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.8rem' }}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : form.id ? 'Save Changes' : 'Add Testimonial'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
