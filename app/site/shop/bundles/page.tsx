import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/JsonLd'
import BundlesClient from './BundlesClient'
import type { Product } from '@/types/database'

const BASE = 'https://www.arwignplanners.com'

// ── Curated section layout ──────────────────────────────────────
// Maps theme sections to bundle slugs. Any active bundle not listed
// here automatically falls into the "More Ways to Bundle & Save"
// section below, so newly added bundles always surface somewhere.
const SECTIONS: { title: string; subtitle: string; slugs: string[] }[] = [
  { title: 'Calm & Wellness',        subtitle: 'Slow down, check in, breathe',        slugs: ['calm-collection', 'fitness-wellness-pack'] },
  { title: 'Family & Life Stages',   subtitle: 'Built around what you\'re going through', slugs: ['new-mum-kit'] },
  { title: 'Focus & Neurodivergent', subtitle: 'Flexible structure, zero overwhelm',  slugs: ['neurodivergent-set'] },
  { title: 'Students',               subtitle: 'Survive the term, ace the exams',     slugs: ['student-starter-pack', 'student-life-bundle'] },
  { title: 'Money & Budgeting',      subtitle: 'Get clear, stay on track',            slugs: ['budget-reset-kit'] },
  { title: 'Style & Aesthetic',      subtitle: 'Planning that looks as good as it works', slugs: ['digital-planner-trio', 'creative-aesthetic-bundle'] },
]

const FEATURED_SLUG = 'complete-planner-bundle'

async function getBundles() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('status', 'active')
    .eq('is_bundle', true)
    .order('created_at', { ascending: true })
  if (error) console.error('[getBundles]', error)
  return (data ?? []) as Product[]
}

export const metadata: Metadata = {
  title: 'Planner Bundles — Curated Collections | Arwign Planners',
  description: 'Shop curated planner bundles built around what you\'re going through — calm & wellness, new motherhood, ADHD-friendly planning, student life, budgeting and more. Save up to 35% vs buying individually.',
  alternates: { canonical: `${BASE}/shop/bundles` },
  openGraph: {
    title: 'Planner Bundles — Curated Collections | Arwign Planners',
    description: 'Curated planner collections for every life stage and need, at bundle savings.',
  },
}

export default async function BundlesPage() {
  const bundles = await getBundles()
  const byslug = new Map(bundles.map((b) => [b.slug, b]))

  const featured = byslug.get(FEATURED_SLUG) ?? null

  const sections = SECTIONS
    .map((s) => ({ ...s, items: s.slugs.map((slug) => byslug.get(slug)).filter((b): b is Product => !!b) }))
    .filter((s) => s.items.length > 0)

  const placed = new Set([FEATURED_SLUG, ...sections.flatMap((s) => s.items.map((i) => i.slug))])
  const leftovers = bundles.filter((b) => !placed.has(b.slug))

  const allSections = leftovers.length > 0
    ? [...sections, { title: 'More Ways to Bundle & Save', subtitle: 'Every bundle, all in one place', items: leftovers }]
    : sections

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Shop', url: `${BASE}/shop` },
        { name: 'Bundles', url: `${BASE}/shop/bundles` },
      ]} />
      <ItemListSchema
        name="Planner Bundle Collections"
        url={`${BASE}/shop/bundles`}
        items={bundles.map((b, i) => ({ name: b.title, url: `${BASE}/shop/${b.slug}`, position: i + 1 }))}
      />
      <BundlesClient featured={featured} sections={allSections} />
    </>
  )
}
