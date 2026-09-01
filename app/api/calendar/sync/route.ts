import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { syncIntegration } from '@/lib/calendar/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/calendar/sync — sync all of the signed-in user's connected accounts.
export async function POST(_req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integrations } = await supabase
    .from('calendar_integrations').select('*')
    .in('provider', ['google', 'microsoft']).eq('status', 'connected')

  const totals = { pulled: 0, pushed: 0, deleted: 0 }
  const errors: string[] = []
  for (const integ of (integrations ?? []) as any[]) {
    const r = await syncIntegration(supabase, integ)
    totals.pulled += r.pulled; totals.pushed += r.pushed; totals.deleted += r.deleted
    if (r.error) errors.push(`${integ.provider}: ${r.error}`)
  }
  return NextResponse.json({ ok: true, ...totals, errors })
}

// DELETE /api/calendar/sync?provider=google — disconnect an account.
export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const provider = req.nextUrl.searchParams.get('provider')
  if (provider) await supabase.from('calendar_integrations').delete().eq('provider', provider)
  return NextResponse.json({ ok: true })
}
