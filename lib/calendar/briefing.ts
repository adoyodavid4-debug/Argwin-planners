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
