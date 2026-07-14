import { createServiceRoleClient } from '@/lib/supabase/server'

// Image sitemap for Google Images. Hand-written XML because Next's
// MetadataRoute.Sitemap type cannot emit the image: namespace.
// The main sitemap lives in app/sitemap.ts — this route only adds images.

const BASE_URL = 'https://arwignplanners.com'

export const revalidate = 3600 // regenerate every hour, matching app/sitemap.ts

interface ProductRow {
  slug: string
  title: string
  thumbnail: string | null
  images: string[] | null
  preview_pages: string[] | null
}

export async function GET() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('products')
    .select('slug, title, thumbnail, images, preview_pages')
    .eq('status', 'active')

  if (error) {
    return new Response('Error building image sitemap', { status: 500 })
  }

  const products = (data ?? []) as ProductRow[]

  const urlEntries = products
    .map((product) => {
      const images = dedupe(
        [product.thumbnail, ...(product.images ?? []), ...(product.preview_pages ?? [])]
          .filter((src): src is string => Boolean(src))
          .map(toAbsolute)
          .filter(isOwnedHost)
      )

      if (images.length === 0) return null

      const imageTags = images
        .map(
          (src) => `    <image:image>
      <image:loc>${escapeXml(src)}</image:loc>
      <image:title>${escapeXml(product.title)}</image:title>
    </image:image>`
        )
        .join('\n')

      return `  <url>
    <loc>${BASE_URL}/site/shop/${escapeXml(product.slug)}</loc>
${imageTags}
  </url>`
    })
    .filter(Boolean)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

/** Google ignores relative <image:loc> values — every URL must be absolute. */
function toAbsolute(src: string): string {
  return src.startsWith('http') ? src : `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`
}

/**
 * Only claim images we actually host: our own domain or our Supabase
 * storage bucket. Third-party hosts (Unsplash placeholders etc.) are skipped.
 */
function isOwnedHost(src: string): boolean {
  try {
    const host = new URL(src).hostname
    if (host === 'arwignplanners.com' || host === 'www.arwignplanners.com') return true
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && host === new URL(supabaseUrl).hostname) return true
    return host.endsWith('.supabase.co')
  } catch {
    return false
  }
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

/** An unescaped & in a title malforms the XML and Google rejects the whole file. */
function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return char
    }
  })
}
