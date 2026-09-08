import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'
import { sendPush } from '@/lib/calendar/push'

export const dynamic = 'force-dynamic'

// Vercel Cron every 5 minutes. Fires reminders whose trigger time has just
// passed. Idempotent via notification_log.idempotency_key.
const LOOKBACK_MS = 6 * 60 * 1000

async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const now = new Date()
  const from = new Date(now.getTime() - LOOKBACK_MS)

  // Events that could still have upcoming reminders (end in future, or recurring).
  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, user_id, title, location, conferencing, start_at, end_at, all_day, rrule, exdates, reminders')
    .gte('end_at', new Date(now.getTime() - 24 * 3600_000).toISOString())

  const emailCache = new Map<string, string | null>()
  const getEmail = async (uid: string) => {
    if (emailCache.has(uid)) return emailCache.get(uid)!
    const { data } = await supabase.auth.admin.getUserById(uid)
    const email = data?.user?.email ?? null
    emailCache.set(uid, email); return email
  }

  const provider = getEmailProvider()
  let sent = 0

  for (const ev of (events ?? []) as any[]) {
    const reminders = (ev.reminders ?? []) as { minutes: number; channel: string }[]
    if (!reminders.length || ev.all_day) continue

    // Occurrence starts to consider (single or expanded recurrence in a small window).
    let starts: Date[] = []
    if (ev.rrule) {
      const rule = parseRRule(ev.rrule)
      if (rule) {
        const s = new Date(ev.start_at)
        const durMs = new Date(ev.end_at).getTime() - s.getTime()
        void durMs
        const ex = (ev.exdates ?? []).map((x: string) => new Date(x))
        starts = expandOccurrences(s, rule, from, new Date(now.getTime() + 8 * 24 * 3600_000), ex)
      }
    } else {
      starts = [new Date(ev.start_at)]
    }

    for (const start of starts) {
      for (const r of reminders) {
        const fire = new Date(start.getTime() - r.minutes * 60000)
        if (fire <= from || fire > now) continue
        const key = `rem:${ev.id}:${start.toISOString()}:${r.minutes}:${r.channel}`
        const { data: exists } = await supabase.from('notification_log').select('id').eq('idempotency_key', key).maybeSingle()
        if (exists) continue

        const whenStr = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(start)
        let ok = false
        try {
          if (r.channel === 'email') {
            const email = await getEmail(ev.user_id)
            if (email) {
              await provider.sendTransactional({
                to: email, locale: 'en', templateKey: 'calendar.reminder',
                data: { title: ev.title, when: whenStr, location: ev.location, join_url: ev.conferencing },
                idempotencyKey: key,
              })
              ok = true
            }
          } else if (r.channel === 'push') {
            ok = await sendPush(supabase, ev.user_id, { title: ev.title, body: whenStr, url: ev.conferencing || '/calendar/app' })
          } else { ok = true } // popup handled client-side
        } catch (e) { console.error('[reminders] send failed', e) }

        await supabase.from('notification_log').insert({
          user_id: ev.user_id, kind: 'reminder', channel: r.channel, event_id: ev.id,
          idempotency_key: key, status: ok ? 'sent' : 'failed', meta: { start: start.toISOString() },
        })
        if (ok) sent++
      }
    }
  }
  return NextResponse.json({ ok: true, sent })
}

// Vercel Cron invokes GET with an auto-injected Bearer CRON_SECRET header.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
