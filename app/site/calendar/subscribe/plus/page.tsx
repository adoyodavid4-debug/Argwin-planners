import type { Metadata } from 'next'
import PlanLanding from '../PlanLanding'

export const metadata: Metadata = {
  title: 'Subscribe to Arwign Plus — $19.99/month | Arwign Calendar',
  description: 'Arwign Plus: unlimited connected calendars, full AI scheduling, the Daily Outlook Briefing, personal booking pages, meeting polls and calendar-health analytics. $19.99 per month.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.arwignplanners.com/calendar/subscribe/plus' },
}

export default function SubscribePlusPage() {
  return <PlanLanding plan="plus" />
}
