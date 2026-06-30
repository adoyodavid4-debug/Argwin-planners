'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, SlidersHorizontal, Grid3X3, Grid2X2,
  X, Download, Star, Zap, Smartphone, RefreshCcw,
} from 'lucide-react'
import PlannerCard from '@/components/shop/PlannerCard'
import type { Product, Category } from '@/types/database'

// ── Per-category copy & accent ────────────────────────────────
const CATEGORY_META: Record<string, {
  headline: string
  subheadline: string
  description: string
  accentColor: string
  bgGradient: string
  features: { icon: React.ElementType; label: string }[]
  seoTitle: string
  seoBody: string
}> = {
  'digital-planners': {
    headline: 'Digital Planners',
    subheadline: 'Hyperlinked & GoodNotes Ready',
    description: 'Fully interactive digital planners built for iPad, GoodNotes, Notability, and any PDF app. Tap to navigate, type to fill — no paper needed.',
    accentColor: 'var(--lavender)',
    bgGradient: 'linear-gradient(135deg, rgba(184,169,212,0.18) 0%, rgba(201,168,76,0.08) 100%)',
    features: [
      { icon: Zap,         label: 'Instant Download' },
      { icon: Smartphone,  label: 'GoodNotes & Notability' },
      { icon: RefreshCcw,  label: 'Undated — Start Anytime' },
      { icon: Download,    label: 'PDF, GN5, GN6, Notability' },
    ],
    seoTitle: 'Why Choose an Arwign Digital Planner?',
    seoBody: 'Our digital planners are designed specifically for iPad and tablet users who want the tactile joy of planning without the waste of paper. Every spread is hyperlinked — tap the tabs to jump between daily, weekly, monthly and yearly views instantly. Compatible with GoodNotes 5 & 6, Notability, Xodo, and any PDF annotation app. Each planner is undated, so you can start any day of the year and never waste a page.',
  },
  'printable-planners': {
    headline: 'Printable Planners',
    subheadline: 'Print at Home · A4 & A5 Ready',
    description: 'Beautiful printable planner pages designed to look stunning on paper. Print at home, bind yourself, and enjoy a tactile planning experience.',
    accentColor: 'var(--blush)',
    bgGradient: 'linear-gradient(135deg, rgba(232,197,192,0.20) 0%, rgba(247,242,232,0.60) 100%)',
    features: [
      { icon: Download,    label: 'Instant PDF Download' },
      { icon: RefreshCcw,  label: 'Print Unlimited Copies' },
      { icon: Smartphone,  label: 'A4 & A5 Sizes Included' },
      { icon: Zap,         label: 'Ring-Binder & Disc Ready' },
    ],
    seoTitle: 'Why Our Printable Planners Stand Out',
    seoBody: 'Each printable planner is meticulously designed with print-safe margins, bleed lines, and colour profiles optimised for home inkjet and laser printers. Sized in both A4 and A5 so they fit standard ring binders. Download once, print as many times as you need — for yourself, gifts, or your whole team.',
  },
  'budget-planners': {
    headline: 'Budget Planners',
    subheadline: 'Take Control of Your Money',
    description: 'Beautifully designed budget trackers and financial planners to help you save more, spend smarter, and hit your money goals.',
    accentColor: 'var(--sage)',
    bgGradient: 'linear-gradient(135deg, rgba(168,181,160,0.18) 0%, rgba(201,168,76,0.10) 100%)',
    features: [
      { icon: Zap,         label: 'Monthly & Weekly Tracking' },
      { icon: Download,    label: 'Debt Payoff Sheets' },
      { icon: Smartphone,  label: 'Savings Goal Trackers' },
      { icon: RefreshCcw,  label: 'Bill Payment Checklists' },
    ],
    seoTitle: 'Start Your Financial Glow-Up',
    seoBody: 'Our budget planners break down the intimidating world of personal finance into simple, beautiful spreads. Track every income source, every expense category, and watch your savings grow month by month. Includes debt snowball worksheets, savings challenges, and net worth trackers — everything you need to reach financial freedom.',
  },
  'student-planners': {
    headline: 'Student Planners',
    subheadline: 'From Assignments to A-Grades',
    description: 'Academic planners built for students at every level. Track assignments, exams, study sessions, and goals — all in one organised hub.',
    accentColor: '#7B6FAE',
    bgGradient: 'linear-gradient(135deg, rgba(123,111,174,0.14) 0%, rgba(184,169,212,0.20) 100%)',
    features: [
      { icon: Zap,         label: 'Semester & Term Views' },
      { icon: Download,    label: 'Assignment Trackers' },
      { icon: Smartphone,  label: 'Exam Countdown Pages' },
      { icon: RefreshCcw,  label: 'Study Schedule Builder' },
    ],
    seoTitle: 'Plan Your Way to Better Grades',
    seoBody: 'Whether you\'re in high school, university, or postgraduate study, our student planners give you the structure to stay on top of deadlines, revision and self-care. Each academic planner runs August to July and includes a semester overview, weekly study planner, assignment tracker, exam prep checklist, and a reading log.',
  },
  'wellness-planners': {
    headline: 'Wellness Planners',
    subheadline: 'Nurture Your Mind, Body & Soul',
    description: 'Holistic wellness planners to help you track mood, sleep, gratitude, water intake, and self-care rituals — one beautiful day at a time.',
    accentColor: 'var(--blush)',
    bgGradient: 'linear-gradient(135deg, rgba(232,197,192,0.22) 0%, rgba(184,169,212,0.14) 100%)',
    features: [
      { icon: Star,        label: 'Daily Mood Check-Ins' },
      { icon: Download,    label: 'Gratitude & Affirmations' },
      { icon: Smartphone,  label: 'Sleep & Water Tracking' },
      { icon: RefreshCcw,  label: 'Weekly Reflection Prompts' },
    ],
    seoTitle: 'Your Daily Wellness Ritual Starts Here',
    seoBody: 'Mental and physical wellbeing go hand in hand. Our wellness planners gently guide you through daily check-ins, gratitude practices, water and sleep tracking, and mood journalling. Perfect for anyone navigating anxiety, burnout recovery, or simply wanting to live more intentionally.',
  },
  'habit-trackers': {
    headline: 'Habit Trackers',
    subheadline: 'Build the Life You Want, One Day at a Time',
    description: 'Research-backed habit trackers to help you build routines, break bad patterns, and make positive change stick for good.',
    accentColor: 'var(--gold)',
    bgGradient: 'linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(247,242,232,0.60) 100%)',
    features: [
      { icon: Zap,         label: '21-Day & 66-Day Formats' },
      { icon: Download,    label: 'Up to 20 Habits at Once' },
      { icon: Smartphone,  label: 'Daily & Monthly Views' },
      { icon: RefreshCcw,  label: 'Streak Tracking Built In' },
    ],
    seoTitle: 'Why Habit Tracking Changes Everything',
    seoBody: 'Research shows it takes 66 days on average to form a lasting habit — not 21. Our trackers are built around that science. Track up to 20 habits simultaneously, celebrate streaks, and use the weekly reflection prompts to understand what\'s working and what needs adjusting. Available in printable and digital formats.',
  },
  'planner-bundles': {
    headline: 'Planner Bundles',
    subheadline: 'More Planning, More Savings',
    description: 'Get our most popular planners bundled together at massive savings. The perfect way to set up your entire planning system at once.',
    accentColor: 'var(--gold)',
    bgGradient: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(184,169,212,0.12) 100%)',
    features: [
      { icon: Zap,         label: 'Up to 65% Off Individual Price' },
      { icon: Download,    label: 'Multiple Planners in One' },
      { icon: Smartphone,  label: 'Mix of Digital & Printable' },
      { icon: RefreshCcw,  label: 'Perfect as a Gift' },
    ],
    seoTitle: 'The Smart Way to Build Your Planning System',
    seoBody: 'Why buy one planner when you can own your complete productivity system? Our bundles pair complementary planners together — budget + finance, student + habit, wellness + journal — at prices that make it a no-brainer. Each bundle includes all file formats and is delivered instantly to your email.',
  },
}

