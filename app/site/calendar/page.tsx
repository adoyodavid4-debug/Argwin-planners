import type { Metadata } from 'next'
import { FaqSchema } from '@/components/seo/JsonLd'
import CalendarClient from './CalendarClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

const CALENDAR_FAQS = [
  { q: 'When is Arwign Calendar launching?', a: 'We’re building it in careful, trustworthy phases — starting with a rock-solid core calendar and two-way Google/Outlook sync. Join the waitlist and you’ll be first in line for early access.' },
  { q: 'Will it sync with my existing calendar?', a: 'Yes. Two-way sync with Google Calendar and Microsoft 365 / Outlook is core, with Apple Calendar via CalDAV and standard ICS import/export.' },
  { q: 'Does the AI do things without asking?', a: 'Never. Every AI action is a proposal you can accept, edit or dismiss. Arwign Calendar never silently moves, deletes or books anything, and every suggestion is logged and reversible.' },
  { q: 'What’s the Daily Outlook Briefing?', a: 'A proactive, AI-composed summary of your day delivered to your inbox and phone before you open anything — your timeline, what needs action, leave-by times and a gentle nudge if the day is overloaded.' },
  { q: 'Will there be a free plan?', a: 'Yes. Arwign Free gives you the full calendar, all views, recurrence, quick-add and one connected account — free forever.' },
]

export const metadata: Metadata = {
  title: 'Arwign Calendar — A Calendar That Thinks With You | Arwign',
  description:
    'Arwign Calendar understands your commitments, protects your time, schedules on your behalf and stays in sync everywhere. Two-way Google/Outlook sync, an AI that only ever proposes, and a proactive Daily Outlook Briefing. Join the waitlist.',
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
    title: 'Arwign Calendar — A Calendar That Thinks With You',
    description: 'Calm, considered, quietly intelligent time management. Two-way sync, AI that proposes, and a proactive daily briefing. Join the waitlist.',
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
