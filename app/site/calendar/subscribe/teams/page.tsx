import type { Metadata } from 'next'
import PlanSubscribe, { type PlanConfig } from '../PlanSubscribe'

export const metadata: Metadata = {
  title: 'Subscribe to Arwign Teams — $23.99/month | Arwign Calendar',
  description: 'Arwign Teams: shared team calendars with roles, resource & room booking, cross-timezone availability finder, round-robin booking pages and an admin console. $23.99 per month.',
  robots: { index: true, follow: true },
}

const TEAMS: PlanConfig = {
  plan: 'teams',
  name: 'Arwign Teams',
  price: '$23.99',
  period: 'per month',
  tagline: 'For teams',
  intro: 'Everything in Plus for your whole team — shared calendars with roles, resource booking, cross-timezone scheduling and centralised admin, so a distributed team can find time and manage it together.',
  benefits: [
    'Everything in Arwign Plus, for your team',
    'Shared team calendars with granular roles (view / propose / edit / manage)',
    'Conference room & resource booking with approval workflows',
    'Team availability finder across time zones',
    'Round-robin & collective booking pages',
    'Delegation with a full audit trail',
    'Team calendar-health analytics',
    'Admin console & centralised billing',
  ],
}

export default function SubscribeTeamsPage() {
  return <PlanSubscribe config={TEAMS} />
}
