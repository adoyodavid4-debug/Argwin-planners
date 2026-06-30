'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import type { Order } from './page'

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  refunded:   'bg-orange-100 text-orange-700',
  cancelled:  'bg-gray-100 text-gray-500',
}

const PAYMENT_LABELS: Record<string, string> = {
  stripe_card: 'Card',
  paypal:      'PayPal',
  apple_pay:   'Apple Pay',
  google_pay:  'Google Pay',
  mpesa:       'M-Pesa',
}

interface Props {
  initialOrders: Order[]
}

export default function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders]         = useState(initialOrders)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [saving, setSaving]         = useState<string | null>(null)
  const [sortBy, setSortBy]         = useState<'created_at' | 'amount_total' | 'status'>('created_at')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    let list = [...orders]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o => o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
    }
    if (statusFilter) list = list.filter(o => o.status === statusFilter)
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'amount_total') return (a.amount_total - b.amount_total) * mul
      if (sortBy === 'status')       return a.status.localeCompare(b.status) * mul
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mul
    })
    return list
  }, [orders, search, statusFilter, sortBy, sortDir])

  const counts = useMemo(() => ({
    all:        orders.length,
    pending:    orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed:  orders.filter(o => o.status === 'completed').length,
    refunded:   orders.filter(o => o.status === 'refunded').length,
    cancelled:  orders.filter(o => o.status === 'cancelled').length,
  }), [orders])

  const revenue = useMemo(() =>
    orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount_total, 0),
    [orders]
  )

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const patchStatus = async (id: string, status: string) => {
    setSaving(id)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    setSaving(null)
    if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: data.status } : o))
    toast.success('Status updated')
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-1 opacity-40 text-xs select-none">
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders',    value: orders.length.toLocaleString() },
          { label: 'Completed',       value: counts.completed.toLocaleString() },
          { label: 'Pending / Processing', value: (counts.pending + counts.processing).toLocaleString() },
          { label: 'Total Revenue',   value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenue) },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: `All (${counts.all})`,               val: '' },
          { label: `Completed (${counts.completed})`,   val: 'completed' },
          { label: `Processing (${counts.processing})`, val: 'processing' },
          { label: `Pending (${counts.pending})`,       val: 'pending' },
          { label: `Refunded (${counts.refunded})`,     val: 'refunded' },
          { label: `Cancelled (${counts.cancelled})`,   val: 'cancelled' },
        ].map(tab => (
          <button
            key={tab.val}
            onClick={() => setStatus(tab.val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${statusFilter === tab.val
              ? 'border-[#C9A84C] bg-[rgba(224,168,44,0.1)] text-[#C9A84C]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[#C9A84C]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          placeholder="Search by email or order ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] w-72"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        />
        <span className="ml-auto text-sm self-center" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Order ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Customer</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('amount_total')}>
                  Total <SortIcon col="amount_total" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Items</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Payment</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => toggleSort('created_at')}>
                  Date <SortIcon col="created_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    {search || statusFilter ? 'No orders match your filters.' : 'No orders yet.'}
                  </td>
                </tr>
              )}
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className="border-t transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  {/* Order ID */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{order.email}</span>
                    {order.coupon_code && (
                      <span className="ml-2 text-xs rounded-full px-1.5 py-0.5 font-mono" style={{ background: 'rgba(224,168,44,0.12)', color: 'var(--gold)' }}>
                        {order.coupon_code}
                      </span>
                    )}
                  </td>

                  {/* Status — inline toggle */}
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      disabled={saving === order.id}
                      onChange={e => patchStatus(order.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer disabled:opacity-50 ${STATUS_STYLES[order.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency ?? 'USD' }).format(order.amount_total)}
                      </span>
                      {order.amount_discount > 0 && (
                        <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                          -{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency ?? 'USD' }).format(order.amount_discount)} off
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Items */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {order.payment_method ? (PAYMENT_LABELS[order.payment_method] ?? order.payment_method) : '—'}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
