'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

type Subscriber = {
  id: string; email: string; status: string; locale: string;
  confirmed_at: string | null; created_at: string; tags: string[]
  lead_magnets: { title_i18n: Record<string, string> } | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:      'bg-yellow-100 text-yellow-700',
  confirmed:    'bg-green-100 text-green-700',
  unsubscribed: 'bg-gray-100 text-gray-500',
  bounced:      'bg-red-100 text-red-600',
  complained:   'bg-orange-100 text-orange-700',
}

export default function SubscribersClient({ initialData, totalCount }: { initialData: Subscriber[], totalCount: number }) {
  const [subs, setSubs] = useState(initialData)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = subs.filter((s) => {
    const matchQ = !q || s.email.toLowerCase().includes(q.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchQ && matchStatus
  })

  const handleUnsubscribe = async (id: string) => {
    if (!confirm('Unsubscribe this subscriber?')) return
    const res = await fetch(`/api/admin/subscribers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'unsubscribed' }),
    })
    if (res.ok) {
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'unsubscribed' } : s))
      toast.success('Unsubscribed')
    } else {
      toast.error('Failed')
    }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Search email…" value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] w-64"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Complained</option>
        </select>
        <span className="ml-auto text-sm text-[var(--text-muted)] self-center">
          Showing {filtered.length} of {totalCount}
        </span>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-subtle)] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Locale</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--bg-subtle)]">
                <td className="px-4 py-3 font-mono text-xs">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? ''}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 uppercase text-xs text-[var(--text-muted)]">{s.locale}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {s.lead_magnets?.title_i18n?.en ?? 'Direct'}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {s.status !== 'unsubscribed' && (
                    <button onClick={() => handleUnsubscribe(s.id)}
                      className="text-xs text-red-500 hover:underline">Unsub</button>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No subscribers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
