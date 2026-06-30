import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createServiceRoleClient()

  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, slug')

  if (catErr || !cats?.length) {
    return NextResponse.json({ error: 'Categories not found', detail: catErr?.message }, { status: 500 })
  }

  const id = (slug: string) => cats.find((c) => c.slug === slug)?.id ?? null

  const products = [
    {
      title: '2025 Ultimate Digital Planner', slug: 'ultimate-digital-planner-2025',
      description: 'A comprehensive all-in-one digital planner for GoodNotes, Notability and iPad.',
      category_id: id('digital-planners'), status: 'active', delivery_type: 'digital',
      price: 14.99, compare_price: 24.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: 365, file_size_mb: 18.5,
      is_featured: true, is_bestseller: true, is_new: false, is_bundle: false,
      tags: ['2025', 'digital', 'goodnotes', 'ipad'],
      download_count: 4823, rating_avg: 4.92, rating_count: 312, published_at: new Date().toISOString(),
    },
    {
      title: 'Minimalist Digital Planner — Undated', slug: 'minimalist-digital-planner-undated',
      description: 'Clean, distraction-free digital planner. Start any day of the year.',
      category_id: id('digital-planners'), status: 'active', delivery_type: 'digital',
      price: 9.99, compare_price: null, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes'], page_count: 240, file_size_mb: 9.2,
      is_featured: false, is_bestseller: false, is_new: true, is_bundle: false,
      tags: ['undated', 'minimalist', 'digital'],
      download_count: 1203, rating_avg: 4.75, rating_count: 89, published_at: new Date().toISOString(),
    },
    {
      title: 'Dark Mode Digital Planner 2025', slug: 'dark-mode-digital-planner-2025',
      description: 'Sleek dark-themed digital planner easy on the eyes during late-night planning sessions.',
      category_id: id('digital-planners'), status: 'active', delivery_type: 'digital',
      price: 12.99, compare_price: 19.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability', 'Xodo'], page_count: 300, file_size_mb: 14.0,
      is_featured: false, is_bestseller: true, is_new: false, is_bundle: false,
      tags: ['dark mode', 'digital', '2025'],
      download_count: 2941, rating_avg: 4.88, rating_count: 201, published_at: new Date().toISOString(),
    },
    {
      title: 'A5 Printable Weekly Planner Pack', slug: 'a5-printable-weekly-planner-pack',
      description: 'Beautifully designed A5 printable weekly planner pages.',
      category_id: id('printable-planners'), status: 'active', delivery_type: 'printable',
      price: 6.99, compare_price: null, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'],
      file_formats: ['PDF'], page_count: 120, file_size_mb: 4.5,
      is_featured: false, is_bestseller: false, is_new: false, is_bundle: false,
      tags: ['printable', 'A5', 'weekly'],
      download_count: 870, rating_avg: 4.60, rating_count: 54, published_at: new Date().toISOString(),
    },
    {
      title: 'Botanical Printable Planner Set', slug: 'botanical-printable-planner-set',
      description: 'Gorgeous botanical-themed printable planner with watercolour floral accents.',
      category_id: id('printable-planners'), status: 'active', delivery_type: 'printable',
      price: 8.99, compare_price: 12.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'],
      file_formats: ['PDF'], page_count: 85, file_size_mb: 6.2,
      is_featured: true, is_bestseller: false, is_new: true, is_bundle: false,
      tags: ['printable', 'botanical', 'floral'],
      download_count: 640, rating_avg: 4.82, rating_count: 47, published_at: new Date().toISOString(),
    },
    {
      title: 'Monthly Budget Planner & Finance Tracker', slug: 'monthly-budget-planner-finance-tracker',
      description: 'Take control of your finances with this detailed budget planner.',
      category_id: id('budget-planners'), status: 'active', delivery_type: 'digital',
      price: 11.99, compare_price: 17.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes'], page_count: 180, file_size_mb: 8.0,
      is_featured: true, is_bestseller: true, is_new: false, is_bundle: false,
      tags: ['budget', 'finance', 'savings'],
      download_count: 3102, rating_avg: 4.95, rating_count: 278, published_at: new Date().toISOString(),
    },
    {
      title: 'Academic Digital Planner 2025–2026', slug: 'academic-digital-planner-2025-2026',
      description: 'Designed for students and educators. Runs August 2025 – July 2026.',
      category_id: id('student-planners'), status: 'active', delivery_type: 'digital',
      price: 12.99, compare_price: 18.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: 280, file_size_mb: 11.0,
      is_featured: false, is_bestseller: true, is_new: true, is_bundle: false,
      tags: ['student', 'academic', 'school'],
      download_count: 1876, rating_avg: 4.89, rating_count: 143, published_at: new Date().toISOString(),
    },
    {
      title: 'Self-Care & Wellness Journal', slug: 'self-care-wellness-journal',
      description: 'Nurture your mental and physical wellbeing with daily mood check-ins and gratitude prompts.',
      category_id: id('wellness-planners'), status: 'active', delivery_type: 'digital',
      price: 10.99, compare_price: 14.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes'], page_count: 200, file_size_mb: 7.5,
      is_featured: true, is_bestseller: false, is_new: false, is_bundle: false,
      tags: ['wellness', 'self-care', 'gratitude'],
      download_count: 2345, rating_avg: 4.91, rating_count: 188, published_at: new Date().toISOString(),
    },
    {
      title: 'Fitness & Nutrition Tracker', slug: 'fitness-nutrition-tracker',
      description: 'All-in-one fitness planner with workout log, meal planner, and calorie tracker.',
      category_id: id('wellness-planners'), status: 'active', delivery_type: 'digital',
      price: 9.99, compare_price: null, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: 150, file_size_mb: 6.0,
      is_featured: false, is_bestseller: false, is_new: true, is_bundle: false,
      tags: ['fitness', 'nutrition', 'workout'],
      download_count: 987, rating_avg: 4.78, rating_count: 76, published_at: new Date().toISOString(),
    },
    {
      title: '66-Day Habit Tracker — Printable', slug: '66-day-habit-tracker-printable',
      description: 'Build lasting habits in 66 days with this research-backed tracker.',
      category_id: id('habit-trackers'), status: 'active', delivery_type: 'printable',
      price: 4.99, compare_price: null, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'],
      file_formats: ['PDF'], page_count: 40, file_size_mb: 2.5,
      is_featured: false, is_bestseller: true, is_new: false, is_bundle: false,
      tags: ['habit tracker', '66 days', 'printable'],
      download_count: 5612, rating_avg: 4.97, rating_count: 421, published_at: new Date().toISOString(),
    },
    {
      title: 'Monthly Habit & Mood Tracker — Digital', slug: 'monthly-habit-mood-tracker-digital',
      description: 'Track up to 20 habits and your daily mood in one beautiful spread.',
      category_id: id('habit-trackers'), status: 'active', delivery_type: 'digital',
      price: 6.99, compare_price: 9.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1590402494610-2c378a9114c6?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1590402494610-2c378a9114c6?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: 24, file_size_mb: 3.2,
      is_featured: false, is_bestseller: false, is_new: false, is_bundle: false,
      tags: ['habit tracker', 'mood tracker', 'monthly'],
      download_count: 1432, rating_avg: 4.83, rating_count: 112, published_at: new Date().toISOString(),
    },
    {
      title: 'The Complete Planner Bundle — 8 Planners', slug: 'complete-planner-bundle',
      description: 'Get all our bestsellers in one value bundle. Over 60% off individual prices.',
      category_id: id('planner-bundles'), status: 'active', delivery_type: 'bundle',
      price: 39.99, compare_price: 99.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: null, file_size_mb: 85.0,
      is_featured: true, is_bestseller: true, is_new: false, is_bundle: true,
      tags: ['bundle', 'value', 'best value'],
      download_count: 2109, rating_avg: 4.96, rating_count: 234, published_at: new Date().toISOString(),
    },
    {
      title: 'Student Life Bundle — 3 Planners', slug: 'student-life-bundle',
      description: 'Everything a student needs. Save 45% vs buying separately.',
      category_id: id('planner-bundles'), status: 'active', delivery_type: 'bundle',
      price: 19.99, compare_price: 36.99, currency: 'USD',
      thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'],
      file_formats: ['PDF', 'GoodNotes', 'Notability'], page_count: null, file_size_mb: 22.0,
      is_featured: false, is_bestseller: false, is_new: true, is_bundle: true,
      tags: ['student bundle', 'academic', 'value'],
      download_count: 678, rating_avg: 4.85, rating_count: 58, published_at: new Date().toISOString(),
    },
  ]

  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'slug', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, seeded: products.length })
}
