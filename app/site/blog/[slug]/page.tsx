import { notFound }             from 'next/navigation'
import type { Metadata }         from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type BlogPost, STATIC_POSTS } from '../blog-data'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import BlogPostClient             from './BlogPostClient'
import TrackView                   from '@/components/analytics/TrackView'

const BASE = 'https://www.arwignplanners.com'
// Only DB-backed posts have a UUID id + a row to increment; static fallback
// posts are skipped.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Params { params: { slug: string } }

// Generate metadata per post
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post =
    (await fetchDbPost(params.slug)) ??
    STATIC_POSTS.find((p) => p.slug === params.slug)

  if (!post) return { title: 'Article not found — Arwign Blog' }

  return {
    title:       `${post.title} — Arwign Blog`,
    description: post.excerpt.slice(0, 160),
    alternates:  { canonical: `https://www.arwignplanners.com/blog/${post.slug}` },
    openGraph: {
      title:       post.title,
      description: post.excerpt.slice(0, 160),
      images:      post.cover ? [post.cover] : [],
    },
  }
}

function mapDbPost(data: {
  id: string; title: string; slug: string; excerpt: string | null; body: string | null
  cover_image: string | null; category: string | null; tags: string[] | null
  read_time_mins: number | null; published_at: string | null; view_count: number | null
  like_count?: number | null; comment_count?: number | null
}): BlogPost {
  return {
    id:           data.id,
    title:        data.title,
    slug:         data.slug,
    excerpt:      data.excerpt ?? '',
    cover:        data.cover_image ?? '',
    category:     data.category ?? 'Planning',
    tags:         data.tags ?? [],
    readMins:     data.read_time_mins ?? 5,
    publishedAt:  data.published_at ?? new Date().toISOString(),
    viewCount:    data.view_count ?? 0,
    likeCount:    data.like_count ?? 0,
    commentCount: data.comment_count ?? 0,
    body:         data.body ?? null,
  }
}

// Engagement (comments + the current visitor's saved/login state) for a
// DB-backed post. Static fallback posts have no row, so this returns null.
async function fetchEngagement(post: BlogPost) {
  if (!UUID_RE.test(post.id)) return null
  // Every read here touches new schema (like_count/comment_count columns, the
  // blog_comments table, profiles.saved_posts). If migration 032 hasn't been
  // applied yet, the queries throw and we return null — the post still renders
  // fully, just without the engagement UI. So the blog never breaks pre-migration.
  try {
    const supabase = createServerSupabaseClient()
    const [countsRes, commentsRes, userRes] = await Promise.all([
      supabase.from('blog_posts').select('like_count, comment_count').eq('id', post.id).single(),
      supabase.from('blog_comments')
        .select('id, author_name, body, created_at, user_id')
        .eq('post_id', post.id).eq('status', 'approved')
        .order('created_at', { ascending: false }).limit(100),
      supabase.auth.getUser(),
    ])
    if (countsRes.error) throw countsRes.error   // columns missing → skip engagement
    if (commentsRes.error) throw commentsRes.error

    const user = userRes.data.user
    let saved = false
    let currentUserId: string | null = null
    if (user) {
      currentUserId = user.id
      const { data: profile } = await supabase.from('profiles').select('saved_posts').eq('id', user.id).single()
      saved = Array.isArray(profile?.saved_posts) && (profile!.saved_posts as string[]).includes(post.id)
    }
    return {
      postId:        post.id,
      likeCount:     countsRes.data?.like_count ?? 0,
      commentCount:  countsRes.data?.comment_count ?? 0,
      comments:      commentsRes.data ?? [],
      saved,
      isLoggedIn:    !!user,
      currentUserId,
    }
  } catch {
    return null
  }
}

async function fetchDbPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, body, cover_image, category, tags, read_time_mins, published_at, view_count')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then((r) => ({ data: r.data ?? null }))

    return data ? mapDbPost(data) : null
  } catch {
    return null
  }
}

async function fetchRelated(slug: string, category: string): Promise<BlogPost[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, body, cover_image, category, tags, read_time_mins, published_at, view_count')
      .eq('status', 'published')
      .neq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(12)
      .then((r) => ({ data: r.error ? [] : r.data ?? [] }))

    const posts = (data ?? []).map(mapDbPost)
    const sameCategory = posts.filter((p) => p.category === category).slice(0, 3)
    return sameCategory.length >= 2 ? sameCategory : posts.slice(0, 3)
  } catch {
    return []
  }
}

export default async function BlogPostPage({ params }: Params) {
  // DB-managed post first (so admin edits show); static content as fallback
  const post =
    (await fetchDbPost(params.slug)) ??
    STATIC_POSTS.find((p) => p.slug === params.slug)

  if (!post) notFound()

  const engagement = await fetchEngagement(post)

  // Related posts: prefer the DB, fall back to static content
  let more = await fetchRelated(params.slug, post.category)
  if (more.length === 0) {
    const related = STATIC_POSTS
      .filter((p) => p.slug !== params.slug && p.category === post.category)
      .slice(0, 3)
    more = related.length < 2
      ? STATIC_POSTS.filter((p) => p.slug !== params.slug).slice(0, 3)
      : related
  }

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Blog', url: `${BASE}/site/blog` },
        { name: post.title, url: `${BASE}/site/blog/${post.slug}` },
      ]} />
      {UUID_RE.test(post.id) && <TrackView type="blog" id={post.id} />}
      <BlogPostClient post={post} related={more} engagement={engagement} />
    </>
  )
}
