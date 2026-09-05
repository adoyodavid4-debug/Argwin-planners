import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'
import { wallTimeToUtc } from '@/lib/calendar/slots'
import { composeBriefingHeadline, composeBriefingSms } from '@/lib/calendar/briefing'
import { sendSms, smsConfigured } from '@/lib/sms'

export const dynamic = 'force-dynamic'

// Vercel Cron. Sends each user their morning briefing (email and/or SMS) once
// per local day (guarded by last_briefing_on).
//
// NOTE: the Vercel Hobby plan only permits DAILY crons, so this is scheduled
// once at 04:00 UTC (= 07:00 in the Africa/Nairobi default tz, matching the
// default briefing hour). To honour each user's own `briefing_hour`, upgrade to
// Vercel Pro, switch the schedule in vercel.json to hourly ("0 * * * *"), and
// re-add an `if (localHour !== st.briefing_hour) continue` gate below.
async function run(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceRoleClient()
  const provider = getEmailProvider()
  const nowInstant = new Date()
  let sentEmail = 0
  let sentSms = 0

  // Anyone with a briefing on for either channel.
  const { data: settingsRows } = await supabase
    .from('calendar_settings')
    .select('*')
    .or('briefing_email.eq.true,briefing_sms.eq.true')

  for (const st of (settingsRows ?? []) as any[]) {
    const tz = st.timezone || 'Africa/Nairobi'
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

    const wantEmail = st.briefing_email && !!email
    const wantSms   = st.briefing_sms && !!st.phone && smsConfigured()
    if (!wantEmail && !wantSms) continue

    let delivered = false

    // ── Email channel ──
    if (wantEmail) {
      try {
        await provider.sendTransactional({
          to: email!, locale: 'en', templateKey: 'calendar.briefing',
          data: { headline, date_label: dateLabel, items: items.map((i) => ({ time: i.time, title: i.title, flag: i.flag })) },
          idempotencyKey: `briefing:${st.user_id}:${localDate}`,
        })
        await supabase.from('notification_log').insert({
          user_id: st.user_id, kind: 'briefing', channel: 'email',
          idempotency_key: `briefing:${st.user_id}:${localDate}`, status: 'sent', meta: { count: items.length },
        })
        delivered = true; sentEmail++
      } catch (e) { console.error('[briefing] email failed', st.user_id, e) }
    }

    // ── SMS channel (Twilio) ──
    if (wantSms) {
      const smsKey = `briefing-sms:${st.user_id}:${localDate}`
      // Guard against a duplicate paid send if a prior run crashed after Twilio
      // accepted the message but before last_briefing_on was written.
      const { data: already } = await supabase
        .from('notification_log').select('id').eq('idempotency_key', smsKey).maybeSingle()
      if (!already) {
        try {
          await sendSms({
            to: st.phone,
            body: composeBriefingSms(dateLabel, items.map((i) => ({ time: i.time, title: i.title }))),
          })
          await supabase.from('notification_log').insert({
            user_id: st.user_id, kind: 'briefing', channel: 'sms',
            idempotency_key: smsKey, status: 'sent', meta: { count: items.length },
          })
          delivered = true; sentSms++
        } catch (e) { console.error('[briefing] sms failed', st.user_id, e) }
      } else {
        delivered = true
      }
    }

    // Mark the day done only once at least one channel delivered, so a transient
    // failure retries on the next hourly run rather than being silently skipped.
    if (delivered) {
      await supabase.from('calendar_settings').update({ last_briefing_on: localDate }).eq('user_id', st.user_id)
    }
  }
  return NextResponse.json({ ok: true, email: sentEmail, sms: sentSms })
}

// Vercel Cron invokes GET with an auto-injected Bearer CRON_SECRET header.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
