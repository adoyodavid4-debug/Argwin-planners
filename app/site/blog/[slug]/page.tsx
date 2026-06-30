import { notFound }             from 'next/navigation'
import type { Metadata }         from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { STATIC_POSTS }           from '../blog-data'
import BlogPostClient             from './BlogPostClient'

interface Params { params: { slug: string } }

// Generate metadata per post
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post =
    STATIC_POSTS.find((p) => p.slug === params.slug) ??
    (await fetchDbPost(params.slug))

  if (!post) return { title: 'Article not found — Arwign Blog' }

  return {
    title:       `${post.title} — Arwign Blog`,
    description: post.excerpt.slice(0, 160),
    alternates:  { canonical: `https://arwignplanners.com/blog/${post.slug}` },
    openGraph: {
      title:       post.title,
      description: post.excerpt.slice(0, 160),
      images:      post.cover ? [post.cover] : [],
    },
  }
}

async function fetchDbPost(slug: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, tags, read_time_mins, published_at, view_count')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
    .then((r) => ({ data: r.data ?? null }))

  if (!data) return null
  return {
    id:          data.id,
    title:       data.title,
    slug:        data.slug,
    excerpt:     data.excerpt ?? '',
    cover:       data.cover_image ?? '',
    category:    data.category ?? 'Planning',
    tags:        data.tags ?? [],
    readMins:    data.read_time_mins ?? 5,
    publishedAt: data.published_at ?? new Date().toISOString(),
    viewCount:   data.view_count ?? 0,
  }
}

export default async function BlogPostPage({ params }: Params) {
  const post =
    STATIC_POSTS.find((p) => p.slug === params.slug) ??
    (await fetchDbPost(params.slug))

  if (!post) notFound()

  // Related posts: same category, excluding current
  const related = STATIC_POSTS
    .filter((p) => p.slug !== params.slug && p.category === post.category)
    .slice(0, 3)

  // More from blog if not enough in same category
  const more = related.length < 2
    ? STATIC_POSTS.filter((p) => p.slug !== params.slug).slice(0, 3)
    : related

  return <BlogPostClient post={post} related={more} />
}
