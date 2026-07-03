import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name:          z.string().min(1),
  role:          z.string().default(''),
  quote:         z.string().min(1),
  rating:        z.number().int().min(1).max(5).default(5),
  product_label: z.string().nullable().optional(),
  gradient:      z.string().optional(),
  is_featured:   z.boolean().default(false),
  is_active:     z.boolean().default(true),
  sort_order:    z.number().int().default(0),
})

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('testimonials')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
