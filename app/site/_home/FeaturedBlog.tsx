// Homepage sidebar card — a single "Featured Blog" that rotates through the
// top posts, one every 4 days. The pick is derived from the current date
// (4-day buckets over the top-N list), so it advances on its own with no cron.
// The homepage renders dynamically (cookies), so each request re-evaluates the
// bucket and the card advances automatically once a 4-day window elapses.
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Clock, ArrowRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type BlogPost, STATIC_POSTS } from '../blog/blog-data'

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=75'
const ROTATE_DAYS = 4
const TOP_N = 8

async function getTopPosts(): Promise<BlogPost[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, category, tags, read_time_mins, published_at, view_count')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(TOP_N)
      .then((r) => ({ data: r.error ? [] : r.data ?? [] }))

    if (data && data.length > 0) {
      return data.map((p) => ({
        id:          p.id,
        title:       p.title,
        slug:        p.slug,
        excerpt:     p.excerpt ?? '',
        cover:       p.cover_image ?? '',
        category:    p.category ?? 'Planning',
        tags:        p.tags ?? [],
        readMins:    p.read_time_mins ?? 5,
        publishedAt: p.published_at ?? new Date().toISOString(),
        viewCount:   p.view_count ?? 0,
      }))
    }
  } catch {
    /* fall through to static */
  }
  // DB empty or unreachable — fall back to the hand-crafted posts, most-read first.
  return [...STATIC_POSTS].sort((a, b) => b.viewCount - a.viewCount).slice(0, TOP_N)
}

export default async function FeaturedBlog() {
  const posts = await getTopPosts()
  if (posts.length === 0) return null

  // 4-day rotation: which whole 4-day window are we in, mod the list length.
  const bucket = Math.floor(Date.now() / (86_400_000 * ROTATE_DAYS))
  const post = posts[bucket % posts.length]
  const excerpt = post.excerpt.length > 150 ? `${post.excerpt.slice(0, 150).trimEnd()}…` : post.excerpt

  return (
    <div className="mt-6 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="p-5 pb-4" style={{ background: 'linear-gradient(135deg, rgba(var(--gold-rgb),0.16) 0%, rgba(168,181,160,0.10) 55%, transparent 100%)' }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>
          <BookOpen size={12} /> Featured Blog
        </span>
        <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
          A fresh read from the Arwign journal — a new pick every few days.
        </p>
      </div>

      {/* Featured post */}
      <Link href={`/blog/${post.slug}`} className="group block">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--bg-secondary)' }}>
          <Image
            src={post.cover || DEFAULT_COVER}
            alt={post.title}
            fill
            sizes="360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(201,168,76,0.92)', color: 'white', letterSpacing: '0.07em' }}>
            {post.category}
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg leading-snug mb-1.5 transition-colors group-hover:text-gold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {post.title}
          </h3>
          {excerpt && <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{excerpt}</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} /> {post.readMins} min read
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--gold)' }}>
              Read article <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
