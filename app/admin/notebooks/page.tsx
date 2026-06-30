import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NotebooksClient from './NotebooksClient'

export const metadata: Metadata = {
  title: 'Notebooks — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminNotebooksPage() {
  const supabase = createServiceRoleClient()

  const { data: notebooks, error } = await supabase
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
      notebook_collaborators (id)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (notebooks ?? []).map((n: any) => ({
    ...n,
    owner: n.profiles,
    collaborator_count: n.notebook_collaborators?.length ?? 0,
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Notebooks</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(224,168,44,0.12)', color: 'var(--gold)' }}>
              {rows.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load notebooks: {error.message}
          </div>
        ) : (
          <NotebooksClient notebooks={rows} />
        )}
      </div>
    </div>
  )
}
