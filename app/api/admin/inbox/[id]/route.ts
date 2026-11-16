// Inbox actions: PATCH = take over / return to agent; POST = manual human reply.
// Human replies go through the same pacing queue (consent, window and quiet
// hours are re-checked at send time, exactly like agent messages).
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { queueOutbound } from '@/lib/agents/sales/pacing'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { takeover } = await req.json() as { takeover: boolean }
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('sa_conversations')
    .update({ human_takeover: takeover, status: takeover ? 'human' : 'open' })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ag_audit_log').insert({
    agent_key: 'sales',
    action: takeover ? 'conversation_taken_over' : 'conversation_returned_to_agent',
    detail: { conversation_id: params.id },
  })
  return NextResponse.json({ ok: true, takeover })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { body } = await req.json() as { body: string }
  if (!body?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const supabaseAuth = createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  const supabase = createServiceRoleClient()
  const { data: convo } = await supabase
    .from('sa_conversations')
    .select('id, lead_id, channel')
    .eq('id', params.id)
    .single()
  if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Record the human message immediately (shown in the thread as queued)
  await supabase.from('sa_messages').insert({
    conversation_id: convo.id,
    direction: 'out',
    body: body.trim(),
    sent_by: 'human',
    status: 'queued',
    meta: { admin_id: user?.id ?? null },
  })

  const result = await queueOutbound({
    leadId: convo.lead_id,
    conversationId: convo.id,
    channel: convo.channel as 'whatsapp' | 'instagram' | 'messenger',
    kind: 'reply',
    body: body.trim(),
  })

  return NextResponse.json({ ok: true, queued: result.queued })
}
