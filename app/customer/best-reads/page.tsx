import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import BestReadsClient, { type SavedPost } from './BestReadsClient'

export const metadata: Metadata = {
  title: 'Best Reads — Arwign Planners',
  robots: { index: false, follow: false },
}

export default async function BestReadsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/customer/best-reads')

  const service = createServiceRoleClient()
  const { data: profile } = await service.from('profiles').select('saved_posts').eq('id', user.id).single()
  const ids: string[] = (profile?.saved_posts as string[] | null) ?? []

  let posts: SavedPost[] = []
  if (ids.length) {
    const { data } = await service
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, category, read_time_mins')
      .in('id', ids)
      .eq('status', 'published')

    // Preserve the saved order stored in the array.
    const byId = new Map((data ?? []).map((p) => [p.id, p]))
    posts = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug,
        excerpt: p.excerpt ?? '', cover: p.cover_image ?? '',
        category: p.category ?? 'Planning', readMins: p.read_time_mins ?? 5,
      }))
  }

  return <BestReadsClient initialPosts={posts} />
}
