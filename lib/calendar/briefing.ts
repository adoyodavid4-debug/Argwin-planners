// lib/calendar/briefing.ts — Daily Outlook Briefing composition.
// The structured day is assembled deterministically first (masterplan §14.4);
// this produces the human headline. An LLM can later rewrite the headline from
// the SAME grounded data — it must never invent times or titles.

export interface BriefItem { time: string; title: string }

export function composeBriefingHeadline(items: BriefItem[]): string {
  const timed = items.filter((i) => i.time !== 'All day')
  const n = items.length
  if (n === 0) return 'No events today — an open day to protect your focus.'
  const first = timed[0] ?? items[0]
  const load =
    timed.length >= 5 ? 'a full day' :
    timed.length >= 3 ? 'a busy morning and afternoon' :
    'a manageable day'
  return `${n} event${n === 1 ? '' : 's'} today — ${load}, starting with ${first.title} at ${first.time}.`
}

// Compressed briefing for SMS: a short headline plus a compact agenda. Kept
// tight to limit Twilio segments; truncates long lists with a "+N more".
export function composeBriefingSms(dateLabel: string, items: BriefItem[]): string {
  if (items.length === 0) {
    return `Arwign · ${dateLabel}\nNo events today — an open day to protect your focus.`
  }
  const MAX = 6
  const lines = items.slice(0, MAX).map((i) => `• ${i.time} ${i.title}`)
  const more  = items.length > MAX ? `…+${items.length - MAX} more` : ''
  return [`Arwign · ${dateLabel}`, composeBriefingHeadline(items), ...lines, more]
    .filter(Boolean)
    .join('\n')
}
