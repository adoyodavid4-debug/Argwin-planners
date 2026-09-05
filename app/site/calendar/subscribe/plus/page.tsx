import type { Metadata } from 'next'
import PlanSubscribe, { type PlanConfig } from '../PlanSubscribe'

export const metadata: Metadata = {
  title: 'Subscribe to Arwign Plus — $9.99/month | Arwign Calendar',
  description: 'Arwign Plus: unlimited connected calendars, full AI scheduling, SMS Daily Briefing, personal booking pages, meeting polls and calendar-health analytics. $9.99 per month.',
  robots: { index: true, follow: true },
}

const PLUS: PlanConfig = {
  plan: 'plus',
  name: 'Arwign Plus',
  price: '$9.99',
  period: 'per month',
  tagline: 'The individual power user',
  intro: 'Everything in Free, supercharged — the full AI scheduling layer, unlimited connected calendars, and a proactive daily briefing that reaches you before you open the app.',
  benefits: [
    'Everything in Arwign Free',
    'Unlimited connected calendar accounts, in one conflict-aware view',
    'SMS Daily Outlook Briefing + an evening preview of tomorrow',
    'Full AI: automatic time-blocking, smart reschedule/reflow, email→event detection and meeting prep briefs',
    'Personal booking pages + Doodle-style meeting polls',
    'Calendar-health analytics & a weekly review digest',
    'Focus-time protection, boundary rules and smart travel buffers',
    'Priority reminders across email, push and SMS',
  ],
}

export default function SubscribePlusPage() {
  return <PlanSubscribe config={PLUS} />
}
