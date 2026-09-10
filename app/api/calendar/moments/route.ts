import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { fmtDateLong } from '@/lib/calendar/fmt'
import {
  deriveOccurrence, momentAnchorISO, momentEmoji, momentLabel, type MomentType,
} from '@/lib/calendar/moments'

export const dynamic = 'force-dynamic'

const TYPES: MomentType[] = ['anniversary', 'birthday', 'wedding', 'milestone', 'memorial', 'other']
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

interface InviteeInput { email: string; name?: string; notify?: boolean }

// Replace the invitee set for a moment (delete-all + re-insert). Dedupes by email.
async function syncInvitees(supabase: any, momentId: string, invitees: InviteeInput[]) {
  await supabase.from('moment_invitees').delete().eq('moment_id', momentId)
  const seen = new Set<string>()
  const rows = (invitees ?? [])
    .map((i) => ({ email: String(i.email ?? '').trim().toLowerCase(), name: String(i.name ?? '').trim(), notify: i.notify !== false }))
    .filter((i) => isEmail(i.email) && !seen.has(i.email) && (seen.add(i.email), true))
    .map((i) => ({ moment_id: momentId, email: i.email, name: i.name, notify: i.notify }))
  if (rows.length) await supabase.from('moment_invitees').insert(rows)
}

// POST — action-based: create | update | delete | share.
// Runs as the signed-in user, so RLS guarantees they can only touch their own moments.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const action = String(body?.action ?? '')

  try {
    if (action === 'create' || action === 'update') {
      const title = String(body.title ?? '').trim()
      const date = String(body.date ?? '')
      const type: MomentType = TYPES.includes(body.type) ? body.type : 'anniversary'
      if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 })
      if (!isDate(date)) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })

      const { data: settings } = await supabase.from('calendar_settings').select('timezone').eq('user_id', user.id).maybeSingle()
      const fields = {
        title,
        note: String(body.note ?? '').slice(0, 4000),
        moment_type: type,
        moment_date: date,
        recurring: body.recurring !== false,
        image_url: body.imageUrl ? String(body.imageUrl) : null,
        timezone: settings?.timezone || 'America/New_York',
        updated_at: new Date().toISOString(),
      }

      let momentId: string
      if (action === 'create') {
        const { data, error } = await supabase.from('moments').insert({ ...fields, user_id: user.id }).select('id').single()
        if (error || !data) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
        momentId = data.id
      } else {
        momentId = String(body.id ?? '')
        if (!momentId) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
        const { error } = await supabase.from('moments').update(fields).eq('id', momentId).eq('user_id', user.id)
        if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
      }

      if (Array.isArray(body.invitees)) await syncInvitees(supabase, momentId, body.invitees)
      return NextResponse.json({ ok: true, id: momentId })
    }

    if (action === 'delete') {
      const id = String(body.id ?? '')
      if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
      const { error } = await supabase.from('moments').delete().eq('id', id).eq('user_id', user.id)
      if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'share') {
      const id = String(body.id ?? '')
      if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

      const { data: m } = await supabase
        .from('moments')
        .select('id, title, note, moment_type, moment_date, recurring, image_url, timezone, moment_invitees(email, name, notify)')
        .eq('id', id).eq('user_id', user.id).maybeSingle()
      if (!m) return NextResponse.json({ error: 'Moment not found.' }, { status: 404 })

      const invitees = (m.moment_invitees ?? []) as { email: string; name: string }[]
      if (!invitees.length) return NextResponse.json({ error: 'Add someone to share this with first.' }, { status: 400 })

      const provider = getEmailProvider()
      const { years } = deriveOccurrence(m.moment_date, m.recurring)
      const whenLabel = fmtDateLong(momentAnchorISO(m.moment_date), m.timezone)
      const fromName = user.email ?? 'A friend'
      const stamp = Date.now()

      const results = await Promise.allSettled(invitees.map((inv) =>
        provider.sendTransactional({
          to: inv.email, locale: 'en', templateKey: 'calendar.anniversary',
          data: {
            role: 'invitee', title: m.title, note: m.note, years,
            occasion: momentEmoji(m.moment_type as MomentType), type_label: momentLabel(m.moment_type as MomentType),
            when_label: whenLabel, from_name: fromName, image_url: m.image_url ?? '',
          },
          idempotencyKey: `moment-share:${m.id}:${inv.email}:${stamp}`,
          category: 'info',
        }),
      ))
      const sent = results.filter((r) => r.status === 'fulfilled').length
      return NextResponse.json({ ok: true, sent, total: invitees.length })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (e) {
    console.error('[moments] POST', e)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
