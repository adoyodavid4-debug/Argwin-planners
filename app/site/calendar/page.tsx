import type { Metadata } from 'next'
import { FaqSchema } from '@/components/seo/JsonLd'
import CalendarClient from './CalendarClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

const CALENDAR_FAQS = [
  { q: 'Is Arwign Calendar available now?', a: 'Yes — the core calendar is live and free: events, recurring series, reminders, day/week/month/agenda/year views, natural-language quick-add, booking pages, meeting polls, a daily email briefing and ICS import/export. Google/Outlook two-way sync switches on as each provider is connected.' },
  { q: 'Will it sync with my existing calendar?', a: 'Yes. Two-way sync with Google Calendar and Microsoft 365 / Outlook is core, with Apple Calendar via CalDAV and standard ICS import/export.' },
  { q: 'Does the AI do things without asking?', a: 'Never. Every AI action is a proposal you can accept, edit or dismiss. Arwign Calendar never silently moves, deletes or books anything, and every suggestion is logged and reversible.' },
  { q: 'What’s the Daily Outlook Briefing?', a: 'A proactive, AI-composed summary of your day delivered to your inbox before you open anything — your timeline, what needs action, leave-by times and a gentle nudge if the day is overloaded.' },
  { q: 'Will there be a free plan?', a: 'Yes. Arwign Free gives you the full calendar, all views, recurrence, quick-add and one connected account — free forever.' },
  { q: 'Will there be booking pages and payments?', a: 'Yes — public booking pages (one-off, round-robin, collective and group), Doodle-style meeting polls, and paid bookings by credit & debit card with automatic invoicing and refunds on cancellation.' },
  { q: 'Does it work offline?', a: 'Yes. Arwign Calendar is local-first — it works fully offline and reconciles cleanly when you reconnect. It installs as a PWA today, with native iOS and Android apps to follow.' },
  { q: 'How do you protect my privacy?', a: 'Least-privilege scopes, encrypted tokens and privacy modes: share “Busy” only, keep events private, or opt into end-to-end encryption. Every AI suggestion is logged and reversible, with a full audit trail for shared and delegated actions.' },
]

export const metadata: Metadata = {
  title: 'Arwign Calendar — A Calendar That Thinks With You | Arwign',
  description:
    'Arwign Calendar understands your commitments, protects your time, schedules on your behalf and stays in sync everywhere. A calm, quietly intelligent calendar with recurring events, reminders, booking pages, meeting polls and a proactive Daily Briefing. Free to start.',
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
    title: 'Arwign Calendar — A Calendar That Thinks With You',
    description: 'Calm, considered, quietly intelligent time management. Recurring events, reminders, booking pages and a proactive daily briefing. Create your free calendar.',
    url: `${BASE_URL}/calendar`,
    type: 'website',
  },
}

export default function CalendarPage() {
  return (
    <>
      <FaqSchema items={CALENDAR_FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <CalendarClient />
    </>
  )
}
