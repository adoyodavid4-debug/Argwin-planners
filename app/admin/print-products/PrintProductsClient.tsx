'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { PrintProductRow } from './page'

interface Props {
  printProducts: PrintProductRow[]
  products: { id: string; title: string; slug: string; status: string }[]
}

const DEFAULT_FORM = {
  product_id:       '',
  pod_package_id:   '',
  interior_pdf_url: '',
  cover_pdf_url:    '',
  base_cost:        '',
  retail_price:     '',
  currency:         'USD',
  min_margin_pct:   '30',
  is_active:        false,
}

export default function PrintProductsClient({ printProducts: initial, products }: Props) {
  const [rows, setRows]           = useState(initial)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(DEFAULT_FORM)
  const [editing, setEditing]     = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const fmtPrice = (v: number, cur: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(v / 100)

  const minFloor = () => {
    const base = parseInt(form.base_cost)
    const pct  = parseInt(form.min_margin_pct)
    if (isNaN(base) || isNaN(pct)) return null
    return Math.ceil(base * (1 + pct / 100))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const body = {
      product_id:       form.product_id,
      pod_package_id:   form.pod_package_id,
      interior_pdf_url: form.interior_pdf_url,
      cover_pdf_url:    form.cover_pdf_url,
      base_cost:        parseInt(form.base_cost),
      retail_price:     parseInt(form.retail_price),
      currency:         form.currency,
      min_margin_pct:   parseInt(form.min_margin_pct),
      is_active:        form.is_active,
    }

    const url = editing ? `/api/admin/print-products/${editing}` : '/api/admin/print-products'
    const method = editing ? 'PATCH' : 'POST'
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Save failed'); return }

    toast.success(editing ? 'Updated!' : 'Created!')
    if (editing) {
      setRows((prev) => prev.map((r) => r.id === editing ? { ...r, ...data } : r))
    } else {
      setRows((prev) => [data, ...prev])
    }
    setShowForm(false)
    setEditing(null)
    setForm(DEFAULT_FORM)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this print product?')) return
    const res = await fetch(`/api/admin/print-products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      setRows((prev) => prev.filter((r) => r.id !== id))
    } else {
      toast.error('Delete failed')
    }
  }

  const openEdit = (row: PrintProductRow) => {
    setEditing(row.id)
    setForm({
      product_id:       row.product_id,
      pod_package_id:   row.pod_package_id,
      interior_pdf_url: row.interior_pdf_url,
      cover_pdf_url:    row.cover_pdf_url,
      base_cost:        String(row.base_cost),
      retail_price:     String(row.retail_price),
      currency:         row.currency,
      min_margin_pct:   String(row.min_margin_pct),
      is_active:        row.is_active,
    })
    setShowForm(true)
    setError('')
  }

  const floor = minFloor()
  const retailInt = parseInt(form.retail_price)
  const marginOk = floor === null || isNaN(retailInt) || retailInt >= floor

  return (
    <div>
      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(DEFAULT_FORM); setError('') }}
          className="mb-6 rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8963e]">
          + New Print Product
        </button>
      )}

      {showForm && (
        <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} Print Product</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">— select product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            {([
              ['Lulu Package ID', 'pod_package_id', 'e.g. 0600X0900BWSTDPB060UW'],
              ['Interior PDF URL', 'interior_pdf_url', 'https://...'],
              ['Cover PDF URL', 'cover_pdf_url', 'https://...'],
            ] as [string, keyof typeof DEFAULT_FORM, string][]).map(([label, key, placeholder]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type="text" value={form[key] as string} placeholder={placeholder}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono" />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Base Cost (¢)</label>
                <input type="number" value={form.base_cost}
                  onChange={(e) => setForm({ ...form, base_cost: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Retail Price (¢)</label>
                <input type="number" value={form.retail_price}
                  onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${!marginOk ? 'border-red-400 bg-red-50' : 'border-[var(--border)]'}`} />
                {floor !== null && (
                  <p className={`text-xs mt-0.5 ${marginOk ? 'text-[var(--text-muted)]' : 'text-red-600 font-medium'}`}>
                    Min: {floor}¢ ({form.min_margin_pct}% margin)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Margin %</label>
                <input type="number" value={form.min_margin_pct}
                  onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                  {['USD','EUR','GBP','CAD','AUD'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded" />
                  Active (available for checkout)
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button disabled={saving || !marginOk} onClick={handleSave}
                className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8963e] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditing(null); setError('') }}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No print products yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs uppercase tracking-wider">
              <tr>
                {['Product','Package ID','Base','Retail','Margin','Currency','Active',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row) => {
                const margin = ((row.retail_price - row.base_cost) / row.base_cost * 100).toFixed(0)
                return (
                  <tr key={row.id} className="hover:bg-[var(--bg-muted)]">
                    <td className="px-4 py-3 font-medium">{row.products?.title ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{row.pod_package_id}</td>
                    <td className="px-4 py-3">{fmtPrice(row.base_cost, row.currency)}</td>
                    <td className="px-4 py-3 font-semibold">{fmtPrice(row.retail_price, row.currency)}</td>
                    <td className={`px-4 py-3 font-medium ${Number(margin) >= row.min_margin_pct ? 'text-green-600' : 'text-red-600'}`}>{margin}%</td>
                    <td className="px-4 py-3">{row.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {row.is_active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => openEdit(row)} className="text-[#C9A84C] hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
