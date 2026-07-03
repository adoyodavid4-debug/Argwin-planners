// components/home/CategoryGridServer.tsx — thin server wrapper
// Fetches categories from Supabase and passes them into the presentational
// CategoryGrid. Falls back to the hardcoded 13 categories on failure.
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CategoryGrid, { type CategoryInput } from './CategoryGrid'

export default async function CategoryGridServer() {
  let dbCategories: CategoryInput[] | undefined

  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('categories')
      .select('name, slug, icon')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (data && data.length > 0) dbCategories = data as CategoryInput[]
  } catch {
    // fall back to hardcoded categories inside CategoryGrid
  }

  return <CategoryGrid dbCategories={dbCategories} />
}
