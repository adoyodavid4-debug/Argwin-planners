import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  label:      z.string().min(1),
  href:       z.string().min(1).default('#'),
  location:   z.enum(['header', 'footer_shop', 'footer_company', 'footer_support']).default('header'),
  parent_id:  z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active:  z.boolean().default(true),
})

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('nav_links')
    .select('*')
    .order('location', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('nav_links')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
