// TEMPORARY verification endpoint — removed in the next commit. READ-ONLY.
// Confirms the service-role key authenticates and can sign a private-bucket
// download URL — i.e. that checkout fulfilment (service-role writes) and digital
// downloads will work. Writes nothing; returns booleans only (no key, no PII).
// Guarded by the SHA-256 of a random 384-bit token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '795bc8d401d3a64b0056bc55d120f31682af365dd1d3b9975406d016c68e7c4d'
const TEST_PRODUCT_SLUG = 'paid'

function toStoragePath(url: string): string | null {
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, '')
  const m = url.match(/\/product-files\/(.+?)(?:\?|$)/)
  return m ? decodeURIComponent(m[1]) : null
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1. Does the service-role key authenticate? (HEAD count on RLS-restricted
  //    tables — no rows, no data returned; we only read whether it errored.)
  const probe = async (table: string) => {
    const { error } = await db.from(table).select('id', { count: 'exact', head: true })
    return { ok: !error, error: error?.message ?? null }
  }
  const [orders, profiles] = await Promise.all([probe('orders'), probe('profiles')])
  const serviceRoleAuth = orders.ok && profiles.ok

  // 2. Can it sign a download URL on the private files bucket? (The exact
  //    read-only operation the /api/download route performs.)
  const { data: product, error: prodErr } = await db
    .from('products').select('id, planner_files, file_url')
    .eq('slug', TEST_PRODUCT_SLUG).eq('status', 'active').single()
  const pf = (product?.planner_files ?? {}) as Record<string, { url?: string }>
  const rawUrl = pf.a4?.url ?? pf.a5?.url ?? pf.us_letter?.url ?? product?.file_url ?? null
  const path = rawUrl ? toStoragePath(rawUrl) : null

  let signedUrlOk = false, fileHttp = 0, signErr: string | null = null
  if (serviceRoleAuth && path) {
    const { data: signed, error } = await db.storage.from('product-files').createSignedUrl(path, 600)
    signErr = error?.message ?? null
    if (signed?.signedUrl) {
      signedUrlOk = true
      try { const r = await fetch(signed.signedUrl, { method: 'HEAD' }); fileHttp = r.status } catch {}
    }
  }

  return NextResponse.json({
    ok: true,
    serviceRoleAuth,                              // key authenticates -> checkout writes will work
    reads: { orders, profiles },
    download: {
      productReadOk: !prodErr && !!product,
      hasFilePath: !!path,
      signedUrlOk,                                // service-role can sign private-bucket URLs
      fileHttp,                                   // 200 = the actual file exists & downloads
      signErr,
    },
  })
}