const defaultMeta = {
  headline: '',
  subheadline: 'Premium Collection',
  description: 'Browse our collection of premium planners — instant download, PDF & GoodNotes ready.',
  accentColor: 'var(--gold)',
  bgGradient: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(184,169,212,0.10) 100%)',
  features: [
    { icon: Zap,        label: 'Instant Download' },
    { icon: Smartphone, label: 'Multi-Device Ready' },
    { icon: Download,   label: 'Multiple Formats' },
    { icon: RefreshCcw, label: 'Undated & Flexible' },
  ],
  seoTitle: 'Why Choose Arwign Planners?',
  seoBody: 'Arwign Planners are crafted by productivity designers who understand that the right planner changes everything. Every template is tested, refined, and built to work beautifully on paper and screen.',
}

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

const FORMAT_OPTIONS = ['PDF', 'GoodNotes', 'Notability', 'Xodo']

const PRICE_OPTIONS = [
  { value: 'under-10', label: 'Under $10' },
  { value: '10-20',    label: '$10 – $20' },
  { value: 'over-20',  label: 'Over $20' },
]

interface Props {
  category:           Category
  initialProducts:    Product[]
  totalCount:         number
  relatedCategories:  Category[]
  currentPage:        number
  searchParams:       { sort?: string; format?: string; price?: string; page?: string }
}

