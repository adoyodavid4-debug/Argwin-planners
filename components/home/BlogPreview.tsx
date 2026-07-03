// components/home/BlogPreview.tsx — server wrapper
// Fetches the 3 latest published blog posts from Supabase and passes them to
// the presentational BlogPreview. Falls back to the hardcoded set on failure.
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogPreview as BlogPreviewView, type BlogPreviewPost } from './HomeComponents'

export default async function BlogPreview() {
  let posts: BlogPreviewPost[] | undefined

  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, category, read_time_mins, cover_image')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)

    if (data && data.length > 0) {
      posts = data.map((p) => ({
        slug:     p.slug,
        title:    p.title,
        excerpt:  p.excerpt ?? '',
        category: p.category ?? 'Planning',
        readTime: p.read_time_mins ?? 5,
        image:    p.cover_image ?? 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',
      }))
    }
  } catch {
    // fall through to the hardcoded fallback inside BlogPreviewView
  }

  return <BlogPreviewView posts={posts} />
}
