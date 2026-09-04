import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/calendar/polls/vote — public voting on a meeting poll.
// Body: { slug, name, email?, optionIds: string[] }
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const slug = String(body?.slug ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const email = body?.email ? String(body.email).trim().toLowerCase() : null
  const optionIds: string[] = Array.isArray(body?.optionIds) ? body.optionIds.map(String) : []

  if (!slug || !name || optionIds.length === 0) {
    return NextResponse.json({ error: 'Your name and at least one time are required.' }, { status: 400 })
  }
  if (email && !emailRe.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: poll } = await supabase
    .from('meeting_polls').select('id, status').eq('slug', slug).maybeSingle()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.status !== 'open') return NextResponse.json({ error: 'This poll is closed.' }, { status: 409 })

  // Only accept options that belong to this poll.
  const { data: opts } = await supabase.from('poll_options').select('id').eq('poll_id', poll.id)
  const valid = new Set((opts ?? []).map((o) => o.id))
  const rows = optionIds.filter((id) => valid.has(id)).map((option_id) => ({
    poll_id: poll.id, option_id, voter_name: name, voter_email: email,
  }))
  if (!rows.length) return NextResponse.json({ error: 'No valid options selected.' }, { status: 400 })

  const { error } = await supabase.from('poll_votes').insert(rows)
  if (error) return NextResponse.json({ error: 'Could not record your vote.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
