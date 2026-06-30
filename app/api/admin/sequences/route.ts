import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const stepSchema = z.object({
  step_order:     z.number().int().min(0),
  delay_hours:    z.number().int().min(0),
  template_key:   z.string().min(1),
  subject_i18n:   z.record(z.string()).default({}),
  body_i18n:      z.record(z.string()).default({}),
  cta_i18n:       z.record(z.string()).default({}),
  data_overrides: z.record(z.unknown()).optional(),
})

const seqSchema = z.object({
  slug:      z.string().min(1),
  name:      z.string().min(1),
  trigger:   z.enum(['on_confirm', 'on_tag']).default('on_confirm'),
  is_active: z.boolean().default(false),
  steps:     z.array(stepSchema).optional(),
})

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('email_sequences')
    .select('*, email_sequence_steps(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = seqSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { steps, ...seqData } = parsed.data
  const supabase = createServiceRoleClient()

  const { data: seq, error } = await supabase.from('email_sequences').insert(seqData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (steps?.length) {
    const stepsWithSeqId = steps.map((s) => ({ ...s, sequence_id: seq.id }))
    await supabase.from('email_sequence_steps').insert(stepsWithSeqId)
  }

  return NextResponse.json(seq, { status: 201 })
}
