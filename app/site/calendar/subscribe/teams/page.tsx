import type { Metadata } from 'next'
import PlanLanding from '../PlanLanding'

export const metadata: Metadata = {
  title: 'Subscribe to Arwign Teams — $79.99/month | Arwign Calendar',
  description: 'Arwign Teams: shared team calendars with roles, resource & room booking, cross-timezone availability finder, round-robin booking pages and an admin console. One flat $79.99 per month covers up to 10 team members — no per-seat fees.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.arwignplanners.com/calendar/subscribe/teams' },
}

export default function SubscribeTeamsPage() {
  return <PlanLanding plan="teams" />
}
