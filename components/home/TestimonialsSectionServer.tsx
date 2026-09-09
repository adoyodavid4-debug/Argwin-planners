// components/home/TestimonialsSectionServer.tsx — thin server wrapper
// Fetches active testimonials + aggregate stats from Supabase and passes them
// into the presentational TestimonialsSection. When the table is empty or the
// fetch fails, no props are passed and the hardcoded fallback renders.
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OrganizationReviewSchema } from '@/components/seo/JsonLd'
import TestimonialsSection, { type TestimonialInput } from './TestimonialsSection'

export default async function TestimonialsSectionServer() {
  let testimonials: TestimonialInput[] | undefined

  try {
    const supabase = createServerSupabaseClient()
    const { data: rows } = await supabase
      .from('testimonials')
      .select('name, role, quote, rating, product_label, gradient, is_featured')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (rows && rows.length > 0) testimonials = rows as TestimonialInput[]
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
      <TestimonialsSection testimonials={testimonials} />
    </>
  )
}
