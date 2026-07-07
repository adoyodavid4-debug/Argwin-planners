'use client'
// Shared visual system for the three hero cards (Best Seller · New Arrival ·
// Arwign Calendar). One frame, one badge, one CTA — so the trio reads as a
// single designed set. Reuses the site's warm tokens; no new colours.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A0830E]'

// Shared shell: equal height (h-full flex col), soft parchment→sand gradient,
// brass hairline, layered warm shadow + top inner highlight, gentle hover lift.
export const HERO_FRAME_CLASS =
  'group/card relative flex h-full flex-col overflow-hidden rounded-[22px] p-3.5 ' +
  'transition-[transform,box-shadow] duration-[240ms] ease-out ' +
  'motion-safe:hover:-translate-y-1.5'

export const heroFrameStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #FBF7EF 0%, #EFE7D8 100%)',
  border: '1px solid rgba(160,131,14,0.14)',
  boxShadow:
    '0 1px 2px rgba(120,100,40,0.10), 0 18px 40px -14px rgba(90,74,20,0.22), inset 0 1px 0 rgba(255,255,255,0.65)',
}

export type BadgeVariant = 'best' | 'new' | 'app'

// Green reserved for Best Seller; brass for New Arrival; clay for Companion App.
const BADGE_STYLE: Record<BadgeVariant, React.CSSProperties> = {
  best: { background: '#254A38', color: '#F7F2E8' },
  new:  { background: '#A0830E', color: '#2C2A35' },
  app:  { background: '#B4664A', color: '#F7F2E8' },
}

export function HeroBadge({
  label,
  variant,
  icon: Icon,
}: {
  label: string
  variant: BadgeVariant
  icon: React.ElementType
}) {
  return (
    <span
      className="absolute left-3.5 top-3.5 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm"
      style={{ ...BADGE_STYLE[variant], fontFamily: 'var(--font-jost)' }}
    >
      <Icon size={10} aria-hidden />
      {label}
    </span>
  )
}

// Shared CTA — brass text link + arrow, pinned to the card's bottom baseline.
export function HeroCTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold ${FOCUS_RING}`}
      style={{ color: 'var(--gold-dark)', fontFamily: 'var(--font-jost)' }}
    >
      {label}
      <ArrowRight
        size={13}
        className="transition-transform duration-200 motion-safe:group-hover/card:translate-x-1"
        aria-hidden
      />
    </Link>
  )
}

// Shared title + meta type so no card out-sizes its siblings.
export function HeroTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`block text-[1rem] leading-tight ${className}`}
      style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 600, color: 'var(--text-primary)' }}
    >
      {children}
    </span>
  )
}

export function HeroMeta({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mt-1 flex items-center gap-1.5 text-xs"
      style={{ fontFamily: 'var(--font-jost)', color: 'var(--text-secondary)' }}
    >
      {children}
    </span>
  )
}
