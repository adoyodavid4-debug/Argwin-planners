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

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
  // HEAD count → returns no rows and no data; we only look at whether it errored.
  const probe = async (table: string) => {
    const { error } = await svc.from(table).select('id', { count: 'exact', head: true })
    return { ok: !error, error: error ? error.message : null }
  }

  const [orders, profiles] = await Promise.all([probe('orders'), probe('profiles')])
  const keyPresent = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').length > 0

  return NextResponse.json({
    ok: true,
    keyPresent,
    serviceRoleWorks: orders.ok && profiles.ok,
    reads: { orders: { ok: orders.ok, error: orders.error }, profiles: { ok: profiles.ok, error: profiles.error } },
  })
}
