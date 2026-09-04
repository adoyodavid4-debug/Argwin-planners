// app/site/page.tsx — homepage (minimal: hero + best sellers + featured catalogue)
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

import HomeHero            from './_home/HomeHero'
import BestSellerShowcase  from './_home/BestSellerShowcase'
import StickyShopCTA       from './_home/StickyShopCTA'
import FeaturedProducts    from '@/components/home/FeaturedProducts'

export const metadata: Metadata = {
  title: 'Arwign Planners — Premium Digital & Printable Planners',
  description: 'Shop premium digital planners, printable planners, budget trackers, habit trackers, wellness planners, and ADHD planners. Instant download. GoodNotes ready.',
  alternates: { canonical: 'https://www.arwignplanners.com' },
}

async function getBestSellers() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .order('download_count', { ascending: false })
    .limit(8)
  return data ?? []
}

// Featured planners for the homepage catalogue. Prefers is_featured; if none are
// flagged yet, falls back to the most-downloaded active planners so the section
// is never empty.
async function getFeatured() {
  const supabase = createServerSupabaseClient()
  const cols = '*, category:categories(name, slug)'
  const { data: featured } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('download_count', { ascending: false })
    .limit(8)
  if (featured && featured.length > 0) return featured
  const { data: top } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .order('download_count', { ascending: false })
    .limit(8)
  return top ?? []
}

async function getHeroBestSellerCovers() {
  const supabase = createServerSupabaseClient()
  const cols = 'title, slug, thumbnail'
  const { data: flagged } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .not('thumbnail', 'is', null)
    .order('download_count', { ascending: false })
    .limit(3)
  if (flagged && flagged.length > 0) return flagged
  const { data: top } = await supabase
    .from('products')
    .select(cols)
    .eq('status', 'active')
    .not('thumbnail', 'is', null)
    .order('download_count', { ascending: false })
    .limit(3)
  return top ?? []
}

async function getHeroNewArrival() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('id, title, slug, price, currency, thumbnail, rating_avg, rating_count')
    .eq('status', 'active')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

async function getHeroSettings() {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['hero_eyebrow', 'hero_headline', 'hero_headline_accent', 'hero_subcopy'])

    const map: Record<string, unknown> = {}
    for (const row of data ?? []) map[row.key] = row.value
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
    return {
      eyebrow:        str(map.hero_eyebrow),
      headline:       str(map.hero_headline),
      headlineAccent: str(map.hero_headline_accent),
      subcopy:        str(map.hero_subcopy),
    }
  } catch {
    return { eyebrow: undefined, headline: undefined, headlineAccent: undefined, subcopy: undefined }
  }
}

export default async function HomePage() {
  const [bestsellers, featured, heroBestSellerCovers, heroNewArrival, heroCopy] = await Promise.all([
    getBestSellers(),
    getFeatured(),
    getHeroBestSellerCovers(),
    getHeroNewArrival(),
    getHeroSettings(),
  ])
  const heroBestSeller = bestsellers[0] ?? null

  return (
    <>
      <HomeHero
        bestSeller={heroBestSeller as any}
        bestSellerCovers={heroBestSellerCovers as any}
        newArrival={heroNewArrival as any}
        eyebrow={heroCopy.eyebrow}
        headline={heroCopy.headline}
        headlineAccent={heroCopy.headlineAccent}
        subcopy={heroCopy.subcopy}
      />
      <div className="cv-auto"><BestSellerShowcase products={bestsellers as any} /></div>
      <div className="cv-auto">
        <FeaturedProducts products={featured as any} title="Featured Planners" showAll="/shop" />
      </div>
      <StickyShopCTA />
    </>
  )
}
