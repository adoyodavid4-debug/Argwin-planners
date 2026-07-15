import type { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BASE = 'https://www.arwignplanners.com'

export const revalidate = 3600 // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient()

  const [
    { data: products },
    { data: categories },
    { data: posts },
    { data: magnets },
  ] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('status', 'active'),
    supabase.from('categories').select('slug'),
    supabase.from('blog_posts').select('slug, updated_at').eq('status', 'published'),
    supabase.from('lead_magnets').select('slug, updated_at').eq('is_active', true),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/site/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/site/notebooks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE}/site/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/site/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/site/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${BASE}/site/shop/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly' as const, priority: 0.8,
  }))

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE}/site/shop/category/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7,
  }))

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/site/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const magnetPages: MetadataRoute.Sitemap = (magnets ?? []).map((m) => ({
    url: `${BASE}/site/free/${m.slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages, ...magnetPages]
}
