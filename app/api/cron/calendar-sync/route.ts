import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncIntegration } from '@/lib/calendar/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Vercel Cron. Syncs every connected Google/Microsoft account. Invoked via GET
// with an auto-injected Bearer CRON_SECRET header.
async function run(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const { data: integrations } = await supabase
    .from('calendar_integrations').select('*')
    .in('provider', ['google', 'microsoft']).eq('status', 'connected')

  let accounts = 0
  const totals = { pulled: 0, pushed: 0, deleted: 0 }
  for (const integ of (integrations ?? []) as any[]) {
    const r = await syncIntegration(supabase, integ)
    totals.pulled += r.pulled; totals.pushed += r.pushed; totals.deleted += r.deleted
    accounts++
  }
  return NextResponse.json({ ok: true, accounts, ...totals })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
