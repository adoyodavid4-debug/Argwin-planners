'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { PricingProduct } from './page'

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  draft:    'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
}

interface Draft { price: string; compare: string }

const toDraft = (p: PricingProduct): Draft => ({
  price:   String(p.price ?? ''),
  compare: p.compare_price != null ? String(p.compare_price) : '',
})

const money = (n: number, c?: string | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c ?? 'USD' }).format(n)

export default function PricingClient({ initialProducts }: { initialProducts: PricingProduct[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    () => Object.fromEntries(initialProducts.map((p) => [p.id, toDraft(p)]))
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const isDirty = (p: PricingProduct) => {
    const d = drafts[p.id]
    if (!d) return false
    return d.price !== String(p.price ?? '') ||
      d.compare !== (p.compare_price != null ? String(p.compare_price) : '')
  }

  const dirtyIds = useMemo(() => products.filter(isDirty).map((p) => p.id), [products, drafts]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = products
    if (search) list = list.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter) list = list.filter((p) => p.status === statusFilter)
    return list
  }, [products, search, statusFilter])

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const validate = (d: Draft): { price: number; compare_price: number | null } | string => {
    const price = parseFloat(d.price)
    if (isNaN(price) || price < 0) return 'Enter a valid price'
    let compare: number | null = null
    if (d.compare.trim() !== '') {
      compare = parseFloat(d.compare)
      if (isNaN(compare) || compare < 0) return 'Enter a valid compare-at price'
      if (compare <= price) return 'Compare-at should be higher than the price'
    }
    return { price, compare_price: compare }
  }

  const saveOne = async (p: PricingProduct, silent = false): Promise<boolean> => {
    const body = validate(drafts[p.id])
    if (typeof body === 'string') { toast.error(`${p.title}: ${body}`); return false }

    setSaving((s) => new Set(s).add(p.id))
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setProducts((prev) => prev.map((x) => x.id === p.id
        ? { ...x, price: body.price, compare_price: body.compare_price }
        : x))
      setDrafts((prev) => ({ ...prev, [p.id]: { price: String(body.price), compare: body.compare_price != null ? String(body.compare_price) : '' } }))
      if (!silent) toast.success(`Saved "${p.title}"`)
      return true
    } catch (e: any) {
      toast.error(`${p.title}: ${e.message}`)
      return false
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(p.id); return n })
    }
  }

  const saveAll = async () => {
    const targets = products.filter(isDirty)
    if (!targets.length) return
    let ok = 0
    for (const p of targets) {
      if (await saveOne(p, true)) ok++
    }
    if (ok) toast.success(`Updated ${ok} product${ok !== 1 ? 's' : ''}`)
  }

  const resetAll = () =>
    setDrafts(Object.fromEntries(products.map((p) => [p.id, toDraft(p)])))

  const anySaving = saving.size > 0

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] w-64"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          {dirtyIds.length > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--gold)' }}>
                {dirtyIds.length} unsaved change{dirtyIds.length !== 1 ? 's' : ''}
              </span>
              <button onClick={resetAll} disabled={anySaving}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <RotateCcw size={13} /> Discard
              </button>
            </>
          )}
          <button onClick={saveAll} disabled={anySaving || dirtyIds.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--gold)' }}>
            {anySaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save all changes
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                {['Product', 'Status', 'Current price', 'New price', 'Compare-at (old) price', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--border)' } as React.CSSProperties}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    {search || statusFilter ? 'No products match your filters.' : 'No products yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const d = drafts[p.id]
                const dirty = isDirty(p)
                const busy = saving.has(p.id)
                return (
                  <tr key={p.id} style={{ background: dirty ? 'rgba(201,168,76,0.05)' : 'var(--bg-card)' }}>
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                          {p.thumbnail
                            ? <Image src={p.thumbnail} alt="" width={40} height={40} className="object-cover w-full h-full" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">📋</div>}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}/edit`}
                            className="font-semibold truncate block hover:underline max-w-[16rem]"
                            style={{ color: 'var(--text-primary)' }}>
                            {p.title}
                          </Link>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {p.categories?.name ?? '—'}{p.product_type ? ` · ${p.product_type}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[p.status] ?? ''}`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Current price */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</span>
                      {p.compare_price != null && (
                        <span className="text-xs line-through ml-2" style={{ color: 'var(--text-muted)' }}>
                          {money(p.compare_price, p.currency)}
                        </span>
                      )}
                    </td>

                    {/* New price */}
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01" min="0" inputMode="decimal"
                        value={d?.price ?? ''}
                        disabled={busy}
                        onChange={(e) => setDraft(p.id, { price: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveOne(p) }}
                        className="w-24 rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#C9A84C] disabled:opacity-50"
                        style={{ borderColor: dirty ? 'var(--gold)' : 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                      />
                    </td>

                    {/* Compare-at */}
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01" min="0" inputMode="decimal"
                        placeholder="—"
                        value={d?.compare ?? ''}
                        disabled={busy}
                        onChange={(e) => setDraft(p.id, { compare: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveOne(p) }}
                        className="w-24 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] disabled:opacity-50"
                        style={{ borderColor: dirty ? 'var(--gold)' : 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                      />
                    </td>

                    {/* Save */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => saveOne(p)}
                        disabled={!dirty || busy}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-25"
                        style={{ background: 'var(--gold)' }}
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
