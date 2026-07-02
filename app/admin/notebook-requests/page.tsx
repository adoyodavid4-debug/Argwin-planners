import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NotebookRequestsClient from './NotebookRequestsClient'

export const metadata: Metadata = {
  title: 'Notebook Requests — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminNotebookRequestsPage() {
  const supabase = createServiceRoleClient()

  const { data, count, error } = await supabase
    .from('notebook_requests')
    .select('id, name, email, idea, locale, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Notebook Requests</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {count ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
            <strong>Migration pending.</strong> Apply <code>009_notebook_requests.sql</code> in the Supabase SQL editor to enable this feature.
          </div>
        ) : (
          <NotebookRequestsClient initialData={data ?? []} totalCount={count ?? 0} />
        )}
      </div>
    </div>
  )
}
