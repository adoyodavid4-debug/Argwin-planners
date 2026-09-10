import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'
import { wallTimeToUtc } from '@/lib/calendar/slots'
import { composeBriefingHeadline } from '@/lib/calendar/briefing'
import { celebrateAnniversaries } from '@/lib/calendar/anniversaries'

export const dynamic = 'force-dynamic'

// Vercel Cron. Sends each user their morning briefing by email once per local
// day (guarded by last_briefing_on). Email is the only briefing channel — SMS
// briefings were removed 2026-09-09.
//
// NOTE: the Vercel Hobby plan only permits DAILY crons, so this is scheduled
// once at 12:00 UTC (= 07:00 US Eastern / 12:00 UK — a morning-ish batch for the
// US & UK audience). To honour each user's own `briefing_hour`, upgrade to
// Vercel Pro, switch the schedule in vercel.json to hourly ("0 * * * *"), and
// re-add an `if (localHour !== st.briefing_hour) continue` gate below.
async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const provider = getEmailProvider()
  const nowInstant = new Date()
  let sentEmail = 0

  // Anyone with the email briefing on.
  const { data: settingsRows } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('briefing_email', true)

  for (const st of (settingsRows ?? []) as any[]) {
    const tz = st.timezone || 'America/New_York'
    let localDate: string
    try {
      localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowInstant)
    } catch { continue }

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

    const { data: u } = await supabase.auth.admin.getUserById(st.user_id)
    const email = u?.user?.email as string | undefined

    if (!email) continue

    // Mark the day done only once the email delivered, so a transient failure
    // retries on the next run rather than being silently skipped.
    try {
      await provider.sendTransactional({
        to: email, locale: 'en', templateKey: 'calendar.briefing',
        data: { headline, date_label: dateLabel, items: items.map((i) => ({ time: i.time, title: i.title, flag: i.flag })) },
        idempotencyKey: `briefing:${st.user_id}:${localDate}`,
      })
      await supabase.from('notification_log').insert({
        user_id: st.user_id, kind: 'briefing', channel: 'email',
        idempotency_key: `briefing:${st.user_id}:${localDate}`, status: 'sent', meta: { count: items.length },
      })
      sentEmail++
      await supabase.from('calendar_settings').update({ last_briefing_on: localDate }).eq('user_id', st.user_id)
    } catch (e) { console.error('[briefing] email failed', st.user_id, e) }
  }

  // Celebrate any Moments whose anniversary lands today (balloons & confetti).
  // Folded in here so it runs daily without a separate Vercel cron entry.
  let anniversaries = { celebrated: 0, sent: 0 }
  try { anniversaries = await celebrateAnniversaries(supabase, provider, nowInstant) }
  catch (e) { console.error('[briefing] anniversaries failed', e) }

  return NextResponse.json({ ok: true, email: sentEmail, anniversaries })
}

// Vercel Cron invokes GET with an auto-injected Bearer CRON_SECRET header.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
