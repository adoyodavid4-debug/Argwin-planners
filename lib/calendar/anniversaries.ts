// lib/calendar/anniversaries.ts — the daily "celebrate today's moments" sweep,
// shared by the standalone /api/cron/moment-anniversaries route (manual/testing)
// and folded into the existing daily-briefing cron so no NEW Vercel cron entry
// is needed (the Hobby plan couples cron config to the deploy pipeline — see the
// deploy-to-live notes). Emails the owner + opted-in invitees a balloons-and-
// confetti message on each recurring moment's anniversary, once per year.

import type { EmailProvider } from '@/lib/email'
import { fmtDateLong } from './fmt'
import { momentAnchorISO, momentEmoji, momentLabel, type MomentType } from './moments'

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

export async function celebrateAnniversaries(
  supabase: any, provider: EmailProvider, now: Date = new Date(),
): Promise<{ celebrated: number; sent: number }> {
  const { data: moments } = await supabase
    .from('moments')
    .select('id, user_id, title, note, moment_type, moment_date, image_url, timezone, last_celebrated_year, moment_invitees(email, name, notify)')
    .eq('recurring', true)

  const localToday = new Map<string, { y: number; m: number; d: number }>()
  const ownerEmail = new Map<string, string | null>()

  const todayIn = (tz: string) => {
    if (localToday.has(tz)) return localToday.get(tz)!
    let parts: { y: number; m: number; d: number }
    try {
      const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number)
      parts = { y, m, d }
    } catch {
      const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number)
      parts = { y, m, d }
    }
    localToday.set(tz, parts)
    return parts
  }
  const emailOf = async (userId: string) => {
    if (ownerEmail.has(userId)) return ownerEmail.get(userId)!
    const { data } = await supabase.auth.admin.getUserById(userId)
    const email = data?.user?.email ?? null
    ownerEmail.set(userId, email)
    return email
  }

  let celebrated = 0
  let sent = 0

  for (const m of (moments ?? []) as any[]) {
    const tz = m.timezone || 'America/New_York'
    const today = todayIn(tz)
    const [oy, om, od] = String(m.moment_date).split('-').map(Number)

    const directMatch = today.m === om && today.d === od
    const leapRoll = om === 2 && od === 29 && !isLeap(today.y) && today.m === 2 && today.d === 28
    if (!directMatch && !leapRoll) continue
    if (m.last_celebrated_year != null && m.last_celebrated_year >= today.y) continue

    const years = today.y - oy
    const type = m.moment_type as MomentType
    const whenLabel = fmtDateLong(momentAnchorISO(m.moment_date), tz)
    const owner = await emailOf(m.user_id)

    const recipients: { to: string; role: 'owner' | 'invitee' }[] = []
    if (owner && isEmail(owner)) recipients.push({ to: owner, role: 'owner' })
    for (const inv of (m.moment_invitees ?? []) as any[]) {
      if (inv.notify && isEmail(inv.email)) recipients.push({ to: inv.email, role: 'invitee' })
    }
    if (!recipients.length) continue

    const results = await Promise.allSettled(recipients.map((r) =>
      provider.sendTransactional({
        to: r.to, locale: 'en', templateKey: 'calendar.anniversary',
        data: {
          role: r.role, title: m.title, note: m.note ?? '', years,
          occasion: momentEmoji(type), type_label: momentLabel(type),
          when_label: whenLabel, from_name: owner ?? '', image_url: m.image_url ?? '',
        },
        idempotencyKey: `moment-anniv:${m.id}:${today.y}:${r.to}`,
        category: 'info',
      }),
    ))
    sent += results.filter((r) => r.status === 'fulfilled').length

    await supabase.from('moments').update({ last_celebrated_year: today.y }).eq('id', m.id)
    celebrated++
  }

  return { celebrated, sent }
}
