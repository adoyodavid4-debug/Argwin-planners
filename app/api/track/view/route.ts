// app/api/track/view/route.ts
// Records a "click" — a real open of a product (planner/notebook) or blog post.
// Fired once per session from the detail page by <TrackView>, so hover-prefetch
// and bot crawls (which don't run the client effect) don't inflate the count.
// Increments the existing view_count column, so no schema migration is needed.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { makeRateLimiter, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'

// Generous cap — a browsing session opens many items, but this deters scripted
// inflation of the counters from a single IP.
const isRateLimited = makeRateLimiter(120, 60_000)

const schema = z.object({
  type: z.enum(['product', 'blog']),
  id:   z.string().uuid(),
})

const TABLE = { product: 'products', blog: 'blog_posts' } as const

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return new NextResponse(null, { status: 429 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new NextResponse(null, { status: 400 })

  const { type, id } = parsed.data
  const table = TABLE[type]
  const supabase = createServiceRoleClient()

  // Read-then-write increment (mirrors incrementDownloadCount in lib/orders.ts).
  // A rough engagement metric, so the tiny race window on concurrent opens is
  // acceptable. Never throws back to the beacon.
  try {
    const { data } = await supabase.from(table).select('view_count').eq('id', id).single()
    if (data) {
      await supabase.from(table).update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', id)
    }
  } catch (err) {
    console.error('[track/view]', type, id, err)
  }

  return new NextResponse(null, { status: 204 })
}
