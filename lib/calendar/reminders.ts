// lib/calendar/reminders.ts — reminder presets + formatting shared by the event
// modal, the reminders cron and settings.

import type { Reminder, ReminderChannel } from './settings'

export const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'At start' },
  { minutes: 5, label: '5 minutes before' },
  { minutes: 10, label: '10 minutes before' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 120, label: '2 hours before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 2880, label: '2 days before' },
  { minutes: 10080, label: '1 week before' },
]

export const CHANNEL_LABELS: Record<ReminderChannel, string> = {
  push: 'Push', email: 'Email', popup: 'Pop-up',
}

export function describeReminder(r: Reminder): string {
  const preset = REMINDER_PRESETS.find((p) => p.minutes === r.minutes)
  const when = preset ? preset.label : `${r.minutes} min before`
  return `${when} · ${CHANNEL_LABELS[r.channel]}`
}

// Instant a reminder should fire for an event starting at `startAt`.
export function reminderFireTime(startAt: Date, minutesBefore: number): Date {
  return new Date(startAt.getTime() - minutesBefore * 60000)
}
