import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MIN_MARGIN_PCT = 30

const schema = z.object({
  product_id:       z.string().uuid(),
  provider:         z.string().default('lulu'),
  pod_package_id:   z.string().min(1),
  interior_pdf_url: z.string().url(),
  cover_pdf_url:    z.string().url(),
  base_cost:        z.number().int().min(1),  // minor units
  retail_price:     z.number().int().min(1),  // minor units
  currency:         z.string().default('USD'),
  min_margin_pct:   z.number().int().min(0).default(MIN_MARGIN_PCT),
  is_active:        z.boolean().default(false),
})

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('print_products')
    .select('*, products(title, slug, status)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // Margin guard
  const minRequired = Math.ceil(d.base_cost * (1 + d.min_margin_pct / 100))
  if (d.retail_price < minRequired) {
    return NextResponse.json({
      error: `Retail price (${d.retail_price} ${d.currency}) is below the minimum required (${minRequired} ${d.currency}) at ${d.min_margin_pct}% margin over base cost.`,
    }, { status: 422 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('print_products').insert(d).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
