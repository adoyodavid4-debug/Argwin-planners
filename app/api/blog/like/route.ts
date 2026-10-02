// app/api/blog/like/route.ts
// Anonymous like counter for a blog post. Frictionless (no login) — the client
// keeps a per-browser guard so a visitor can't inflate the count by repeat taps,
// and this endpoint is rate-limited per IP as a second line of defence. Uses the
// admin client (TRUE RLS bypass) because blog_posts is admin-write — the plain
// service-role client keeps a signed-in user's RLS, so the update wrote 0 rows
// and the tally never moved off 0.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { makeRateLimiter, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const isRateLimited = makeRateLimiter(60, 60_000)
const schema = z.object({ post_id: z.string().uuid(), op: z.enum(['like', 'unlike']) })

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) return new NextResponse(null, { status: 429 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { post_id, op } = parsed.data
  const supabase = createAdminClient()
  try {
    const { data } = await supabase.from('blog_posts').select('like_count').eq('id', post_id).single()
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const like_count = Math.max(0, (data.like_count ?? 0) + (op === 'like' ? 1 : -1))
    await supabase.from('blog_posts').update({ like_count }).eq('id', post_id)
    return NextResponse.json({ like_count })
  } catch (err) {
    console.error('[blog/like]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
