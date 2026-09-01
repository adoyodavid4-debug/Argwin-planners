import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET → the public VAPID key (empty string until configured).
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' })
}

// POST → store this browser's push subscription for the signed-in user.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth, user_agent: req.headers.get('user-agent') ?? null },
    { onConflict: 'endpoint' },
  )
  return NextResponse.json({ ok: true })
}

// DELETE → remove a subscription by endpoint.
export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const endpoint = req.nextUrl.searchParams.get('endpoint')
  if (endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
