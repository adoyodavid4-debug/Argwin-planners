// app/site/page.tsx — homepage
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Reused existing sections (server wrappers fetch DB content w/ fallbacks)
import CategoryGrid            from '@/components/home/CategoryGridServer'
import DigitalNotebookSection  from '@/components/home/digital-notebook/DigitalNotebookSection'
import NewArrivals, { NewArrivalsSkeleton } from '@/components/home/NewArrivals'
import TestimonialsSection     from '@/components/home/TestimonialsSectionServer'
import BlogPreview             from '@/components/home/BlogPreview'

// New homepage-only sections
import HomeHero            from './_home/HomeHero'
import SocialProof         from './_home/SocialProof'
import BestSellerShowcase  from './_home/BestSellerShowcase'
import InteriorPreview     from './_home/InteriorPreview'
import StickyShopCTA       from './_home/StickyShopCTA'
import { WhyArwign, HowItWorks, FinalCTA } from './_home/EditorialSections'

export const metadata: Metadata = {
  title: 'Arwign Planners — Premium Digital & Printable Planners',
  description: 'Shop premium digital planners, printable planners, budget trackers, habit trackers, wellness planners, and ADHD planners. Instant download. GoodNotes ready.',
  alternates: { canonical: 'https://arwignplanners.com' },
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

// Hero copy from site_settings — missing keys fall back to the component's
// hardcoded defaults (undefined props).
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
  const [bestsellers, heroNewArrival, heroCopy] = await Promise.all([
    getBestSellers(),
    getHeroNewArrival(),
    getHeroSettings(),
  ])
  const heroBestSeller = bestsellers[0] ?? null

  return (
    <>
      <HomeHero
        bestSeller={heroBestSeller as any}
        newArrival={heroNewArrival as any}
        eyebrow={heroCopy.eyebrow}
        headline={heroCopy.headline}
        headlineAccent={heroCopy.headlineAccent}
        subcopy={heroCopy.subcopy}
      />
      <SocialProof />
      <CategoryGrid />
      <BestSellerShowcase products={bestsellers as any} />
      <DigitalNotebookSection />
      <WhyArwign />
      <InteriorPreview />
      <Suspense fallback={<NewArrivalsSkeleton />}>
        <NewArrivals />
      </Suspense>
      <HowItWorks />
      <BlogPreview />
      <TestimonialsSection />
      <FinalCTA />
      <StickyShopCTA />
    </>
  )
}
