import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  slug:               z.string().min(1),
  title_i18n:         z.record(z.string()),
  description_i18n:   z.record(z.string()),
  asset_path:         z.string().min(1),
  preview_image:      z.string().optional(),
  og_image:           z.string().optional(),
  pin_image:          z.string().optional(),
  enroll_sequence_id: z.string().uuid().optional().nullable(),
  is_active:          z.boolean().default(false),
})

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('lead_magnets')
    .select('*, email_sequences(slug, name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('lead_magnets').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
