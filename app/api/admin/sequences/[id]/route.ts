import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const stepSchema = z.object({
  id:             z.string().uuid().optional(),
  step_order:     z.number().int().min(0),
  delay_hours:    z.number().int().min(0),
  template_key:   z.string().min(1),
  subject_i18n:   z.record(z.string()).default({}),
  body_i18n:      z.record(z.string()).default({}),
  cta_i18n:       z.record(z.string()).default({}),
  data_overrides: z.record(z.unknown()).optional(),
})

const updateSchema = z.object({
  name:      z.string().min(1).optional(),
  trigger:   z.enum(['on_confirm', 'on_tag']).optional(),
  is_active: z.boolean().optional(),
  steps:     z.array(stepSchema).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('email_sequences')
    .select('*, email_sequence_steps(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { steps, ...seqData } = parsed.data
  const supabase = createServiceRoleClient()

  if (Object.keys(seqData).length) {
    const { error } = await supabase.from('email_sequences').update(seqData).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace all steps if provided (full replace strategy)
  if (steps) {
    await supabase.from('email_sequence_steps').delete().eq('sequence_id', params.id)
    if (steps.length) {
      const stepsWithSeqId = steps.map(({ id: _id, ...s }) => ({ ...s, sequence_id: params.id }))
      await supabase.from('email_sequence_steps').insert(stepsWithSeqId)
    }
  }

  const { data } = await supabase
    .from('email_sequences')
    .select('*, email_sequence_steps(*)')
    .eq('id', params.id)
    .single()

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('email_sequences').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
