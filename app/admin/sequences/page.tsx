import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Email Sequences — Admin', robots: { index: false, follow: false } }

export default async function SequencesPage() {
  const supabase = createServiceRoleClient()
  const { data: sequences, error } = await supabase
    .from('email_sequences')
    .select('id, slug, name, trigger, is_active, created_at, email_sequence_steps(id)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Email Sequences</h1>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <strong>Migration pending.</strong> Apply <code>004_funnel_schema.sql</code> in the Supabase SQL editor to enable this feature.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Email Sequences</h1>
        <Link href="/admin/sequences/new"
          className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8963e]">
          + New Sequence
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-subtle)] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Steps</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {(sequences ?? []).map((seq) => (
              <tr key={seq.id} className="hover:bg-[var(--bg-subtle)]">
                <td className="px-4 py-3 font-medium">{seq.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{seq.slug}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{seq.trigger}</td>
                <td className="px-4 py-3 text-xs">{Array.isArray(seq.email_sequence_steps) ? seq.email_sequence_steps.length : 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${seq.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {seq.is_active ? 'Active' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/sequences/${seq.id}`}
                    className="text-[#C9A84C] hover:underline text-xs">Edit</Link>
                </td>
              </tr>
            ))}
            {!sequences?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No sequences yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
