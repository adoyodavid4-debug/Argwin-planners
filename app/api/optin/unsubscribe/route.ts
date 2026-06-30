import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/?unsubscribed=true', req.url))

  const supabase = createServiceRoleClient()

  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, email, locale')
    .eq('unsub_token', token)
    .single()

  if (!sub) return NextResponse.redirect(new URL('/?unsubscribed=true', req.url))

  // Mark unsubscribed + exit all active sequences
  await Promise.all([
    supabase.from('subscribers').update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    }).eq('id', sub.id),
    supabase.from('subscriber_sequence_state').update({ status: 'exited' })
      .eq('subscriber_id', sub.id)
      .eq('status', 'active'),
  ])

  // Sync unsubscribe to ESP
  try {
    const provider = getEmailProvider()
    await provider.upsertContact({
      email: sub.email,
      attributes: {},
      consent: { at: new Date().toISOString(), source: 'unsubscribe-link' },
    })
  } catch (err) {
    console.error('[unsubscribe] ESP sync failed:', err)
  }

  return NextResponse.redirect(new URL('/unsubscribed', req.url))
}
