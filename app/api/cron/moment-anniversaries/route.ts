import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { celebrateAnniversaries } from '@/lib/calendar/anniversaries'

export const dynamic = 'force-dynamic'

// Standalone anniversary sweep — for manual/testing triggers. The automatic
// daily run is folded into /api/cron/daily-briefing so no extra Vercel cron
// entry is required (Hobby plan couples cron config to the deploy pipeline).
async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const result = await celebrateAnniversaries(supabase, getEmailProvider(), new Date())
  return NextResponse.json({ ok: true, ...result })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
