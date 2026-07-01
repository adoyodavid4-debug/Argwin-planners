// app/site/page.tsx — homepage
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Reused existing sections (imported, not modified)
import CategoryGrid            from '@/components/home/CategoryGrid'
import DigitalNotebookSection  from '@/components/home/digital-notebook/DigitalNotebookSection'
import NewArrivals, { NewArrivalsSkeleton } from '@/components/home/NewArrivals'
import TestimonialsSection     from '@/components/home/TestimonialsSection'
import BlogPreview             from '@/components/home/BlogPreview'

// New homepage-only sections
import HomeHero            from './_home/HomeHero'
import SocialProof         from './_home/SocialProof'
import BestSellerShowcase  from './_home/BestSellerShowcase'
import InteriorPreview     from './_home/InteriorPreview'
import HomeNewsletter      from './_home/HomeNewsletter'
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

export default async function HomePage() {
  const bestsellers = await getBestSellers()

  return (
    <>
      <HomeHero />
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
      <HomeNewsletter />
      <FinalCTA />
      <StickyShopCTA />
    </>
  )
}
