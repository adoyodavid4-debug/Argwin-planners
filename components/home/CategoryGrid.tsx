'use client'
// components/home/CategoryGrid.tsx
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Tablet, Printer, Wallet, BookOpen, HeartPulse, Briefcase, CheckCircle, Utensils, Brain, Target, PiggyBank, LayoutTemplate, Package, CalendarRange } from 'lucide-react'

// Shape passed in from the DB via the server wrapper (CategoryGridServer).
export interface CategoryInput {
  name: string
  slug: string
  icon: string | null
}

interface CategoryItem {
  name: string
  slug: string
  icon: React.ElementType
  color: string
  accent: string
}

const categories: CategoryItem[] = [
  { name: 'Digital Planners',   slug: 'digital-planners',   icon: Tablet,         color: 'rgba(205,199,190,0.15)', accent: '#7B6FAE' },
  { name: 'Printable Planners', slug: 'printable-planners', icon: Printer,        color: 'rgba(232,197,192,0.15)', accent: '#C9847C' },
  { name: 'Budget Planners',    slug: 'budget-planners',    icon: Wallet,         color: 'rgba(160,131,14,0.15)',  accent: '#A0830E' },
  { name: 'Student Planners',   slug: 'student-planners',   icon: BookOpen,       color: 'rgba(168,181,160,0.15)', accent: '#6E7E66' },
  { name: 'Wellness Planners',  slug: 'wellness-planners',  icon: HeartPulse,     color: 'rgba(232,197,192,0.2)',  accent: '#E8A0A0' },
  { name: 'Business Planners',  slug: 'business-planners',  icon: Briefcase,      color: 'rgba(44,42,53,0.06)',    accent: '#5A5668' },
  { name: 'Habit Trackers',     slug: 'habit-trackers',     icon: CheckCircle,    color: 'rgba(205,199,190,0.12)', accent: '#B8A9D4' },
  { name: 'ADHD Planners',      slug: 'adhd-planners',      icon: Brain,          color: 'rgba(160,131,14,0.1)',   accent: '#A0830E' },
  { name: 'Goal Trackers',      slug: 'goal-trackers',      icon: Target,         color: 'rgba(168,181,160,0.12)', accent: '#A8B5A0' },
  { name: 'Meal Planners',      slug: 'meal-planners',      icon: Utensils,       color: 'rgba(232,197,192,0.12)', accent: '#C9847C' },
  { name: 'Savings Challenges', slug: 'savings-challenges', icon: PiggyBank,      color: 'rgba(160,131,14,0.12)',  accent: '#77610A' },
  { name: 'Notion Templates',   slug: 'notion-templates',   icon: LayoutTemplate, color: 'rgba(44,42,53,0.05)',    accent: '#3D3A4A' },
  { name: 'Planner Bundles',    slug: 'planner-bundles',    icon: Package,        color: 'rgba(205,199,190,0.2)',  accent: '#7B6FAE' },
]

// ── "Browse by Category" grid edits (this grid only) ──────────────
// These two categories are hidden from THIS grid at render time. Their DB
// rows and /shop/category/{digital-planners,printable-planners} routes are
// left intact on purpose (out of scope). NOTE: they are still linked from
// the header nav dropdown ("Digital Planners" / "Printable Planners") and
// possibly the footer — flag for David if those need retiring too.
const HIDDEN_SLUGS = new Set(['digital-planners', 'printable-planners'])

// New lead card, injected first (the slot vacated by "Digital Planners").
// Tint reuses an existing warm palette value; not identical to its gold
// neighbour (Budget Planners). {{CONTENT_CARD_*}} — confirm at launch.
// NOTE: /shop/category/content-planner has no category yet — a matching
// category/products need creating or this card will 404.
const CONTENT_PLANNER: CategoryItem = {
  name:   'Content Planner',        // {{CONTENT_CARD_LABEL}}
  slug:   'content-planner',        // {{CONTENT_CARD_SLUG}}
  icon:   CalendarRange,            // {{CONTENT_CARD_ICON}}
  color:  'rgba(205,199,190,0.15)', // {{CONTENT_CARD_TINT}}
  accent: '#7B6FAE',
}

// Map lucide icon names (stored in the DB `icon` column) to components.
const ICON_MAP: Record<string, React.ElementType> = {
  Tablet, Printer, Wallet, BookOpen, HeartPulse, Briefcase, CheckCircle,
  Utensils, Brain, Target, PiggyBank, LayoutTemplate, Package,
}

// Palette cycled for DB categories that aren't in the hardcoded list.
const PALETTE = categories.map(({ color, accent }) => ({ color, accent }))

export default function CategoryGrid({ dbCategories }: { dbCategories?: CategoryInput[] } = {}) {
  // DB categories win; hardcoded list is the fallback so the grid never breaks.
  const items: CategoryItem[] =
    dbCategories && dbCategories.length > 0
      ? dbCategories.map((c, i) => {
          const known = categories.find((k) => k.slug === c.slug)
          const palette = known ?? PALETTE[i % PALETTE.length]
          return {
            name:   c.name,
            slug:   c.slug,
            icon:   (c.icon && ICON_MAP[c.icon]) || known?.icon || Package,
            color:  palette.color,
            accent: palette.accent,
          }
        })
      : categories

  // This grid only: drop the two hidden categories and lead with Content Planner.
  const visible: CategoryItem[] = [
    CONTENT_PLANNER,
    ...items.filter((c) => !HIDDEN_SLUGS.has(c.slug) && c.slug !== CONTENT_PLANNER.slug),
  ]

  return (
    <section className="section w-full" aria-labelledby="categories-heading">
      <div className="container-site">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
            Browse by Category
          </p>
          <h2 id="categories-heading" className="font-display text-display-md mb-4" style={{ color: 'var(--text-primary)' }}>
            Find Your Perfect Planner
          </h2>
          <div className="divider-gold mb-4" />
          <p className="max-w-lg mx-auto text-sm" style={{ color: 'var(--text-secondary)' }}>
            From daily productivity to financial freedom — we have premium digital and printable planners for every area of your life.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visible.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link
                href={`/shop/category/${cat.slug}`}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all duration-300 hover:shadow-product"
                style={{
                  background: cat.color,
                  borderColor: 'var(--border)',
                }}
                aria-label={`Shop ${cat.name}`}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: cat.color, border: `1.5px solid ${cat.accent}30` }}
                >
                  <cat.icon size={22} style={{ color: cat.accent }} />
                </div>
                <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
