import type { Metadata } from 'next'
import PlanLanding from '../PlanLanding'

export const metadata: Metadata = {
  title: 'Subscribe to Arwign Teams — $49.99/month | Arwign Calendar',
  description: 'Arwign Teams: shared team calendars with roles, resource & room booking, cross-timezone availability finder, round-robin booking pages and an admin console. $49.99 per month.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.arwignplanners.com/calendar/subscribe/teams' },
}

export default function SubscribeTeamsPage() {
  return <PlanLanding plan="teams" />
}
