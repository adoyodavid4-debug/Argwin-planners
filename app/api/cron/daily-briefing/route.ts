import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'
import { wallTimeToUtc } from '@/lib/calendar/slots'
import { composeBriefingHeadline } from '@/lib/calendar/briefing'

export const dynamic = 'force-dynamic'

// Vercel Cron hourly. Sends each user their morning briefing when the local hour
// matches their setting and it hasn't been sent today.
async function run(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const provider = getEmailProvider()
  const nowInstant = new Date()
  let sent = 0

  const { data: settingsRows } = await supabase.from('calendar_settings').select('*').eq('briefing_email', true)

  for (const st of (settingsRows ?? []) as any[]) {
    const tz = st.timezone || 'Africa/Nairobi'
    let localHour: number, localDate: string
    try {
      localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(nowInstant))
      localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowInstant)
    } catch { continue }

    if (localHour !== st.briefing_hour) continue
    if (st.last_briefing_on === localDate) continue

    const [y, m, d] = localDate.split('-').map(Number)
    const dayStart = wallTimeToUtc(y, m, d, 0, 0, tz)
    const dayEnd = wallTimeToUtc(y, m, d + 1, 0, 0, tz)

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, location, start_at, end_at, all_day, rrule, exdates')
      .eq('user_id', st.user_id)

    const items: { time: string; title: string; flag?: string; start: Date }[] = []
    for (const ev of (events ?? []) as any[]) {
      const s = new Date(ev.start_at)
      const durMs = new Date(ev.end_at).getTime() - s.getTime()
      let starts: Date[] = []
      if (ev.rrule) {
        const rule = parseRRule(ev.rrule)
        if (rule) starts = expandOccurrences(s, rule, dayStart, dayEnd, (ev.exdates ?? []).map((x: string) => new Date(x)))
      } else if (new Date(ev.end_at) > dayStart && s < dayEnd) {
        starts = [s]
      }
      for (const os of starts) {
        const oe = new Date(os.getTime() + durMs)
        if (oe <= dayStart || os >= dayEnd) continue
        const time = ev.all_day ? 'All day' : new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(os)
        items.push({ time, title: ev.title, flag: ev.location ?? undefined, start: os })
      }
    }
    items.sort((a, b) => a.start.getTime() - b.start.getTime())

    const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(nowInstant)
    const headline = composeBriefingHeadline(items.map((i) => ({ time: i.time, title: i.title })))

    try {
      const { data: u } = await supabase.auth.admin.getUserById(st.user_id)
      const email = u?.user?.email
      if (email) {
        await provider.sendTransactional({
          to: email, locale: 'en', templateKey: 'calendar.briefing',
          data: { headline, date_label: dateLabel, items: items.map((i) => ({ time: i.time, title: i.title, flag: i.flag })) },
          idempotencyKey: `briefing:${st.user_id}:${localDate}`,
        })
        await supabase.from('calendar_settings').update({ last_briefing_on: localDate }).eq('user_id', st.user_id)
        await supabase.from('notification_log').insert({
          user_id: st.user_id, kind: 'briefing', channel: 'email',
          idempotency_key: `briefing:${st.user_id}:${localDate}`, status: 'sent', meta: { count: items.length },
        })
        sent++
      }
    } catch (e) { console.error('[briefing] failed', e) }
  }
  return NextResponse.json({ ok: true, sent })
}

// Vercel Cron invokes GET with an auto-injected Bearer CRON_SECRET header.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
