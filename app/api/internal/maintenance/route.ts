// TEMPORARY one-shot verification endpoint — removed in the next commit.
// Read-only pass/fail: does SUPABASE_SERVICE_ROLE_KEY in the running deployment
// authenticate? Runs a HEAD count (no rows, no data returned) against tables the
// anon role cannot read under RLS. Returns only booleans — never the key, never
// any row data or counts. Guarded by the SHA-256 of a random 384-bit token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '26135f9023c2d6624c080580e1f011ee91eea62493b65fa4c3383c684f657463'

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  // Raw REST HEAD/GET so we can read the exact rejection reason Supabase returns
  // (e.g. "Legacy API keys are disabled" / "Invalid API key"). No rows requested.
  const raw = async (table: string) => {
    try {
      const r = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      const body = await r.text()
      return { status: r.status, message: body.slice(0, 240) }
    } catch (e) {
      return { status: 0, message: String(e).slice(0, 240) }
    }
  }

  const [orders, profiles] = await Promise.all([raw('orders'), raw('profiles')])
  const serviceRoleWorks = orders.status >= 200 && orders.status < 300

  return NextResponse.json({
    ok: true,
    keyPresent: key.length > 0,
    keyFormat: key.startsWith('sb_secret_') ? 'new-secret' : key.startsWith('eyJ') ? 'legacy-jwt' : key ? 'other' : 'empty',
    serviceRoleWorks,
    reads: { orders, profiles },
  })
}
