import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'
import { parseRRule, expandOccurrences } from '@/lib/calendar/recurrence'
import { wallTimeToUtc } from '@/lib/calendar/slots'
import { composeBriefingHeadline } from '@/lib/calendar/briefing'
import { celebrateAnniversaries } from '@/lib/calendar/anniversaries'
import { violatesBoundary, type Boundaries } from '@/lib/calendar/plus'

export const dynamic = 'force-dynamic'

// Vercel Cron — the Daily Outlook Briefing (masterplan §14). Two slots, chosen by
// the `?slot=` query param the cron path carries:
//   • morning (default, 12:00 UTC ≈ 07:00 ET / 12:00 UK) — the day ahead.
//   • evening (23:00 UTC ≈ 18:00 ET / 23:00 UK) — tomorrow at a glance.
// Each sends at most once per local calendar day (last_briefing_on / last_evening_on).
// Boundary-violating meetings (no-meeting day / protected hours) are flagged inline.
// Hobby plan allows only DAILY crons, so per-user briefing_hour isn't honoured —
// upgrade to Pro + hourly to gate on the exact hour.
async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const slot = req.nextUrl.searchParams.get('slot') === 'evening' ? 'evening' : 'morning'
  const supabase = createServiceRoleClient()
  const provider = getEmailProvider()
  const nowInstant = new Date()
  let sent = 0

  const { data: settingsRows } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq(slot === 'evening' ? 'evening_preview' : 'briefing_email', true)

  for (const st of (settingsRows ?? []) as any[]) {
    const tz = st.timezone || 'America/New_York'
    let localDate: string, localHour: number
    try {
      localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowInstant)
      localHour = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(nowInstant), 10) % 24
    } catch { continue }

    // Per-slot gating + dedup.
    if (slot === 'evening') {
      if (localHour < 17 || localHour > 23) continue        // only fire in the user's evening
      if (st.last_evening_on === localDate) continue
    } else {
      if (st.last_briefing_on === localDate) continue
    }

    const [y, m, d] = localDate.split('-').map(Number)
    // Morning → today; evening → tomorrow.
    const dOffset = slot === 'evening' ? 1 : 0
    const dayStart = wallTimeToUtc(y, m, d + dOffset, 0, 0, tz)
    const dayEnd = wallTimeToUtc(y, m, d + dOffset + 1, 0, 0, tz)

    const boundaries: Boundaries = {
      noMeetingDays: Array.isArray(st.no_meeting_days) ? st.no_meeting_days.map(Number) : [],
      protectAfterHour: st.protect_after_hour ?? null,
      protectBeforeHour: st.protect_before_hour ?? null,
    }

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, location, start_at, end_at, all_day, rrule, exdates, status')
      .eq('user_id', st.user_id)

    const items: { time: string; title: string; flag?: string; start: Date }[] = []
    for (const ev of (events ?? []) as any[]) {
      if (String(ev.status ?? '') === 'cancelled') continue
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
        const breaksBoundary = !ev.all_day && violatesBoundary(os, tz, boundaries)
        items.push({ time, title: ev.title, flag: breaksBoundary ? '⚠ outside your boundaries' : (ev.location ?? undefined), start: os })
      }
    }
    items.sort((a, b) => a.start.getTime() - b.start.getTime())

    // Label the day being described (today for morning, tomorrow for evening).
    const labelInstant = new Date(dayStart.getTime() + 12 * 3600_000)
    const dayName = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(labelInstant)
    const dateLabel = slot === 'evening' ? `Tomorrow — ${dayName}` : dayName
    const baseHeadline = composeBriefingHeadline(items.map((i) => ({ time: i.time, title: i.title })))
    const headline = slot === 'evening' ? `Tomorrow at a glance — ${baseHeadline}` : baseHeadline

    const { data: u } = await supabase.auth.admin.getUserById(st.user_id)
    const email = u?.user?.email as string | undefined
    if (!email) continue

    const idem = `${slot === 'evening' ? 'evening' : 'briefing'}:${st.user_id}:${localDate}`
    try {
      await provider.sendTransactional({
        to: email, locale: 'en', templateKey: 'calendar.briefing',
        data: { headline, date_label: dateLabel, items: items.map((i) => ({ time: i.time, title: i.title, flag: i.flag })) },
        idempotencyKey: idem,
      })
      // Best-effort log — never let a log failure trigger a duplicate resend.
      try {
        await supabase.from('notification_log').insert({
          user_id: st.user_id, kind: 'briefing', channel: 'email',
          idempotency_key: idem, status: 'sent', meta: { count: items.length, slot },
        })
      } catch { /* non-fatal */ }
      sent++
      await supabase.from('calendar_settings')
        .update(slot === 'evening' ? { last_evening_on: localDate } : { last_briefing_on: localDate })
        .eq('user_id', st.user_id)
    } catch (e) { console.error(`[briefing:${slot}] email failed`, st.user_id, e) }
  }

  // Anniversary celebrations run once daily — on the morning slot only.
  let anniversaries = { celebrated: 0, sent: 0 }
  if (slot === 'morning') {
    try { anniversaries = await celebrateAnniversaries(supabase, provider, nowInstant) }
    catch (e) { console.error('[briefing] anniversaries failed', e) }
  }

  return NextResponse.json({ ok: true, slot, sent, anniversaries })
}

// Vercel Cron invokes GET with an auto-injected Bearer CRON_SECRET header.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
