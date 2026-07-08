// components/home/TestimonialsSectionServer.tsx — thin server wrapper
// Fetches active testimonials + aggregate stats from Supabase and passes them
// into the presentational TestimonialsSection. When the table is empty or the
// fetch fails, no props are passed and the hardcoded fallback renders.
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OrganizationReviewSchema } from '@/components/seo/JsonLd'
import TestimonialsSection, { type TestimonialInput } from './TestimonialsSection'

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}

export default async function TestimonialsSectionServer() {
  let testimonials: TestimonialInput[] | undefined
  let rating: string | undefined
  let reviews: string | undefined
  let customers: string | undefined

  try {
    const supabase = createServerSupabaseClient()
    const [{ data: rows }, { data: settings }] = await Promise.all([
      supabase
        .from('testimonials')
        .select('name, role, quote, rating, product_label, gradient, is_featured')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['stats_rating', 'stats_reviews', 'stats_customers']),
    ])

    if (rows && rows.length > 0) testimonials = rows as TestimonialInput[]

    const map: Record<string, unknown> = {}
    for (const row of settings ?? []) map[row.key] = row.value
    rating    = str(map.stats_rating)
    reviews   = str(map.stats_reviews)
    customers = str(map.stats_customers)
  } catch {
    // fall back to hardcoded content inside TestimonialsSection
  }

  // Only emit Review/AggregateRating schema for real, DB-backed testimonials —
  // never for the hardcoded placeholder copy TestimonialsSection falls back to.
  const hasRealReviews = !!testimonials && testimonials.length > 0
  const avgRating = hasRealReviews
    ? testimonials!.reduce((sum, t) => sum + t.rating, 0) / testimonials!.length
    : 0

  return (
    <>
      {hasRealReviews && (
        <OrganizationReviewSchema
          ratingValue={avgRating}
          reviewCount={testimonials!.length}
          reviews={testimonials!.map((t) => ({ author: t.name, ratingValue: t.rating, reviewBody: t.quote }))}
        />
      )}
      <TestimonialsSection
        testimonials={testimonials}
        rating={rating}
        reviews={reviews}
        customers={customers}
      />
    </>
  )
}
