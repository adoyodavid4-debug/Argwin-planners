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

  // URLs use the clean public paths (what page canonicals declare), NOT the
  // internal /site/* routes those rewrite onto.
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/shop/bundles`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/best-sellers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/new-arrivals`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/notebooks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE}/notebooks/personalized`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/notebooks/general`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/calendar`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/calendar/subscribe/plus`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/calendar/subscribe/teams`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/refund`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${BASE}/shop/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly' as const, priority: 0.8,
  }))

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE}/shop/category/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7,
  }))

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const magnetPages: MetadataRoute.Sitemap = (magnets ?? []).map((m) => ({
    url: `${BASE}/free/${m.slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages, ...magnetPages]
}
