import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  label:      z.string().min(1).optional(),
  href:       z.string().min(1).optional(),
  location:   z.enum(['header', 'footer_shop', 'footer_company', 'footer_support']).optional(),
  parent_id:  z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active:  z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('nav_links')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  // Children are removed via ON DELETE CASCADE on parent_id
  const { error } = await supabase.from('nav_links').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
