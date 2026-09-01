'use client'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import {
  HERO_FRAME_CLASS, heroFrameStyle, HeroBadge, HeroCTA, HeroTitle, HeroMeta, FOCUS_RING,
} from './HeroCardKit'

// ── Palette — warm accents kept subtle (brass primary, clay + sage sparing) ──
const INK        = '#2C2A35'
const INK_MUTED  = 'rgba(44,42,53,0.55)'
const PARCHMENT  = '#F7F2E8'
const WARM_SAND  = '#EFE7D8'
const BRASS      = '#A0830E' // "today" marker / accent
const CLAY       = '#B4664A' // one event chip
const SAGE       = '#8FA294' // second event chip

// ── Neutral, date-agnostic month for the preview (no date library) ──
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const LEADING  = 2
const DAYS     = 30
const TODAY    = 16
const EVENTS: Record<number, string> = { 8: CLAY, 23: SAGE }
const CELLS: (number | null)[] = [
  ...Array.from({ length: LEADING }, () => null),
  ...Array.from({ length: DAYS }, (_, i) => i + 1),
]

const OUTLOOK = [
  { time: '08:40', label: 'Leave for your 09:00' },
  { time: '14:00', label: 'Focus block · protected' },
]

export interface HeroCalendarCardProps {
  index?: number
  /** {{CALENDAR_BADGE}} — confirm wording at launch (Companion App / Now in Beta / Coming Soon) */
  badge?: string
  title?: string
  /** {{CALENDAR_TAGLINE}} */
  tagline?: string
  /** {{CALENDAR_URL}} — internal calendar route */
  href?: string
  /** {{CAL_MONTH}} — kept date-neutral */
  monthLabel?: string
}

export default function HeroCalendarCard({
  index = 2,
  badge = 'Companion App',
  title = 'Arwign Calendar',
  tagline = 'Your planners, now in sync.',
  href = '/calendar',
  monthLabel = 'This Month',
}: HeroCalendarCardProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index, ease: 'easeOut' }}
      className="h-full"
    >
      <div className={HERO_FRAME_CLASS} style={heroFrameStyle}>
        <HeroBadge label={badge} variant="app" icon={CalendarDays} />
        <Link
          href={href}
          aria-label={`${title} — companion scheduling app. ${tagline} Explore the app.`}
          className={`block ${FOCUS_RING} rounded-2xl`}
        >
          {/* Coded calendar preview (decorative) */}
          <span
            aria-hidden="true"
            className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl p-2.5 pt-8"
            style={{ background: WARM_SAND }}
          >
            {/* Month header */}
            <span className="flex items-baseline justify-between px-0.5">
              <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: '0.82rem', color: INK }}>
                {monthLabel}
              </span>
              <span className="inline-flex gap-1" style={{ color: INK_MUTED }}>
                <span style={{ fontSize: '0.7rem' }}>‹</span>
                <span style={{ fontSize: '0.7rem' }}>›</span>
              </span>
            </span>

            {/* Weekday initials */}
            <span className="mt-2 grid grid-cols-7 gap-y-0.5">
              {WEEKDAYS.map((d, i) => (
                <span
                  key={i}
                  className="text-center"
                  style={{ fontFamily: 'var(--font-jost)', fontSize: '0.5rem', letterSpacing: '0.04em', color: INK_MUTED }}
                >
                  {d}
                </span>
              ))}
            </span>

            {/* Date grid */}
            <span className="mt-1 grid flex-1 grid-cols-7 items-center gap-y-0.5">
              {CELLS.map((n, i) => {
                const isToday = n === TODAY
                const eventColour = n != null ? EVENTS[n] : undefined
                return (
                  <span key={i} className="relative flex items-center justify-center">
                    {isToday && (
                      // Soft brass ring — gentle pulse, disabled under reduced motion
                      <span
                        className="absolute rounded-full motion-safe:animate-pulse"
                        style={{ width: 20, height: 20, boxShadow: '0 0 0 2px rgba(160,131,14,0.35)' }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="relative flex items-center justify-center rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        fontFamily: 'var(--font-cormorant)',
                        fontSize: '0.62rem',
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? PARCHMENT : INK,
                        background: isToday ? BRASS : 'transparent',
                      }}
                    >
                      {n ?? ''}
                    </span>
                    {eventColour && (
                      <span className="absolute rounded-full" style={{ width: 4, height: 4, bottom: -1, background: eventColour }} />
                    )}
                  </span>
                )
              })}
            </span>

            {/* Daily Outlook hint rows */}
            <span className="mt-2 flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'rgba(44,42,53,0.10)' }}>
              {OUTLOOK.map((row) => (
                <span key={row.time} className="flex items-center gap-1.5">
                  <span
                    className="rounded px-1 py-0.5"
                    style={{ background: 'rgba(160,131,14,0.16)', color: '#6d5a0c', fontFamily: 'var(--font-jost)', fontSize: '0.5rem', fontWeight: 600 }}
                  >
                    {row.time}
                  </span>
                  <span className="truncate" style={{ fontFamily: 'var(--font-jost)', fontSize: '0.52rem', color: INK_MUTED }}>
                    {row.label}
                  </span>
                </span>
              ))}
            </span>
          </span>

          {/* Title + tagline */}
          <span className="block pt-3">
            <HeroTitle>{title}</HeroTitle>
            <HeroMeta>{tagline}</HeroMeta>
          </span>
        </Link>
        <HeroCTA href={href} label="Explore the app →" />
      </div>
    </motion.div>
  )
}
