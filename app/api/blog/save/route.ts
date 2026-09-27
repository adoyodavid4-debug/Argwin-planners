// app/api/blog/save/route.ts
// Toggle a post in the signed-in account's "Best Reads" (profiles.saved_posts).
// Login required.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ post_id: z.string().uuid(), save: z.boolean() })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { post_id, save } = parsed.data

  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: profile } = await service.from('profiles').select('saved_posts').eq('id', user.id).single()
  const set = new Set<string>((profile?.saved_posts as string[] | null) ?? [])
  if (save) set.add(post_id)
  else set.delete(post_id)
  const saved_posts = Array.from(set)

  const { error } = await service.from('profiles').update({ saved_posts }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: save, count: saved_posts.length })
}
