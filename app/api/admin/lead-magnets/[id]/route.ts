import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  slug:               z.string().min(1).optional(),
  title_i18n:         z.record(z.string()).optional(),
  description_i18n:   z.record(z.string()).optional(),
  asset_path:         z.string().min(1).optional(),
  preview_image:      z.string().optional(),
  og_image:           z.string().optional(),
  pin_image:          z.string().optional(),
  enroll_sequence_id: z.string().uuid().nullable().optional(),
  is_active:          z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('lead_magnets').update(parsed.data).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('lead_magnets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
