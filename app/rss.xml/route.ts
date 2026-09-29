// app/rss.xml/route.ts
// RSS 2.0 feed of published blog posts. Regenerated hourly.
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const revalidate = 3600

const BASE = 'https://www.arwignplanners.com'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, cover_image, category, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)
    .then((r) => ({ data: r.error ? [] : r.data }))

  const items = (data ?? [])
    .map((p) => {
      const url = `${BASE}/blog/${p.slug}`
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ''}
      ${p.category ? `<category>${esc(p.category)}</category>` : ''}
      <description>${esc(p.excerpt ?? '')}</description>${p.cover_image ? `
      <enclosure url="${esc(p.cover_image)}" type="image/jpeg" length="0" />` : ''}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Arwign Blog — Planning Tips &amp; Inspiration</title>
    <link>${BASE}/blog</link>
    <description>Productivity guides, digital planner tutorials, and planning inspiration from Arwign Planners.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
