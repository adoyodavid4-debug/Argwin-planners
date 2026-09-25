// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Single fixed action: inserts an inline content image into one blog post's
// markdown body (idempotent — skips if the image is already present).
// Guarded by the SHA-256 of a random 384-bit token; the preimage is not in
// the repo, and wrong/missing tokens get an indistinguishable 404.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = '159f13a64b1ad44e44f3e30bae08ccc345d44e183643bae56b935fa2ab692fc7'

const ARTICLE_SLUG = 'the-boring-one-task-at-work-occurring-every-week'
const IMAGE_MD = '![A planner open beside a laptop on a tidy desk — the weekly task getting done calmly](/blog-content/weekly-admin-desk.webp)'
// End of the article's intro paragraph — the image slots in right after it.
const ANCHOR = "Let's cancel the subscription."

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-maint-token') ?? ''
  const presented = createHash('sha256').update(token).digest()
  const expected = Buffer.from(TOKEN_SHA256, 'hex')
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post, error: readErr } = await db
    .from('blog_posts').select('id, body').eq('slug', ARTICLE_SLUG).single()
  if (readErr || !post?.body) {
    return NextResponse.json({ error: readErr?.message ?? 'post/body missing' }, { status: 500 })
  }

  if (post.body.includes('/blog-content/weekly-admin-desk.webp')) {
    return NextResponse.json({ ok: true, skipped: 'image already present' })
  }
  if (!post.body.includes(ANCHOR)) {
    return NextResponse.json({ error: 'anchor sentence not found in body' }, { status: 500 })
  }

  const nextBody = post.body.replace(ANCHOR, `${ANCHOR}\n\n${IMAGE_MD}`)
  const { error: updErr } = await db
    .from('blog_posts').update({ body: nextBody }).eq('id', post.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, inserted: true })
}
