import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['confirmed', 'unsubscribed']).optional(),
  tags:   z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceRoleClient()
  const updates: Record<string, unknown> = { ...parsed.data }

  if (parsed.data.status === 'unsubscribed') {
    updates.unsubscribed_at = new Date().toISOString()
    // Exit all active sequences
    await supabase.from('subscriber_sequence_state')
      .update({ status: 'exited' })
      .eq('subscriber_id', params.id)
      .eq('status', 'active')
  }

  const { data, error } = await supabase
    .from('subscribers').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
