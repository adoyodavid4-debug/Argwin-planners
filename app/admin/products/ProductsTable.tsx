'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Product, Category } from './page'

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  draft:    'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
}

interface Props {
  initialProducts: Product[]
  categories: Category[]
}

export default function ProductsTable({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [saving, setSaving]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortBy, setSortBy]     = useState<'created_at' | 'title' | 'price' | 'status'>('created_at')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    let list = [...products]
    if (search)       list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter) list = list.filter(p => p.status === statusFilter)
    if (typeFilter)   list = list.filter(p => p.product_type === typeFilter)
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'price')  return (a.price - b.price) * mul
      if (sortBy === 'title')  return a.title.localeCompare(b.title) * mul
      if (sortBy === 'status') return a.status.localeCompare(b.status) * mul
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mul
    })
    return list
  }, [products, search, statusFilter, typeFilter, sortBy, sortDir])

  const counts = useMemo(() => ({
    all:      products.length,
    active:   products.filter(p => p.status === 'active').length,
    draft:    products.filter(p => p.status === 'draft').length,
    archived: products.filter(p => p.status === 'archived').length,
  }), [products])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSaving(id)
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(null)
    if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
    toast.success('Saved')
  }

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Deleted')
    } else {
      toast.error('Delete failed')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-1 opacity-50 text-xs select-none">
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div>
      {/* Quick-filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { label: `All (${counts.all})`,         val: '' },
          { label: `Active (${counts.active})`,   val: 'active' },
          { label: `Draft (${counts.draft})`,     val: 'draft' },
          { label: `Archived (${counts.archived})`, val: 'archived' },
        ].map(tab => (
          <button key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${statusFilter === tab.val
              ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.1)] text-[#C9A84C]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[#C9A84C]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] w-64"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <option value="">All types</option>
          <option value="planner">Planner</option>
          <option value="notebook">Notebook</option>
        </select>
        <span className="ml-auto text-sm self-center" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold w-12" style={{ color: 'var(--text-muted)' }}></th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('title')}>
                  Product <SortIcon col="title" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('price')}>
                  Price <SortIcon col="price" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Category</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Type</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Flags</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('created_at')}>
                  Created <SortIcon col="created_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--border)' } as React.CSSProperties}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    {search || statusFilter || typeFilter
                      ? 'No products match your filters.'
                      : 'No products yet. Click "+ New Product" to add your first one.'}
                  </td>
                </tr>
              )}
              {filtered.map(product => (
                <tr key={product.id}
                  className="transition-colors"
                  style={{ background: 'var(--bg-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                      {product.thumbnail
                        ? <Image src={product.thumbnail} alt="" width={40} height={40} className="object-cover w-full h-full" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">📋</div>
                      }
                    </div>
                  </td>

                  {/* Title + slug */}
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{product.title}</p>
                    <p className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--text-muted)' }}>/shop/{product.slug}</p>
                    {product.rating_count > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        ★ {product.rating_avg?.toFixed(1)} ({product.rating_count}) · {product.download_count} downloads
                      </p>
                    )}
                  </td>

                  {/* Status — inline toggle */}
                  <td className="px-4 py-3">
                    <select
                      value={product.status}
                      disabled={saving === product.id}
                      onChange={e => patch(product.id, { status: e.target.value })}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer ${STATUS_STYLES[product.status]}`}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>

                  {/* Price — inline edit */}
                  <td className="px-4 py-3">
                    <PriceCell product={product} onSave={v => patch(product.id, { price: v })} saving={saving === product.id} />
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(product.categories as unknown as { name: string } | null)?.name ?? '—'}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className="text-xs rounded-full px-2 py-0.5 capitalize"
                      style={{ background: product.product_type === 'notebook' ? 'rgba(124,104,183,0.12)' : 'rgba(201,168,76,0.1)', color: product.product_type === 'notebook' ? '#7C68B7' : '#C9A84C' }}>
                      {product.product_type ?? 'planner'}
                    </span>
                  </td>

                  {/* Flags — inline toggles */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { key: 'is_featured', label: '⭐', title: 'Featured' },
                        { key: 'is_bestseller', label: '🏆', title: 'Bestseller' },
                        { key: 'is_new', label: '✨', title: 'New' },
                      ].map(flag => (
                        <button
                          key={flag.key}
                          title={`${flag.title}: ${product[flag.key as keyof Product] ? 'on' : 'off'} — click to toggle`}
                          disabled={saving === product.id}
                          onClick={() => patch(product.id, { [flag.key]: !product[flag.key as keyof Product] })}
                          className="text-sm transition-opacity disabled:opacity-50"
                          style={{ opacity: product[flag.key as keyof Product] ? 1 : 0.25 }}
                        >
                          {flag.label}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(product.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 text-xs">
                      <Link href={`/shop/${product.slug}`} target="_blank"
                        className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                        View ↗
                      </Link>
                      <button
                        disabled={deleting === product.id}
                        onClick={() => remove(product.id, product.title)}
                        className="hover:underline disabled:opacity-50"
                        style={{ color: '#C9847C' }}
                      >
                        {deleting === product.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {saving && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Saving…</p>
      )}
    </div>
  )
}

function PriceCell({ product, onSave, saving }: { product: Product; onSave: (v: number) => void; saving: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(product.price))

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="font-semibold hover:underline text-left"
        style={{ color: 'var(--text-primary)' }}
        title="Click to edit price"
      >
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency ?? 'USD' }).format(product.price)}
      </button>
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(parseFloat(val)); setEditing(false) }}
      className="flex items-center gap-1">
      <input
        autoFocus
        type="number" step="0.01" min="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-20 rounded border px-1.5 py-0.5 text-sm font-semibold outline-none"
        style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
      />
      <button type="submit" disabled={saving} className="text-[10px] text-[#C9A84C]">✓</button>
    </form>
  )
}
