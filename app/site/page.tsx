// app/site/page.tsx — homepage
import type { Metadata } from 'next'
import HeroSection          from '@/components/home/HeroSection'
import CategoryGrid         from '@/components/home/CategoryGrid'
import FeaturedProducts     from '@/components/home/FeaturedProducts'
import BenefitsStrip        from '@/components/home/BenefitsStrip'
import TestimonialsSection  from '@/components/home/TestimonialsSection'
import BlogPreview          from '@/components/home/BlogPreview'
import TrustSection         from '@/components/home/TrustSection'
import MarqueeBar           from '@/components/home/MarqueeBar'
import { LifestyleBanner }  from '@/components/home/HomeComponents'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Arwign Planners — Premium Digital & Printable Planners',
  description: 'Shop premium digital planners, printable planners, budget trackers, habit trackers, wellness planners, and ADHD planners. Instant download. GoodNotes ready.',
  alternates: { canonical: 'https://arwignplanners.com' },
}

async function getFeaturedProducts() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('download_count', { ascending: false })
    .limit(8)
  return data ?? []
}

async function getBestSellers() {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_bestseller', true)
    .order('rating_avg', { ascending: false })
    .limit(4)
  return data ?? []
}

export default async function HomePage() {
  const [featured, bestsellers] = await Promise.all([
    getFeaturedProducts(),
    getBestSellers(),
  ])

  return (
    <>
      <HeroSection />
      <MarqueeBar />
      <BenefitsStrip />
      <CategoryGrid />
      <LifestyleBanner />
      <FeaturedProducts products={featured} title="Featured Planners" />
      <TrustSection />
      <FeaturedProducts products={bestsellers} title="Best Sellers" showAll="/best-sellers" />
      <TestimonialsSection />
      <BlogPreview />
    </>
  )
}