export default function CategoryClient({
  category, initialProducts, totalCount, relatedCategories, currentPage, searchParams,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [gridCols, setGridCols] = useState<3 | 4>(4)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const meta = CATEGORY_META[category.slug] ?? { ...defaultMeta, headline: category.name }

  const updateParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }, [params, pathname, router])

  const clearAll = () => router.push(pathname)

  const activeFilters = [
    searchParams.format && { key: 'format', label: searchParams.format },
    searchParams.price  && { key: 'price',  label: PRICE_OPTIONS.find(p => p.value === searchParams.price)?.label ?? searchParams.price },
  ].filter(Boolean) as { key: string; label: string }[]

  const totalPages = Math.ceil(totalCount / 24)

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="w-full pt-10 pb-12 border-b"
        style={{ background: meta.bgGradient, borderColor: 'var(--border)' }}
      >
        <div className="container-site">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Shop</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>{category.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <p
                className="text-xs uppercase tracking-widest font-semibold mb-3"
                style={{ color: meta.accentColor === 'var(--gold)' ? 'var(--gold)' : meta.accentColor, letterSpacing: '0.12em' }}
              >
                {meta.subheadline}
              </p>
              <h1
                className="font-display mb-4"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.08, color: 'var(--text-primary)' }}
              >
                {meta.headline || category.name}
              </h1>
              <p className="text-sm leading-relaxed max-w-xl mb-6" style={{ color: 'var(--text-secondary)' }}>
                {meta.description}
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {meta.features.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={11} style={{ color: 'var(--gold)' }} />
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex gap-6 lg:gap-8 flex-shrink-0"
            >
              {[
                { value: totalCount,       label: 'Products' },
                { value: '⭐ 4.9',         label: 'Avg Rating' },
                { value: 'Instant',        label: 'Download' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="font-display text-3xl font-semibold mb-0.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Sticky Filter + Sort Toolbar ─────────────────────── */}
      <div
        className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="container-site">
          <div className="flex flex-wrap items-center gap-3">

            {/* Format filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide hidden sm:block" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Format
              </span>
              <button
                className={`category-pill ${!searchParams.format ? 'active' : ''}`}
                onClick={() => updateParam('format', null)}
              >
                All
              </button>
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt}
                  className={`category-pill ${searchParams.format === fmt ? 'active' : ''}`}
                  onClick={() => updateParam('format', searchParams.format === fmt ? null : fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--border)' }} />

            {/* Price filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide hidden sm:block" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Price
              </span>
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`category-pill ${searchParams.price === opt.value ? 'active' : ''}`}
                  onClick={() => updateParam('price', searchParams.price === opt.value ? null : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort */}
            <select
              value={searchParams.sort ?? 'popular'}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="input-field py-2 cursor-pointer text-sm"
              style={{ width: 'auto', minWidth: 160 }}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Grid toggle */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setGridCols(4)}
                className="p-2 rounded-lg transition-all"
                style={{ background: gridCols === 4 ? 'var(--charcoal)' : 'transparent', color: gridCols === 4 ? 'white' : 'var(--text-muted)' }}
                aria-label="4 column grid"
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => setGridCols(3)}
                className="p-2 rounded-lg transition-all"
                style={{ background: gridCols === 3 ? 'var(--charcoal)' : 'transparent', color: gridCols === 3 ? 'white' : 'var(--text-muted)' }}
                aria-label="3 column grid"
              >
                <Grid2X2 size={15} />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateParam(f.key, null)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                  style={{ background: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.35)', color: 'var(--gold-dark)' }}
                >
                  {f.label} <X size={10} />
                </button>
              ))}
              <button
                onClick={clearAll}
                className="text-xs underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Product Grid ──────────────────────────────────────── */}
      <div className="container-site py-10">
        {/* Results count */}
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          {totalCount} {totalCount === 1 ? 'product' : 'products'}
          {activeFilters.length > 0 && ' matching your filters'}
        </p>

        {initialProducts.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No planners found</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Try removing a filter or browse all {category.name}
            </p>
            <button className="btn-outline" onClick={clearAll}>
              Clear Filters
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${searchParams.format}-${searchParams.price}-${searchParams.sort}-${currentPage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`grid gap-5 ${
                gridCols === 4
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {initialProducts.map((product, i) => (
                <PlannerCard key={product.id} product={product} index={i} priority={i < 4} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-14">
            {currentPage > 1 && (
              <button
                onClick={() => updateParam('page', String(currentPage - 1))}
                className="btn-outline px-6"
              >
                Previous
              </button>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => updateParam('page', String(p))}
                  className="w-9 h-9 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: p === currentPage ? 'var(--gold)' : 'transparent',
                    color: p === currentPage ? 'white' : 'var(--text-secondary)',
                    border: p === currentPage ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            {currentPage < totalPages && (
              <button
                onClick={() => updateParam('page', String(currentPage + 1))}
                className="btn-primary px-6"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── SEO Content Block ─────────────────────────────────── */}
      <section
        className="border-t py-14"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div className="container-site max-w-3xl mx-auto text-center">
          <div className="divider-gold mb-6" />
          <h2 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
            {meta.seoTitle}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {meta.seoBody}
          </p>
        </div>
      </section>

      {/* ── Related Categories ────────────────────────────────── */}
      {relatedCategories.length > 0 && (
        <section className="border-t py-14" style={{ borderColor: 'var(--border)' }}>
          <div className="container-site">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
                Keep Exploring
              </p>
              <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>
                More Collections
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {relatedCategories.map((cat, i) => (
                <motion.div
                  key={cat.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <Link
                    href={`/shop/category/${cat.slug}`}
                    className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-300 hover:border-gold hover:shadow-gold"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: 'rgba(201,168,76,0.10)' }}
                    >
                      <span className="text-lg" style={{ color: 'var(--gold)' }}>✦</span>
                    </div>
                    <p
                      className="text-xs font-semibold leading-snug transition-colors duration-200 group-hover:text-gold"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                    >
                      {cat.name}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
