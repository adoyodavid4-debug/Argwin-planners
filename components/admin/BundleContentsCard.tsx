'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Package, Search, X, ChevronUp, ChevronDown, Check, Sparkles } from 'lucide-react'

export interface PlannerOption {
  id: string
  title: string
  slug: string
  price: number
  thumbnail: string | null
  category?: string | null
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase mb-1.5"
      style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
      {children}
    </p>
  )
}

function money(n: number) {
  return `$${n.toFixed(2)}`
}

/**
 * Bundle Contents editor — pick the planners that make up a bundle, order them,
 * and see live total-value / savings math against the bundle price. Emits the
 * selected product IDs (ordered) via onChange; the order is persisted to
 * products.bundle_items and drives the storefront "What's included" list.
 */
export default function BundleContentsCard({
  options,
  selectedIds,
  onChange,
  bundlePrice,
  onApplyCompare,
}: {
  options: PlannerOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  bundlePrice: number
  /** Called with the total value so the parent can fill the compare-at price. */
  onApplyCompare: (total: number) => void
}) {
  const [query, setQuery] = useState('')

  const byId = useMemo(() => {
    const m = new Map<string, PlannerOption>()
    options.forEach((o) => m.set(o.id, o))
    return m
  }, [options])

  // Selected items in their chosen order (skip any ids no longer in options).
  const selected = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter(Boolean) as PlannerOption[],
    [selectedIds, byId]
  )

  const totalValue = selected.reduce((sum, p) => sum + (p.price || 0), 0)
  const savings    = Math.max(0, totalValue - (bundlePrice || 0))
  const savingsPct = totalValue > 0 ? Math.round((savings / totalValue) * 100) : 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => !q || o.title.toLowerCase().includes(q) || (o.category ?? '').toLowerCase().includes(q))
      .slice(0, 60)
  }, [options, query])

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= selectedIds.length) return
    const next = [...selectedIds]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="rounded-2xl border p-6"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)', boxShadow: '0 0 0 1px rgba(201,168,76,0.15)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Package size={16} style={{ color: 'var(--gold)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
          Bundle Contents
        </h2>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
        Choose the planners included in this bundle and set your bundle price in the Pricing card.
        The combined value and customer savings update automatically.
      </p>

      {/* ── Selected items (ordered) ─────────────────────────────── */}
      {selected.length > 0 && (
        <div className="space-y-2 mb-5">
          <FieldLabel>In this bundle ({selected.length})</FieldLabel>
          {selected.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
              <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: 'var(--gold)' }}>
                {i + 1}
              </span>
              <span className="relative w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                {p.thumbnail
                  ? <Image src={p.thumbnail} alt="" fill className="object-cover" unoptimized />
                  : <span className="flex items-center justify-center w-full h-full"><Package size={14} style={{ color: 'var(--text-muted)' }} /></span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{money(p.price)}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move up">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1}
                  className="btn-ghost disabled:opacity-30" style={{ padding: '0.3rem' }} aria-label="Move down">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => toggle(p.id)}
                  className="btn-ghost" style={{ padding: '0.3rem', color: '#C9847C' }} aria-label="Remove">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Totals / savings ─────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="rounded-xl border p-4 mb-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>Total value (sum of items)</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{money(totalValue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>Bundle price</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{money(bundlePrice || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="font-medium" style={{ color: 'var(--gold)' }}>Customer saves</span>
            <span className="font-bold" style={{ color: 'var(--gold)' }}>
              {money(savings)}{savingsPct > 0 ? ` · ${savingsPct}%` : ''}
            </span>
          </div>
          <button type="button" onClick={() => onApplyCompare(totalValue)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-2 border transition-colors"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            <Sparkles size={13} /> Set compare-at price to {money(totalValue)}
          </button>
        </div>
      )}

      {/* ── Planner picker ───────────────────────────────────────── */}
      <FieldLabel>Add planners</FieldLabel>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search planners by title…" className="input-field pl-9" />
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
          {filtered.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No planners match &ldquo;{query}&rdquo;.
            </p>
          )}
          {filtered.map((p) => {
            const active = selectedIds.includes(p.id)
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ background: active ? 'rgba(201,168,76,0.08)' : 'transparent' }}>
                <span className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: active ? 'var(--gold)' : 'var(--border)',
                    background:  active ? 'var(--gold)' : 'transparent',
                  }}>
                  {active && <Check size={13} color="white" />}
                </span>
                <span className="relative w-9 h-9 rounded-lg overflow-hidden border flex-shrink-0"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  {p.thumbnail
                    ? <Image src={p.thumbnail} alt="" fill className="object-cover" unoptimized />
                    : <span className="flex items-center justify-center w-full h-full"><Package size={13} style={{ color: 'var(--text-muted)' }} /></span>}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                  {p.category && <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.category}</span>}
                </span>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{money(p.price)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        Select at least 2 planners. Bundles deliver each included planner to the customer after purchase.
      </p>
    </div>
  )
}
