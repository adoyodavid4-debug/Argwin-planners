import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type BlogPost, STATIC_POSTS } from './blog-data'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import BlogClient from './BlogClient'

const BASE = 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'Planning Tips, Guides & Inspiration — Arwign Blog',
  description:
    'Discover planning tips, productivity guides, digital planner tutorials, and lifestyle inspiration from the Arwign Planners team.',
  alternates: { canonical: 'https://arwignplanners.com/blog' },
  openGraph: {
    title: 'The Arwign Blog — Planning Tips & Inspiration',
    description: 'Productivity guides, digital planner tutorials, and planning inspiration.',
  },
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; page?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Try to fetch published posts from DB; fall back to static content
  const { data: dbPosts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, tags, read_time_mins, published_at, view_count')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .then((r) => ({ data: r.error ? [] : r.data }))

  // Map DB shape to our BlogPost type; fall back to hand-crafted posts
  const posts: BlogPost[] =
    dbPosts && dbPosts.length > 0
      ? dbPosts.map((p) => ({
          id:            p.id,
          title:         p.title,
          slug:          p.slug,
          excerpt:       p.excerpt ?? '',
          cover:         p.cover_image ?? '',
          category:      p.category ?? 'Planning',
          tags:          p.tags ?? [],
          readMins:      p.read_time_mins ?? 5,
          publishedAt:   p.published_at ?? new Date().toISOString(),
          viewCount:     p.view_count ?? 0,
        }))
      : STATIC_POSTS

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Blog', url: `${BASE}/site/blog` },
      ]} />
      <BlogClient
        posts={posts}
        searchParams={searchParams}
      />
    </>
  )
}
