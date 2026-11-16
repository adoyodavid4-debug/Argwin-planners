// Catalogue tools shared by every agent (masterplan §3.3).
// THE source of truth for prices, page counts, sizes and features —
// agents must never state product facts that don't come from here.
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface CataloguePlanner {
  id: string
  title: string
  slug: string
  description: string | null
  price: number
  currency: string
  page_count: number | null
  file_formats: string[]
  tags: string[]
  thumbnail: string | null
  images: string[]
  is_bundle: boolean
  category_id: string | null
  rating_avg: number
  rating_count: number
}

const PLANNER_FIELDS =
  'id, title, slug, description, price, currency, page_count, file_formats, tags, thumbnail, images, is_bundle, category_id, rating_avg, rating_count'

export async function searchCatalogue(query: string, limit = 5): Promise<CataloguePlanner[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select(PLANNER_FIELDS)
    .eq('status', 'active')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .limit(limit)
  return (data ?? []) as CataloguePlanner[]
}

export async function getPlanner(id: string): Promise<CataloguePlanner | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select(PLANNER_FIELDS)
    .eq('id', id)
    .single()
  return data as CataloguePlanner | null
}

export async function listActivePlanners(limit = 100): Promise<CataloguePlanner[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select(PLANNER_FIELDS)
    .eq('status', 'active')
    .order('download_count', { ascending: false })
    .limit(limit)
  return (data ?? []) as CataloguePlanner[]
}

/** Format a planner as a factual context block for an LLM prompt. */
export function plannerFacts(p: CataloguePlanner): string {
  return [
    `Title: ${p.title}`,
    `Price: ${p.currency} ${p.price}`,
    p.page_count ? `Pages: ${p.page_count}` : null,
    `Formats: ${p.file_formats.join(', ') || 'PDF'}`,
    `Sizes: A4, US Letter, A5 (all planners include all three)`,
    `Compatible with: GoodNotes and Notability on iPad`,
    p.rating_count > 0 ? `Rating: ${p.rating_avg.toFixed(1)} from ${p.rating_count} reviews` : null,
    `URL: https://www.arwignplanners.com/products/${p.slug}`,
  ].filter(Boolean).join('\n')
}
