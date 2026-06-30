import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'

export async function POST(req: NextRequest) {
  const provider = getEmailProvider()
  const result = await provider.verifyAndParseWebhook(req)

  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find subscriber by email
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, status')
    .eq('email', result.email)
    .single()

  if (!sub) {
    // Log but don't error — we may have cleaned up the subscriber
    return NextResponse.json({ ok: true })
  }

  // Record the event
  await supabase.from('email_events').insert({
    subscriber_id: sub.id,
    type: result.type,
    meta: result.meta ?? {},
  })

  // Update subscriber status for hard bounces and complaints
  if (result.type === 'bounced') {
    await Promise.all([
      supabase.from('subscribers').update({ status: 'bounced' }).eq('id', sub.id),
      supabase.from('subscriber_sequence_state').update({ status: 'exited' })
        .eq('subscriber_id', sub.id).eq('status', 'active'),
    ])
  }

  if (result.type === 'complaint') {
    await Promise.all([
      supabase.from('subscribers').update({ status: 'complained' }).eq('id', sub.id),
      supabase.from('subscriber_sequence_state').update({ status: 'exited' })
        .eq('subscriber_id', sub.id).eq('status', 'active'),
    ])
  }

  if (result.type === 'unsubscribed') {
    await Promise.all([
      supabase.from('subscribers').update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      }).eq('id', sub.id),
      supabase.from('subscriber_sequence_state').update({ status: 'exited' })
        .eq('subscriber_id', sub.id).eq('status', 'active'),
    ])
  }

  return NextResponse.json({ ok: true })
}
