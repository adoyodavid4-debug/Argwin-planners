import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  pod_package_id:   z.string().min(1).optional(),
  interior_pdf_url: z.string().url().optional(),
  cover_pdf_url:    z.string().url().optional(),
  base_cost:        z.number().int().min(1).optional(),
  retail_price:     z.number().int().min(1).optional(),
  min_margin_pct:   z.number().int().min(0).optional(),
  is_active:        z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()

  // Re-check margin if either price is being updated
  if (parsed.data.retail_price !== undefined || parsed.data.base_cost !== undefined) {
    const { data: existing } = await supabase
      .from('print_products').select('base_cost, retail_price, min_margin_pct, currency').eq('id', params.id).single()
    if (existing) {
      const base     = parsed.data.base_cost    ?? existing.base_cost
      const retail   = parsed.data.retail_price ?? existing.retail_price
      const margin   = parsed.data.min_margin_pct ?? existing.min_margin_pct
      const minReq   = Math.ceil(base * (1 + margin / 100))
      if (retail < minReq) {
        return NextResponse.json({
          error: `Retail price (${retail} ${existing.currency}) is below minimum (${minReq} ${existing.currency}) at ${margin}% margin.`,
        }, { status: 422 })
      }
    }
  }

  const { data, error } = await supabase
    .from('print_products').update(parsed.data).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('print_products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
