// app/api/admin/generator/route.ts
// GET — list planner templates with their linked product (if generated).

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('planner_templates')
    .select('id, name, slug, description, template_key, accent_hex, price, compare_price, category_slug, page_count, is_active, sort_order, last_generated_at, product_id, product:product_id(id, slug, status)')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
