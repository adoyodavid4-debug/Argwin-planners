// app/api/blog/comment/route.ts
// Post or delete a blog comment. Login required to write (mirrors reviews).
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { makeRateLimiter, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const isRateLimited = makeRateLimiter(10, 60_000)
const postSchema   = z.object({ post_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) })
const deleteSchema = z.object({ id: z.string().uuid(), post_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429 })

  const parsed = postSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Comment must be 1–2000 characters.' }, { status: 400 })
  const { post_id, body } = parsed.data

  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 })

  // Display name snapshotted from the profile.
  const service = createAdminClient()
  const { data: profile } = await service.from('profiles').select('full_name, email').eq('id', user.id).single()
  const author_name = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Reader'

  // Insert via the user's client so the RLS check (auth.uid() = user_id) applies.
  const { data: comment, error } = await auth
    .from('blog_comments')
    .insert({ post_id, user_id: user.id, author_name, body })
    .select('id, author_name, body, created_at, user_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Bump the denormalised counter (blog_posts is admin-write under RLS).
  try {
    const { data: p } = await service.from('blog_posts').select('comment_count').eq('id', post_id).single()
    if (p) await service.from('blog_posts').update({ comment_count: (p.comment_count ?? 0) + 1 }).eq('id', post_id)
  } catch { /* non-fatal */ }

  return NextResponse.json({ comment })
}

export async function DELETE(req: NextRequest) {
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { id, post_id } = parsed.data

  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  // RLS "delete own" ensures a user can only delete their own comment.
  const { data: deleted, error } = await auth.from('blog_comments').delete().eq('id', id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createAdminClient()
  try {
    const { data: p } = await service.from('blog_posts').select('comment_count').eq('id', post_id).single()
    if (p) await service.from('blog_posts').update({ comment_count: Math.max(0, (p.comment_count ?? 0) - 1) }).eq('id', post_id)
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
