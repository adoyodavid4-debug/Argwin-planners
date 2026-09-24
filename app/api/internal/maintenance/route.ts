// TEMPORARY one-shot maintenance endpoint — removed in the next commit.
// Does exactly two fixed things, then dies with the deploy that deletes it:
//   1. Swaps the cover image of one blog post (user-requested).
//   2. Returns aggregate email-retention stats (row counts only — no
//      addresses or any other PII leave the database).
// Guarded by the SHA-256 of a random 384-bit token; the preimage is not in
// the repo, and wrong/missing tokens get an indistinguishable 404.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_SHA256 = 'c565461fe0849c567014a33f8770a293d042df4efa69c07fd82750babac4470d'

const ARTICLE_SLUG = 'the-boring-one-task-at-work-occurring-every-week'
const NEW_COVER = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80'

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

  // 1. Cover swap
  const { data: post, error: coverErr } = await db
    .from('blog_posts')
    .update({ cover_image: NEW_COVER })
    .eq('slug', ARTICLE_SLUG)
    .select('slug, cover_image')
    .single()

  // 2. Retention stats — counts only
  const count = async (table: string, filter?: (q: any) => any) => {
    let q: any = db.from(table).select('id', { count: 'exact', head: true })
    if (filter) q = filter(q)
    const { count: n, error } = await q
    return error ? `ERR:${error.message}` : n
  }

  const stats = {
    profiles_total:                 await count('profiles'),
    profiles_missing_email:         await count('profiles', (q: any) => q.or('email.is.null,email.eq.')),
    orders_total:                   await count('orders'),
    orders_completed:               await count('orders', (q: any) => q.eq('status', 'completed')),
    orders_missing_email:           await count('orders', (q: any) => q.or('email.is.null,email.eq.')),
    newsletter_subscribers_total:   await count('newsletter_subscribers'),
    newsletter_subscribers_active:  await count('newsletter_subscribers', (q: any) => q.eq('is_active', true)),
    leadmagnet_subscribers_total:   await count('subscribers'),
    leadmagnet_confirmed:           await count('subscribers', (q: any) => q.eq('status', 'confirmed')),
    leadmagnet_pending:             await count('subscribers', (q: any) => q.eq('status', 'pending')),
    calendar_bookings_total:        await count('bookings'),
    calendar_bookings_missing_email: await count('bookings', (q: any) => q.or('email.is.null,email.eq.')),
  }

  return NextResponse.json({
    ok: true,
    cover: coverErr ? `ERR:${coverErr.message}` : post,
    stats,
  })
}
