// app/api/admin/uploads/route.ts
// Mints short-lived signed upload URLs so the admin browser can upload product
// media STRAIGHT to Supabase Storage, bypassing the 4.5 MB Vercel function body
// cap. Admin-guarded; the service role signs the URL, so bucket RLS is untouched.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-guard'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function safeExt(ext: string, fallback: string) {
  const e = (ext || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return e && e.length <= 5 ? e : fallback
}

const IMAGE_BUCKET = 'product-images'
const FILE_BUCKET  = 'product-files'
const PLANNER_SUFFIX: Record<string, string> = { a4: 'a4', a5: 'a5', us_letter: 'us-letter' }
const MAX_ITEMS = 24

interface ReqItem { kind?: string; size?: string; ext?: string }

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const items = body.items as ReqItem[]
  if (items.length === 0) return NextResponse.json({ uploads: [] })
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Too many files at once (max ${MAX_ITEMS})` }, { status: 400 })
  }

  const slug = slugify(String(body.slug ?? '')) || 'product'
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  // One timestamp per request keeps every path unique, so we never depend on the
  // createSignedUploadUrl upsert option (added in a newer supabase-js) and edit
  // re-uploads can't collide with an existing object.
  const ts = Date.now()

  const uploads: Array<{ bucket: string; path: string; token: string; publicUrl?: string }> = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    let bucket: string
    let path: string

    if (item.kind === 'planner') {
      const suffix = PLANNER_SUFFIX[String(item.size ?? '')]
      if (!suffix) return NextResponse.json({ error: `Invalid planner size: ${item.size}` }, { status: 400 })
      bucket = FILE_BUCKET
      path = `${slug}/planner-${suffix}-${ts}.${safeExt(String(item.ext ?? ''), 'pdf')}`
    } else if (item.kind === 'image') {
      bucket = IMAGE_BUCKET
      path = `${slug}/img-${ts}-${i}.${safeExt(String(item.ext ?? ''), 'jpg')}`
    } else {
      return NextResponse.json({ error: `Invalid item kind: ${item.kind}` }, { status: 400 })
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json(
        { error: `Could not create upload URL: ${error?.message ?? 'unknown error'}` },
        { status: 500 },
      )
    }

    uploads.push({
      bucket,
      path,
      token: data.token,
      publicUrl: bucket === IMAGE_BUCKET
        ? supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
        : undefined,
    })
  }

  return NextResponse.json({ uploads })
}
