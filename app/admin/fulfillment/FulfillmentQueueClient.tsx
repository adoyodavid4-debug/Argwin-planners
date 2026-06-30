'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { FulfillmentOrder } from './page'

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  submitted:      'bg-blue-100 text-blue-700',
  accepted:       'bg-blue-100 text-blue-700',
  in_production:  'bg-purple-100 text-purple-700',
  shipped:        'bg-green-100 text-green-700',
  delivered:      'bg-green-200 text-green-900',
  rejected:       'bg-red-100 text-red-700',
  canceled:       'bg-gray-100 text-gray-500',
  error:          'bg-orange-100 text-orange-700',
}

export default function FulfillmentQueueClient({ orders: initial }: { orders: FulfillmentOrder[] }) {
  const [orders, setOrders]   = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter ? orders.filter((o) => o.fulfillment_status === statusFilter) : orders

  const act = async (id: string, action: 'approve' | 'reject' | 'cancel', reason?: string) => {
    setLoading(id)
    const res = await fetch(`/api/admin/fulfillment/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    setLoading(null)
    const data = await res.json()
    if (res.ok) {
      toast.success(action === 'approve' ? 'Submitted to Lulu!' : action === 'reject' ? 'Rejected' : 'Canceled')
      const newStatus = action === 'approve' ? 'submitted' : action === 'reject' ? 'rejected' : 'canceled'
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, fulfillment_status: newStatus } : o))
    } else {
      toast.error(data.error ?? 'Action failed')
    }
  }

  const handleReject = (id: string) => {
    const reason = window.prompt('Rejection reason (shown in audit log):')
    if (reason) act(id, 'reject', reason)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]">
          <option value="">All statuses</option>
          {['pending_review','submitted','accepted','in_production','shipped','delivered','rejected','canceled','error'].map((s) => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-[var(--text-muted)] self-center">{filtered.length} orders</span>
      </div>

      <div className="space-y-3">
        {filtered.map((order) => {
          const addr = order.shipping_address
          const isExpanded = expanded === order.id
          const margin = order.subtotal > 0
            ? (((order.subtotal - (order.total - order.shipping_cost - order.subtotal)) / order.subtotal) * 100).toFixed(0)
            : '—'

          return (
            <div key={order.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.fulfillment_status] ?? ''}`}>
                      {order.fulfillment_status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{order.provider}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{order.orders?.email ?? '—'}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {addr?.name} · {addr?.city}, {addr?.countryCode}
                    &nbsp;·&nbsp;Total: {((order.total ?? 0) / 100).toFixed(2)} {order.currency}
                  </p>
                </div>
                <div className="text-[var(--text-muted)] text-sm select-none">{isExpanded ? '▲' : '▼'}</div>
              </div>

              {isExpanded && (
                <div className="border-t border-[var(--border)] px-4 py-4 space-y-4">
                  {/* Address */}
                  <div className="text-sm">
                    <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">Ship to</p>
                    <p>{addr?.name}</p>
                    <p>{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ''}</p>
                    <p>{addr?.city}{addr?.state ? `, ${addr.state}` : ''} {addr?.postalCode}</p>
                    <p>{addr?.countryCode}</p>
                  </div>

                  {/* Financials */}
                  <div className="text-sm grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-[var(--text-muted)]">Subtotal</p><p className="font-medium">{((order.subtotal ?? 0)/100).toFixed(2)} {order.currency}</p></div>
                    <div><p className="text-xs text-[var(--text-muted)]">Shipping</p><p className="font-medium">{((order.shipping_cost ?? 0)/100).toFixed(2)} {order.currency}</p></div>
                    <div><p className="text-xs text-[var(--text-muted)]">Level</p><p className="font-medium">{order.shipping_level}</p></div>
                  </div>

                  {/* Tracking */}
                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noopener"
                      className="text-sm text-[#C9A84C] hover:underline">
                      Track: {order.tracking_number ?? order.tracking_url}
                    </a>
                  )}

                  {/* Failure reason */}
                  {order.failure_reason && (
                    <p className="text-sm text-red-600">Failure: {order.failure_reason}</p>
                  )}

                  {/* Audit timeline */}
                  {order.fulfillment_events?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Timeline</p>
                      <ol className="space-y-1">
                        {[...(order.fulfillment_events ?? [])].reverse().map((ev, i) => (
                          <li key={i} className="text-xs flex gap-2 text-[var(--text-muted)]">
                            <span>{new Date(ev.created_at).toLocaleString()}</span>
                            <span className="font-medium text-[var(--text-primary)]">{ev.status.replace('_',' ')}</span>
                            <span>via {ev.source}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Actions */}
                  {order.fulfillment_status === 'pending_review' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        disabled={loading === order.id}
                        onClick={() => act(order.id, 'approve')}
                        className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8963e] disabled:opacity-60"
                      >
                        {loading === order.id ? 'Submitting…' : 'Approve & Submit to Lulu'}
                      </button>
                      <button
                        disabled={loading === order.id}
                        onClick={() => handleReject(order.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {order.fulfillment_status === 'error' && (
                    <button
                      disabled={loading === order.id}
                      onClick={() => act(order.id, 'approve')}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                    >
                      Retry submit
                    </button>
                  )}
                  {!['delivered','rejected','canceled'].includes(order.fulfillment_status) && order.provider_job_id && (
                    <button
                      disabled={loading === order.id}
                      onClick={() => { if (confirm('Cancel this print job?')) act(order.id, 'cancel') }}
                      className="text-xs text-[var(--text-muted)] hover:underline"
                    >
                      Cancel print job
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!filtered.length && (
          <p className="text-center text-[var(--text-muted)] py-12 text-sm">No orders found.</p>
        )}
      </div>
    </div>
  )
}
