import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name:          z.string().min(1).optional(),
  role:          z.string().optional(),
  quote:         z.string().min(1).optional(),
  rating:        z.number().int().min(1).max(5).optional(),
  product_label: z.string().nullable().optional(),
  gradient:      z.string().optional(),
  is_featured:   z.boolean().optional(),
  is_active:     z.boolean().optional(),
  sort_order:    z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('testimonials')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('testimonials').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
