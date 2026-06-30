import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import NotebooksListClient from './NotebooksListClient'

export const metadata: Metadata = {
  title: 'My Notebooks — Arwign Planners',
  robots: { index: false, follow: false },
}

export default async function CustomerNotebooksPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login?redirect=/customer/notebooks')

  const service = createServiceRoleClient()
  const userId  = session.user.id

  // Owned notebooks
  const { data: owned } = await service
    .from('notebooks')
    .select(`
      id, name, type, description, cover_color, status, visibility,
      owner_id, last_edited_by, created_at, updated_at,
      notebook_collaborators (
        id, user_id,
        profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
      )
    `)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })

  // Shared with user
  const { data: sharedRows } = await service
    .from('notebook_collaborators')
    .select(`
      role,
      notebooks!notebook_collaborators_notebook_id_fkey (
        id, name, type, description, cover_color, status, visibility,
        owner_id, last_edited_by, created_at, updated_at,
        profiles!notebooks_owner_id_fkey (id, email, full_name, avatar_url),
        notebook_collaborators (
          id, user_id,
          profiles!notebook_collaborators_user_id_fkey (id, email, full_name, avatar_url)
        )
      )
    `)
    .eq('user_id', userId)
    .order('invited_at', { ascending: false })

  const shared = (sharedRows ?? [])
    .filter((s: any) => s.notebooks)
    .map((s: any) => ({ ...s.notebooks, _shared_as: s.role }))

  return (
    <NotebooksListClient
      owned={(owned ?? []) as any}
      shared={shared as any}
      userId={userId}
    />
  )
}
