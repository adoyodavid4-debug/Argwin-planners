'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { GeneratorTemplate } from './page'

const KEY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', budget: 'Budget', habit: 'Habit',
  gratitude: 'Gratitude', meal: 'Meal', fitness: 'Fitness', study: 'Study',
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

interface Props {
  initialTemplates: GeneratorTemplate[]
}

export default function GeneratorClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<GeneratorTemplate | null>(null)

  const generate = async (t: GeneratorTemplate) => {
    setBusy(t.id)
    const regen = !!t.product
    const toastId = toast.loading(`${regen ? 'Regenerating' : 'Generating'} "${t.name}"… this takes a few seconds`)
    try {
      const res = await fetch(`/api/admin/generator/${t.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setTemplates(prev => prev.map(x => x.id === t.id
        ? {
            ...x,
            last_generated_at: new Date().toISOString(),
            product_id: data.productId,
            product: { id: data.productId, slug: data.productSlug, status: 'active' },
          }
        : x))
      toast.success(`"${t.name}" is live — ${data.pages} pages · ${data.sizeMb} MB`, { id: toastId, duration: 6000 })
    } catch (e: any) {
      toast.error(e?.message ?? 'Generation failed', { id: toastId })
    } finally {
      setBusy(null)
    }
  }

  const saveEdit = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/generator/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Save failed'); return false }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    toast.success('Template saved')
    return true
  }

  return (
    <div>
      {/* Intro */}
      <div className="rounded-2xl border p-5 mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          One-click planner factory
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Each card below is a pre-designed planner. Click <strong style={{ color: 'var(--gold)' }}>Generate &amp; publish</strong> and
          the system builds the full multi-page A4 PDF, uploads it to secure storage, creates a branded cover image,
          and publishes it as a purchasable product in the shop — no manual work. Regenerating overwrites the PDF and
          cover for the same product, so downloads keep working.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(t => {
          const isLive = !!t.product && t.product.status === 'active'
          const hasProduct = !!t.product
          const running = busy === t.id
          return (
            <div key={t.id}
              className="rounded-2xl border p-5 flex flex-col gap-3"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', opacity: t.is_active ? 1 : 0.65 }}
            >
              {/* Top row: swatch + name + key pill */}
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl border flex-shrink-0"
                  style={{ background: t.accent_hex ?? '#C9A84C', borderColor: 'var(--border)' }}
                  title={`Accent ${t.accent_hex ?? '#C9A84C'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>/shop/{t.slug}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-1 flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)' }}>
                  {KEY_LABELS[t.template_key] ?? t.template_key}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {t.description}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmt.format(t.price)}</span>
                {t.compare_price != null && (
                  <span className="line-through text-xs" style={{ color: 'var(--text-muted)' }}>
                    {fmt.format(t.compare_price)}
                  </span>
                )}
                <span className="ml-auto text-xs rounded-full px-2 py-0.5 border"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  ~{t.page_count ?? 30} pages
                </span>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2 text-xs">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live in shop
                  </span>
                ) : hasProduct ? (
                  <span className="rounded-full px-2 py-0.5 font-medium bg-yellow-100 text-yellow-700 capitalize">
                    Product: {t.product!.status}
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 font-medium bg-gray-100 text-gray-500">
                    Not generated yet
                  </span>
                )}
                {t.last_generated_at && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    · {new Date(t.last_generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto pt-1 flex flex-col gap-2">
                <button
                  onClick={() => generate(t)}
                  disabled={running || busy !== null}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'var(--gold)' }}
                >
                  {running && (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {running ? 'Building planner…' : hasProduct ? 'Regenerate & publish' : 'Generate & publish'}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button onClick={() => setEditing(t)} className="hover:underline font-medium" style={{ color: 'var(--gold)' }}>
                    Edit template
                  </button>
                  {hasProduct && (
                    <div className="flex items-center gap-3">
                      <Link href={`/shop/${t.product!.slug}`} target="_blank" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                        View in shop ↗
                      </Link>
                      <Link href="/admin/products" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                        Manage
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {templates.length === 0 && (
        <div className="rounded-2xl border p-12 text-center text-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          No planner templates found. Run migration <code>013_complete_platform.sql</code> to seed the 8 built-in designs.
        </div>
      )}

      {editing && (
        <EditModal
          template={editing}
          onClose={() => setEditing(null)}
          onSave={async body => {
            const ok = await saveEdit(editing.id, body)
            if (ok) setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EditModal({ template, onClose, onSave }: {
  template: GeneratorTemplate
  onClose: () => void
  onSave: (body: Record<string, unknown>) => Promise<void>
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [price, setPrice] = useState(String(template.price))
  const [comparePrice, setComparePrice] = useState(template.compare_price != null ? String(template.compare_price) : '')
  const [isActive, setIsActive] = useState(template.is_active)
  const [saving, setSaving] = useState(false)

  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      description,
      price,
      compare_price: comparePrice === '' ? null : comparePrice,
      is_active: isActive,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Edit template</h3>
          <button type="button" onClick={onClose} className="text-sm" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <label className="text-xs font-medium flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
          Name
          <input value={name} onChange={e => setName(e.target.value)} required
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]" style={inputStyle} />
        </label>

        <label className="text-xs font-medium flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
          Description
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] resize-none" style={inputStyle} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
            Price (USD)
            <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]" style={inputStyle} />
          </label>
          <label className="text-xs font-medium flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
            Compare-at price
            <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)}
              placeholder="—"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]" style={inputStyle} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-[#C9A84C]" />
          Template active
        </label>

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Price and name changes apply to the shop product the next time you regenerate.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gold)' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
