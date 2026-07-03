import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BlogTable, { type AdminBlogPost } from './BlogTable'

export const metadata: Metadata = {
  title: 'Blog — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminBlogPage() {
  const supabase = createServiceRoleClient()

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, tags, read_time_mins, view_count, status, published_at, created_at')
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
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Blog Posts</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {posts?.length ?? 0}
            </span>
          </div>
          <Link
            href="/admin/blog/new"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--gold)' }}
          >
            + New Post
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load blog posts: {error.message}
          </div>
        ) : (
          <BlogTable initialPosts={(posts ?? []) as AdminBlogPost[]} />
        )}
      </div>
    </div>
  )
}
