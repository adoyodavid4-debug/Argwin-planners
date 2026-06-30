'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

type NotebookRequest = {
  id: string; name: string; email: string; idea: string
  locale: string; status: string; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-yellow-100 text-yellow-700',
  reviewing: 'bg-blue-100 text-blue-700',
  accepted:  'bg-green-100 text-green-700',
  declined:  'bg-gray-100 text-gray-500',
}

export default function NotebookRequestsClient({ initialData, totalCount }: { initialData: NotebookRequest[], totalCount: number }) {
  const [requests, setRequests] = useState(initialData)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = requests.filter((r) => {
    const matchQ = !q || r.email.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchQ && matchStatus
  })

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/notebook-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
      toast.success('Updated')
    } else {
      toast.error('Failed')
    }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Search name or email…" value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] w-64"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
        <span className="ml-auto text-sm text-[var(--text-muted)] self-center">
          Showing {filtered.length} of {totalCount}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{r.name}</p>
                <p className="text-xs font-mono text-[var(--text-muted)]">{r.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                  {r.status}
                </span>
                <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#C9A84C]">
                  <option value="new">New</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap mb-2">{r.idea}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {r.locale.toUpperCase()} · {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {!filtered.length && (
          <p className="text-center text-[var(--text-muted)] py-12">No notebook requests found.</p>
        )}
      </div>
    </div>
  )
}
