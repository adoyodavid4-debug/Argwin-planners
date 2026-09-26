// app/api/health/route.ts
// Two-key Supabase health monitor. Point an uptime service (UptimeRobot,
// Better Stack, Vercel monitor, etc.) at /api/health:
//   • HTTP 200  → both keys authenticate, storefront + checkout/downloads healthy
//   • HTTP 503  → one or both keys are failing (details in the body)
//
// The anon check reads publicly-readable data (products) with the publishable
// key; the service-role check reads an RLS-restricted table (orders) with the
// secret key — a read only the service role can do, so success proves the secret
// key authenticates. Returns booleans + Supabase's own error text only — never a
// key value and never any row data.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Check = { ok: boolean; error?: string }

async function probe(key: string | undefined, table: string): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !key) return { ok: false, error: 'env var missing' }
  try {
    const db = createClient(url, key)
    // HEAD count → no rows, no data returned; we only read whether it errored.
    const { error } = await db.from(table).select('id', { count: 'exact', head: true })
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'request failed' }
  }
}

export async function GET() {
  // anon/publishable key → public read (products is readable by the anon role);
  // service-role/secret key → RLS-restricted read (orders is not).
  const [supabaseAnon, supabaseServiceRole] = await Promise.all([
    probe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'products'),
    probe(process.env.SUPABASE_SERVICE_ROLE_KEY, 'orders'),
  ])

  const healthy = supabaseAnon.ok && supabaseServiceRole.ok

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks: { supabaseAnon, supabaseServiceRole },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}

// Cheap liveness ping for monitors that use HEAD — no DB calls.
export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
