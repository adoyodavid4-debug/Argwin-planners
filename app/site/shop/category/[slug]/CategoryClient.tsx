'use client'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Search, SlidersHorizontal, Grid3X3, Grid2X2,
  List as ListIcon, X, Download, Star, Zap, Smartphone, RefreshCcw,
  ShoppingCart, Heart, Eye, Check, Shield, CreditCard, Clock, ArrowUp,
  Scale, Sparkles, Layers, Tag as TagIcon, Plus, ArrowRight, Quote,
  BadgeCheck, Calendar, Link2, Palette, Tablet, Printer,
} from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import toast from 'react-hot-toast'
import QuickViewModal from '@/components/shop/QuickViewModal'
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
  { value: 'name',       label: 'Alphabetical' },
]

const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '3 stars & up' },
  { value: 4, label: '4 stars & up' },
  { value: 4.5, label: '4.5 stars & up' },
]

const FAQS = [
  { q: 'How do I receive my planner after purchase?', a: 'Instantly. The moment your payment is confirmed, a secure download link is emailed to you and is also available from your account. No waiting, no shipping.' },
  { q: 'Which apps and devices are supported?', a: 'Our digital planners work with GoodNotes 5 & 6, Notability, Xodo, and any PDF annotation app on iPad, Android tablets, and desktop. Printable versions print beautifully on any home or office printer.' },
  { q: 'Are the planners dated or undated?', a: 'Most of our planners are undated so you can start any day of the year and never waste a page. Product descriptions clearly state the format for each item.' },
  { q: 'What is your refund policy?', a: 'Because these are instant digital downloads we generally cannot offer refunds, but if something is wrong with your file our support team will make it right within 30 days.' },
]

const MAX_COMPARE = 3
const PER_PAGE = 12
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'

const price$ = (n: number) => `$${n.toFixed(2)}`
const compactNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`

interface Props {
  category:          Category
  products:          Product[]
  relatedCategories: Category[]
}

// ── Star rating display ───────────────────────────────────────
function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.6}
          style={{
            fill:   i <= Math.round(value) ? 'var(--gold)' : 'transparent',
            stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Animated count-up number ──────────────────────────────────
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{compactNum(n)}{suffix}</>
}

export default function CategoryClient({ category, products, relatedCategories }: Props) {
  const meta = CATEGORY_META[category.slug] ?? { ...defaultMeta, headline: category.name }

  // ── Facets derived from the full product set ────────────────
  const priceBounds = useMemo<[number, number]>(() => {
    if (!products.length) return [0, 100]
    const prices = products.map((p) => p.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [products])

  const allFormats = useMemo(() => {
    const s = new Set<string>()
    products.forEach((p) => (p.file_formats ?? []).forEach((f) => s.add(f)))
    return Array.from(s).sort()
  }, [products])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((p) => (p.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t)
  }, [products])

  // ── Aggregate stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const rated = products.filter((p) => p.rating_avg > 0)
    const avg = rated.length ? rated.reduce((s, p) => s + p.rating_avg, 0) / rated.length : 4.9
    const downloads = products.reduce((s, p) => s + (p.download_count ?? 0), 0)
    return { count: products.length, avg, downloads, formats: allFormats.length }
  }, [products, allFormats])

  // ── Filter / view state ─────────────────────────────────────
  const [search, setSearch]           = useState('')
  const [formats, setFormats]         = useState<string[]>([])
  const [tags, setTags]               = useState<string[]>([])
  const [minP, setMinP]               = useState(priceBounds[0])
  const [maxP, setMaxP]               = useState(priceBounds[1])
  const [minRating, setMinRating]     = useState(0)
  const [onSale, setOnSale]           = useState(false)
  const [onlyNew, setOnlyNew]         = useState(false)
  const [onlyBest, setOnlyBest]       = useState(false)
  const [sort, setSort]               = useState('popular')
  const [view, setView]               = useState<'grid' | 'list'>('grid')
  const [cols, setCols]               = useState<2 | 3 | 4>(3)
  const [visible, setVisible]         = useState(PER_PAGE)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [compare, setCompare]         = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [quickView, setQuickView]     = useState<Product | null>(null)
  const [recentIds, setRecentIds]     = useState<string[]>([])
  const [showTop, setShowTop]         = useState(false)
  const [mounted, setMounted]         = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMinP(priceBounds[0]); setMaxP(priceBounds[1]) }, [priceBounds])

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem('arwign-recently-viewed')
      if (raw) setRecentIds(JSON.parse(raw))
    } catch {}
    const onScroll = () => setShowTop(window.scrollY > 700)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Filtering + sorting pipeline ────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (formats.length && !formats.some((f) => (p.file_formats ?? []).includes(f))) return false
      if (tags.length && !tags.some((t) => (p.tags ?? []).includes(t))) return false
      if (p.price < minP || p.price > maxP) return false
      if (minRating && p.rating_avg < minRating) return false
      if (onSale && !(p.compare_price && p.compare_price > p.price)) return false
      if (onlyNew && !p.is_new) return false
      if (onlyBest && !p.is_bestseller) return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'rating':     return b.rating_avg - a.rating_avg
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
        case 'name':       return a.title.localeCompare(b.title)
        default: // popular
          return (Number(b.is_bestseller) - Number(a.is_bestseller))
            || (b.download_count ?? 0) - (a.download_count ?? 0)
            || (a.display_order ?? 9999) - (b.display_order ?? 9999)
      }
    })
    return list
  }, [products, search, formats, tags, minP, maxP, minRating, onSale, onlyNew, onlyBest, sort])

  useEffect(() => { setVisible(PER_PAGE) }, [search, formats, tags, minP, maxP, minRating, onSale, onlyNew, onlyBest, sort])

  const visibleProducts = filtered.slice(0, visible)

  const recentlyViewed = useMemo(
    () => recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 6) as Product[],
    [recentIds, products],
  )

  // ── Filter helpers ──────────────────────────────────────────
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const priceTouched = minP !== priceBounds[0] || maxP !== priceBounds[1]
  const activeCount =
    formats.length + tags.length + (minRating ? 1 : 0) +
    (priceTouched ? 1 : 0) + (onSale ? 1 : 0) + (onlyNew ? 1 : 0) + (onlyBest ? 1 : 0) + (search ? 1 : 0)

  const clearAll = () => {
    setSearch(''); setFormats([]); setTags([]); setMinRating(0)
    setMinP(priceBounds[0]); setMaxP(priceBounds[1])
    setOnSale(false); setOnlyNew(false); setOnlyBest(false)
  }

  const toggleCompare = (id: string) => {
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id)
      if (c.length >= MAX_COMPARE) { toast(`Compare up to ${MAX_COMPARE} planners`, { icon: '⚖️' }); return c }
      return [...c, id]
    })
  }

  const openQuickView = (p: Product) => {
    setQuickView(p)
    setRecentIds((prev) => {
      const next = [p.id, ...prev.filter((x) => x !== p.id)].slice(0, 12)
      try { localStorage.setItem('arwign-recently-viewed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const compareProducts = compare.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]

  const accent = meta.accentColor === 'var(--gold)' ? 'var(--gold)' : meta.accentColor

  // ── JSON-LD structured data ─────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://arwignplanners.com' },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://arwignplanners.com/shop' },
          { '@type': 'ListItem', position: 3, name: category.name },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: filtered.length,
        itemListElement: visibleProducts.slice(0, 12).map((p, i) => ({
          '@type': 'ListItem', position: i + 1, name: p.title,
          url: `https://arwignplanners.com/shop/${p.slug}`,
        })),
      },
    ],
  }

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative w-full pt-10 pb-12 border-b overflow-hidden"
        style={{ background: meta.bgGradient, borderColor: 'var(--border)' }}>
        {/* Floating accent orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full blur-3xl opacity-40 animate-float"
            style={{ width: 280, height: 280, top: -80, right: '8%', background: accent }} />
          <div className="absolute rounded-full blur-3xl opacity-30 animate-float-delayed"
            style={{ width: 200, height: 200, bottom: -60, left: '4%', background: 'var(--gold)' }} />
        </div>

        <div className="container-site relative">
          <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Shop</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>{category.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: accent, letterSpacing: '0.12em' }}>
                {meta.subheadline}
              </p>
              <h1 className="font-display mb-4" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.08, color: 'var(--text-primary)' }}>
                {meta.headline || category.name}
              </h1>
              <p className="text-sm leading-relaxed max-w-xl mb-6" style={{ color: 'var(--text-secondary)' }}>
                {meta.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {meta.features.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Icon size={11} style={{ color: 'var(--gold)' }} />
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Live stats */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }}
              className="grid grid-cols-3 gap-3 flex-shrink-0">
              {[
                { value: <CountUp to={stats.count} suffix="+" />, label: 'Designs' },
                { value: <span className="inline-flex items-center gap-1"><Star size={18} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />{stats.avg.toFixed(1)}</span>, label: 'Avg Rating' },
                { value: <CountUp to={stats.downloads || stats.count * 120} suffix="+" />, label: 'Downloads' },
              ].map((s, i) => (
                <div key={i} className="text-center px-4 py-3 rounded-2xl border min-w-[92px]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <p className="font-display text-2xl lg:text-3xl font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            {[
              { icon: Zap,        label: 'Instant Download' },
              { icon: Shield,     label: 'Secure Checkout' },
              { icon: Smartphone, label: 'Works on Any Device' },
              { icon: CreditCard, label: 'Card · PayPal · M-Pesa' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Icon size={14} style={{ color: 'var(--gold)' }} />{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COLLECTION SPOTLIGHT ══════════════════════════════ */}
      <Spotlight category={category} products={products} meta={meta} accent={accent} />

      {/* ══ STICKY TOOLBAR ════════════════════════════════════ */}
      <div className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}>
        <div className="container-site flex items-center gap-3">
          {/* Filters toggle */}
          <button onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
            <SlidersHorizontal size={14} /> Filters
            {activeCount > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--gold)' }}>{activeCount}</span>
            )}
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${category.name.toLowerCase()}…`}
              className="input-field !py-2 !pl-10 !pr-9 text-sm"
              aria-label="Search products"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Sort */}
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="input-field !py-2 !pr-9 cursor-pointer text-sm appearance-none" style={{ width: 'auto', minWidth: 168 }} aria-label="Sort products">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>

          {/* View + density toggle */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setView('list')} className="p-2 rounded-lg transition-all"
              style={{ background: view === 'list' ? 'var(--charcoal)' : 'transparent', color: view === 'list' ? 'white' : 'var(--text-muted)' }} aria-label="List view"><ListIcon size={15} /></button>
            <button onClick={() => { setView('grid'); setCols(3) }} className="p-2 rounded-lg transition-all"
              style={{ background: view === 'grid' && cols === 3 ? 'var(--charcoal)' : 'transparent', color: view === 'grid' && cols === 3 ? 'white' : 'var(--text-muted)' }} aria-label="3 column grid"><Grid2X2 size={15} /></button>
            <button onClick={() => { setView('grid'); setCols(4) }} className="p-2 rounded-lg transition-all"
              style={{ background: view === 'grid' && cols === 4 ? 'var(--charcoal)' : 'transparent', color: view === 'grid' && cols === 4 ? 'white' : 'var(--text-muted)' }} aria-label="4 column grid"><Grid3X3 size={15} /></button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="container-site flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
            {search && <Chip label={`“${search}”`} onClear={() => setSearch('')} />}
            {formats.map((f) => <Chip key={f} label={f} onClear={() => toggle(formats, setFormats, f)} />)}
            {tags.map((t) => <Chip key={t} label={t} onClear={() => toggle(tags, setTags, t)} />)}
            {minRating > 0 && <Chip label={`${minRating}★ & up`} onClear={() => setMinRating(0)} />}
            {priceTouched && <Chip label={`${price$(minP)}–${price$(maxP)}`} onClear={() => { setMinP(priceBounds[0]); setMaxP(priceBounds[1]) }} />}
            {onSale && <Chip label="On Sale" onClear={() => setOnSale(false)} />}
            {onlyNew && <Chip label="New" onClear={() => setOnlyNew(false)} />}
            {onlyBest && <Chip label="Best Sellers" onClear={() => setOnlyBest(false)} />}
            <button onClick={clearAll} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Clear all</button>
          </div>
        )}
      </div>

      {/* ══ BODY: sidebar + grid ══════════════════════════════ */}
      <div id="shop-grid" className="container-site py-10 flex gap-8 items-start" style={{ scrollMarginTop: 160 }}>
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-[160px]">
          <FilterPanel
            allFormats={allFormats} allTags={allTags} priceBounds={priceBounds}
            formats={formats} tags={tags} minP={minP} maxP={maxP} minRating={minRating}
            onSale={onSale} onlyNew={onlyNew} onlyBest={onlyBest}
            setFormats={setFormats} setTags={setTags} setMinP={setMinP} setMaxP={setMaxP}
            setMinRating={setMinRating} setOnSale={setOnSale} setOnlyNew={setOnlyNew} setOnlyBest={setOnlyBest}
            toggle={toggle} clearAll={clearAll} activeCount={activeCount}
          />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.min(visible, filtered.length)}</span> of{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{filtered.length}</span> {filtered.length === 1 ? 'planner' : 'planners'}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <Search size={28} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No planners match</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try removing a filter or searching something else.</p>
              <button className="btn-outline" onClick={clearAll}>Clear Filters</button>
            </div>
          ) : view === 'list' ? (
            <div className="flex flex-col gap-4">
              {visibleProducts.map((p, i) => (
                <ProductRow key={p.id} product={p} index={i}
                  inCompare={compare.includes(p.id)} onCompare={() => toggleCompare(p.id)} onQuickView={() => openQuickView(p)} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div ref={gridRef} layout
                className={`grid gap-5 ${cols === 4 ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                {visibleProducts.map((p, i) => (
                  <ProductTile key={p.id} product={p} index={i} priority={i < 4}
                    inCompare={compare.includes(p.id)} onCompare={() => toggleCompare(p.id)} onQuickView={() => openQuickView(p)} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Load more */}
          {visible < filtered.length && (
            <div className="flex flex-col items-center gap-3 mt-12">
              <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${(Math.min(visible, filtered.length) / filtered.length) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
              </div>
              <button onClick={() => setVisible((v) => v + PER_PAGE)} className="btn-outline px-8">
                Load More <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ WHAT'S INSIDE ═════════════════════════════════════ */}
      <WhatsInside accent={accent} bgGradient={meta.bgGradient} />

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <HowItWorks />

      {/* ══ DEVICE / FORMAT SHOWCASE ══════════════════════════ */}
      <DeviceShowcase categoryName={category.name} />

      {/* ══ TESTIMONIALS ══════════════════════════════════════ */}
      <Testimonials categoryName={category.name} rating={stats.avg} />

      {/* ══ RECENTLY VIEWED ═══════════════════════════════════ */}
      {mounted && recentlyViewed.length > 0 && (
        <section className="border-t py-12" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={16} style={{ color: 'var(--gold)' }} />
              <h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Recently Viewed</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {recentlyViewed.map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="flex-shrink-0 w-40 group">
                  <div className="relative rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '3/4', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill sizes="160px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <p className="text-xs font-semibold line-clamp-2 group-hover:text-gold transition-colors" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{price$(p.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ BENEFITS STRIP ════════════════════════════════════ */}
      <section className="border-t py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap,        title: 'Instant Delivery',   body: 'Files land in your inbox the moment you check out.' },
            { icon: Layers,     title: 'Every Format',       body: 'PDF, GoodNotes, Notability & print-ready sizes.' },
            { icon: RefreshCcw, title: 'Lifetime Access',    body: 'Re-download anytime from your account, free forever.' },
            { icon: Shield,     title: 'Secure & Trusted',   body: 'Encrypted checkout with global payment options.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.10)' }}>
                <Icon size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WHY ARWIGN — COMPARISON ═══════════════════════════ */}
      <WhyArwign />

      {/* ══ SEO CONTENT ═══════════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site max-w-3xl mx-auto text-center">
          <div className="divider-gold mb-6" />
          <h2 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>{meta.seoTitle}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{meta.seoBody}</p>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Good to Know</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Frequently Asked</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER CTA ════════════════════════════════════ */}
      <NewsletterCTA categoryName={category.name} />

      {/* ══ RELATED CATEGORIES ════════════════════════════════ */}
      {relatedCategories.length > 0 && (
        <section className="border-t py-14" style={{ borderColor: 'var(--border)' }}>
          <div className="container-site">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Keep Exploring</p>
              <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>More Collections</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedCategories.map((cat, i) => (
                <motion.div key={cat.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.05 }}>
                  <Link href={`/shop/category/${cat.slug}`}
                    className="group relative flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all duration-300 hover:border-gold hover:shadow-gold overflow-hidden"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(201,168,76,0.10)' }}>
                      <Sparkles size={18} style={{ color: 'var(--gold)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-snug transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                      {cat.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{cat.description}</p>}
                    </div>
                    <span className="text-xs font-medium inline-flex items-center gap-1 mt-auto" style={{ color: 'var(--gold)' }}>
                      Shop now <ChevronRight size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ MOBILE FILTER DRAWER ══════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(26,24,32,0.55)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.div className="fixed top-0 left-0 h-full w-[86vw] max-w-sm z-50 lg:hidden overflow-y-auto p-6"
              style={{ background: 'var(--bg-card)' }}
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Filters</h3>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><X size={16} /></button>
              </div>
              <FilterPanel
                allFormats={allFormats} allTags={allTags} priceBounds={priceBounds}
                formats={formats} tags={tags} minP={minP} maxP={maxP} minRating={minRating}
                onSale={onSale} onlyNew={onlyNew} onlyBest={onlyBest}
                setFormats={setFormats} setTags={setTags} setMinP={setMinP} setMaxP={setMaxP}
                setMinRating={setMinRating} setOnSale={setOnSale} setOnlyNew={setOnlyNew} setOnlyBest={setOnlyBest}
                toggle={toggle} clearAll={clearAll} activeCount={activeCount}
              />
              <button onClick={() => setDrawerOpen(false)} className="btn-primary w-full justify-center mt-6">
                Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ COMPARE BAR ═══════════════════════════════════════ */}
      <AnimatePresence>
        {compareProducts.length > 0 && (
          <motion.div className="fixed bottom-0 left-0 right-0 z-40 border-t"
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'tween', duration: 0.3 }}
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 -8px 32px rgba(44,42,53,0.12)' }}>
            <div className="container-site py-3 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
                <span className="text-xs font-semibold flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                  <Scale size={15} style={{ color: 'var(--gold)' }} /> Compare
                </span>
                {compareProducts.map((p) => (
                  <div key={p.id} className="relative flex-shrink-0 w-11 h-14 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill sizes="44px" className="object-cover" />
                    <button onClick={() => toggleCompare(p.id)} className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-bl-md" style={{ background: 'rgba(0,0,0,0.6)' }} aria-label="Remove">
                      <X size={9} color="white" />
                    </button>
                  </div>
                ))}
                {Array.from({ length: MAX_COMPARE - compareProducts.length }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-11 h-14 rounded-lg border border-dashed flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
                    <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
              <button onClick={() => setCompare([])} className="text-xs underline flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Clear</button>
              <button onClick={() => setCompareOpen(true)} disabled={compareProducts.length < 2} className="btn-primary !py-2.5 !px-6 flex-shrink-0 disabled:opacity-50">
                Compare ({compareProducts.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SCROLL TO TOP ═════════════════════════════════════ */}
      <AnimatePresence>
        {showTop && (
          <motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full flex items-center justify-center shadow-gold"
            style={{ background: 'var(--gold)', color: 'white', bottom: compareProducts.length ? 92 : 24 }} aria-label="Back to top">
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
      {compareOpen && <CompareModal products={compareProducts} onClose={() => setCompareOpen(false)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button onClick={onClear}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
      style={{ background: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.35)', color: 'var(--gold-dark)' }}>
      {label} <X size={10} />
    </button>
  )
}

interface FilterPanelProps {
  allFormats: string[]; allTags: string[]; priceBounds: [number, number]
  formats: string[]; tags: string[]; minP: number; maxP: number; minRating: number
  onSale: boolean; onlyNew: boolean; onlyBest: boolean
  setFormats: (v: string[]) => void; setTags: (v: string[]) => void
  setMinP: (v: number) => void; setMaxP: (v: number) => void; setMinRating: (v: number) => void
  setOnSale: (v: boolean) => void; setOnlyNew: (v: boolean) => void; setOnlyBest: (v: boolean) => void
  toggle: (arr: string[], set: (v: string[]) => void, v: string) => void
  clearAll: () => void; activeCount: number
}

function FilterPanel(p: FilterPanelProps) {
  const [min, max] = p.priceBounds
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100)
  return (
    <div className="flex flex-col gap-7">
      {/* Toggles */}
      <div className="flex flex-col gap-1">
        {[
          { label: 'On Sale', on: p.onSale, set: p.setOnSale },
          { label: 'New Arrivals', on: p.onlyNew, set: p.setOnlyNew },
          { label: 'Best Sellers', on: p.onlyBest, set: p.setOnlyBest },
        ].map((t) => (
          <button key={t.label} onClick={() => t.set(!t.on)} className="flex items-center justify-between py-1.5">
            <span className="text-sm font-medium" style={{ color: t.on ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.label}</span>
            <span className={`switch ${t.on ? 'on' : ''}`}><span className="knob" /></span>
          </button>
        ))}
      </div>

      {/* Price */}
      <div>
        <FilterHeading>Price Range</FilterHeading>
        <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          <span>${p.minP}</span><span>${p.maxP}</span>
        </div>
        <div className="range-dual">
          <div className="range-track" />
          <div className="range-fill" style={{ left: `${pct(p.minP)}%`, right: `${100 - pct(p.maxP)}%` }} />
          <input type="range" min={min} max={max} value={p.minP}
            onChange={(e) => p.setMinP(Math.min(Number(e.target.value), p.maxP))} aria-label="Minimum price" />
          <input type="range" min={min} max={max} value={p.maxP}
            onChange={(e) => p.setMaxP(Math.max(Number(e.target.value), p.minP))} aria-label="Maximum price" />
        </div>
      </div>

      {/* Format */}
      {p.allFormats.length > 0 && (
        <div>
          <FilterHeading>Format</FilterHeading>
          <div className="flex flex-col">
            {p.allFormats.map((f) => {
              const on = p.formats.includes(f)
              return (
                <button key={f} onClick={() => p.toggle(p.formats, p.setFormats, f)} className={`filter-check ${on ? 'on' : ''}`}>
                  <span className="box">{on && <Check size={12} color="white" strokeWidth={3} />}</span>{f}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Rating */}
      <div>
        <FilterHeading>Rating</FilterHeading>
        <div className="flex flex-col gap-1">
          {RATING_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => p.setMinRating(r.value)} className="flex items-center gap-2 py-1.5">
              <span className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0"
                style={{ borderColor: p.minRating === r.value ? 'var(--gold)' : 'var(--border)' }}>
                {p.minRating === r.value && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />}
              </span>
              {r.value > 0 ? <span className="flex items-center gap-1"><Stars value={r.value} size={12} /></span> : null}
              <span className="text-sm" style={{ color: p.minRating === r.value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {p.allTags.length > 0 && (
        <div>
          <FilterHeading>Popular Tags</FilterHeading>
          <div className="flex flex-wrap gap-2">
            {p.allTags.map((t) => {
              const on = p.tags.includes(t)
              return (
                <button key={t} onClick={() => p.toggle(p.tags, p.setTags, t)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1"
                  style={{ background: on ? 'rgba(201,168,76,0.14)' : 'transparent', borderColor: on ? 'rgba(201,168,76,0.4)' : 'var(--border)', color: on ? 'var(--gold-dark)' : 'var(--text-secondary)' }}>
                  <TagIcon size={9} />{t}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {p.activeCount > 0 && (
        <button onClick={p.clearAll} className="btn-ghost justify-center w-full !py-2 text-xs" style={{ border: '1px solid var(--border)' }}>
          Clear all filters
        </button>
      )}
    </div>
  )
}

function FilterHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{children}</p>
}

// ── Shared card hooks ─────────────────────────────────────────
function useCardActions(product: Product) {
  const addItem    = useCartStore((s) => s.addItem)
  const inCart     = useCartStore((s) => s.hasItem(product.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(product.id))

  const add = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (inCart) return
    addItem({ id: product.id, title: product.title, price: product.price, thumbnail: product.thumbnail || FALLBACK_IMG, slug: product.slug })
    toast.success(`"${product.title}" added to cart ✦`)
  }
  const wish = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggleWish(product.id)
    toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' })
  }
  return { add, wish, inCart, isWished }
}

interface CardProps {
  product: Product; index: number; priority?: boolean
  inCompare: boolean; onCompare: () => void; onQuickView: () => void
}

function ProductTile({ product, index, priority, inCompare, onCompare, onQuickView }: CardProps) {
  const [loaded, setLoaded] = useState(false)
  const { add, wish, inCart, isWished } = useCardActions(product)
  const sale = product.compare_price && product.compare_price > product.price
  const off = sale ? Math.round((1 - product.price / product.compare_price!) * 100) : 0

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }} className="group">
      <div className="rounded-xl overflow-hidden tile-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <Link href={`/shop/${product.slug}`} aria-label={product.title}>
            <Image src={product.thumbnail || FALLBACK_IMG} alt={`${product.title} cover`} fill
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" priority={priority}
              onLoad={() => setLoaded(true)}
              className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.05]`} />
          </Link>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_new && <span className="badge badge-new">New</span>}
            {product.is_bestseller && <span className="badge badge-popular">Best Seller</span>}
            {sale && <span className="badge badge-sale">-{off}%</span>}
          </div>

          {/* Wishlist + compare */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-200" style={{ opacity: 1 }}>
            <button onClick={wish} aria-label="Toggle wishlist"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
              <Heart size={14} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : '#888' }} />
            </button>
            <button onClick={(e) => { e.preventDefault(); onCompare() }} aria-label="Compare"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: inCompare ? 'var(--gold)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
              <Scale size={14} style={{ color: inCompare ? 'white' : '#888' }} />
            </button>
          </div>

          {/* Hover actions */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <button onClick={(e) => { e.preventDefault(); onQuickView() }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold backdrop-blur"
              style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--charcoal)' }}><Eye size={13} /> Quick View</button>
            <button onClick={add} disabled={inCart} aria-label="Add to cart"
              className="w-10 flex items-center justify-center py-2 rounded-full disabled:opacity-60" style={{ background: 'var(--gold)', color: 'white' }}>
              {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
            </button>
          </div>
        </div>

        {/* Info */}
        <Link href={`/shop/${product.slug}`} className="block px-3.5 pt-3 pb-4">
          <p className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-gold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {product.title}
          </p>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Stars value={product.rating_avg || 5} size={11} />
            {product.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({product.rating_count})</span>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{price$(product.price)}</span>
            {sale && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{price$(product.compare_price!)}</span>}
          </div>
        </Link>
      </div>
    </motion.div>
  )
}

function ProductRow({ product, index, inCompare, onCompare, onQuickView }: CardProps) {
  const { add, wish, inCart, isWished } = useCardActions(product)
  const sale = product.compare_price && product.compare_price > product.price
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.2) }}
      className="flex gap-4 p-3 rounded-2xl border tile-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <Link href={`/shop/${product.slug}`} className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 110, aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
        <Image src={product.thumbnail || FALLBACK_IMG} alt={product.title} fill sizes="110px" className="object-cover" />
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <Link href={`/shop/${product.slug}`} className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug hover:text-gold transition-colors line-clamp-1" style={{ color: 'var(--text-primary)' }}>{product.title}</p>
          </Link>
          <button onClick={wish} aria-label="Wishlist" className="flex-shrink-0">
            <Heart size={16} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1"><Stars value={product.rating_avg || 5} size={12} />{product.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({product.rating_count})</span>}</div>
        {product.description && <p className="text-xs mt-1.5 line-clamp-2 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>}
        <div className="flex flex-wrap gap-1 mt-2">
          {(product.file_formats ?? []).slice(0, 4).map((f) => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{f}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-auto pt-3">
          <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{price$(product.price)}</span>
          {sale && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{price$(product.compare_price!)}</span>}
          <div className="flex-1" />
          <button onClick={(e) => { e.preventDefault(); onCompare() }} aria-label="Compare"
            className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
            style={{ borderColor: inCompare ? 'var(--gold)' : 'var(--border)', background: inCompare ? 'rgba(201,168,76,0.12)' : 'transparent' }}>
            <Scale size={14} style={{ color: inCompare ? 'var(--gold-dark)' : 'var(--text-muted)' }} />
          </button>
          <button onClick={onQuickView} className="btn-ghost !py-2 !px-3 text-xs hidden sm:inline-flex" style={{ border: '1px solid var(--border)' }}><Eye size={13} /> Quick View</button>
          <button onClick={add} disabled={inCart} className="btn-primary !py-2 !px-4 text-xs disabled:opacity-60">
            {inCart ? <><Check size={13} /> In Cart</> : <><ShoppingCart size={13} /> Add</>}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300" style={{ color: 'var(--gold)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NewsletterCTA({ categoryName }: { categoryName: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    try {
      await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, source: `category:${categoryName}` }) })
      setDone(true); toast.success('You\'re in! Check your inbox ✦')
    } catch { toast.error('Something went wrong — try again.') }
    finally { setLoading(false) }
  }
  return (
    <section className="border-t py-16 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
      <div className="container-site max-w-xl mx-auto text-center">
        <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Join the List</p>
        <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>Get 10% Off Your First Planner</h2>
        <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>Plus early access to new drops, free printables, and planning tips. No spam, unsubscribe anytime.</p>
        {done ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--gold-dark)' }}><Check size={16} /> Welcome aboard — your code is on its way.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="input-field flex-1" aria-label="Email address" />
            <button type="submit" disabled={loading} className="btn-primary justify-center disabled:opacity-60">{loading ? 'Joining…' : 'Get My 10%'}</button>
          </form>
        )}
      </div>
    </section>
  )
}

function CompareModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const addItem = useCartStore((s) => s.addItem)
  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    { label: 'Price', render: (p) => <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{price$(p.price)}</span> },
    { label: 'Rating', render: (p) => <span className="inline-flex items-center gap-1"><Stars value={p.rating_avg || 5} size={12} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(p.rating_avg || 5).toFixed(1)}</span></span> },
    { label: 'Formats', render: (p) => (p.file_formats ?? []).join(', ') || '—' },
    { label: 'Pages', render: (p) => p.page_count ?? '—' },
    { label: 'Type', render: (p) => <span className="capitalize">{p.delivery_type}</span> },
    { label: 'Tags', render: (p) => (p.tags ?? []).slice(0, 3).join(', ') || '—' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true" aria-label="Compare planners">
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg-card)', maxHeight: '90dvh' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-display text-xl flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Scale size={18} style={{ color: 'var(--gold)' }} /> Compare</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="overflow-auto p-5" style={{ maxHeight: 'calc(90dvh - 70px)' }}>
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${products.length}, minmax(0,1fr))` }}>
            <div />
            {products.map((p) => (
              <div key={p.id} className="text-center">
                <Link href={`/shop/${p.slug}`} className="block relative rounded-lg overflow-hidden mb-2 mx-auto" style={{ aspectRatio: '3/4', maxWidth: 120, background: 'var(--bg-secondary)' }}>
                  <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill sizes="120px" className="object-cover" />
                </Link>
                <p className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
              </div>
            ))}
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <div className="text-xs font-semibold uppercase tracking-wide py-3 border-t flex items-center" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{row.label}</div>
                {products.map((p) => (
                  <div key={p.id} className="text-sm py-3 border-t flex items-center justify-center text-center" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>{row.render(p)}</div>
                ))}
              </div>
            ))}
            <div />
            {products.map((p) => (
              <button key={p.id} onClick={() => { addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug }); toast.success('Added to cart ✦') }}
                className="btn-primary !py-2 !px-3 text-xs justify-center mt-3">Add to Cart</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Collection spotlight banner ───────────────────────────────
function Spotlight({ category, products, meta, accent }: { category: Category; products: Product[]; meta: any; accent: string }) {
  const covers = products.slice(0, 3)
  const top = [...products].sort((a, b) => Number(b.is_bestseller) - Number(a.is_bestseller) || (b.download_count ?? 0) - (a.download_count ?? 0))[0]
  const scrollToGrid = () => document.getElementById('shop-grid')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative border-b overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="container-site py-12 lg:py-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full"
            style={{ color: 'var(--gold-dark)', background: 'rgba(201,168,76,0.12)', letterSpacing: '0.12em' }}>
            <Sparkles size={12} /> The Collection
          </p>
          <h2 className="font-display mb-4" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Planning, beautifully reimagined
          </h2>
          <p className="text-sm leading-relaxed mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
            {meta.description} Every design is crafted in-house, tested by real planners, and delivered the second you check out.
          </p>
          <div className="flex flex-wrap gap-2 mb-8">
            {['Hand-crafted layouts', 'Instant delivery', 'Lifetime access', 'Loved worldwide'].map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                <Check size={11} style={{ color: 'var(--gold)' }} /> {c}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={scrollToGrid} className="btn-primary">Browse the Collection <ArrowRight size={15} /></button>
            {top && <Link href={`/shop/${top.slug}`} className="btn-outline">View the Bestseller</Link>}
          </div>
        </motion.div>

        {/* Cover collage */}
        <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1 }}
          className="relative h-[320px] sm:h-[400px] flex items-center justify-center">
          <div aria-hidden className="absolute rounded-full blur-3xl opacity-50" style={{ width: 360, height: 360, background: accent }} />
          {covers.length > 0 ? covers.map((p, i) => {
            const pos = [
              { rotate: '-8deg', x: '-32%', z: 1, scale: 0.86 },
              { rotate: '0deg',  x: '0%',   z: 3, scale: 1 },
              { rotate: '8deg',  x: '32%',  z: 1, scale: 0.86 },
            ][i] ?? { rotate: '0deg', x: '0%', z: 1, scale: 1 }
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className="absolute rounded-2xl overflow-hidden shadow-2xl"
                style={{ width: 200, aspectRatio: '3/4', transform: `translateX(${pos.x}) rotate(${pos.rotate}) scale(${pos.scale})`, zIndex: pos.z, border: '3px solid var(--bg-card)' }}>
                <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill sizes="200px" className="object-cover" />
              </motion.div>
            )
          }) : (
            <div className="relative rounded-2xl shadow-2xl" style={{ width: 220, aspectRatio: '3/4', background: meta.bgGradient }} />
          )}
          {/* Floating rating badge */}
          <motion.div initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.5 }}
            className="absolute bottom-4 right-2 sm:right-8 z-10 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.14)' }}><Star size={16} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} /></div>
            <div><p className="text-sm font-bold leading-none" style={{ color: 'var(--text-primary)' }}>4.9 / 5</p><p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Loved by planners</p></div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── What's inside ─────────────────────────────────────────────
function WhatsInside({ accent, bgGradient }: { accent: string; bgGradient: string }) {
  const items = [
    { icon: Link2,    title: 'Hyperlinked Navigation',  body: 'Tap any tab to jump between yearly, monthly, weekly and daily views — instantly.' },
    { icon: Calendar, title: '12 Months · 52 Weeks',     body: 'Complete monthly spreads, weekly layouts and daily pages for a full year of planning.' },
    { icon: Palette,  title: 'Beautiful Themes',          body: 'Curated colour palettes and elegant typography designed to make you want to plan.' },
    { icon: RefreshCcw, title: 'Undated & Reusable',      body: 'Start any day, any month. Never waste a page and reuse it year after year.' },
    { icon: Layers,   title: 'Every File Format',         body: 'PDF, GoodNotes, Notability and print-ready A4 & A5 sizes included in every purchase.' },
    { icon: BadgeCheck, title: 'Free Lifetime Updates',   body: 'Buy once and re-download improved versions from your account, forever.' },
  ]
  return (
    <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: bgGradient }}>
      <div className="container-site">
        <div className="text-center mb-12 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Thoughtful by Design</p>
          <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>What&rsquo;s Inside Every Planner</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Each planner is packed with the details that make planning effortless and a joy to return to.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
              className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(201,168,76,0.12)' }}>
                <Icon size={20} style={{ color: 'var(--gold)' }} />
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: ShoppingCart, title: 'Choose Your Planner', body: 'Pick a design you love and check out securely with card, PayPal or M-Pesa.' },
    { icon: Download,     title: 'Download Instantly',  body: 'Your files arrive by email and in your account the moment payment clears.' },
    { icon: Sparkles,     title: 'Start Planning',       body: 'Import to GoodNotes or print at home and begin building the life you want.' },
  ]
  return (
    <section className="border-t py-16" style={{ borderColor: 'var(--border)' }}>
      <div className="container-site">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Simple as 1·2·3</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>How It Works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative max-w-4xl mx-auto">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative text-center flex flex-col items-center">
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)' }}>
                <Icon size={24} style={{ color: 'var(--gold)' }} />
                <span className="absolute -top-2 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--gold)' }}>{i + 1}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Device / format showcase ──────────────────────────────────
function DeviceShowcase({ categoryName }: { categoryName: string }) {
  const apps = [
    { icon: Tablet,     label: 'iPad & GoodNotes' },
    { icon: Smartphone, label: 'Notability' },
    { icon: Eye,        label: 'Xodo & PDF' },
    { icon: Printer,    label: 'Print at Home' },
  ]
  return (
    <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--charcoal)' }}>
      <div className="container-site grid lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold-light)', letterSpacing: '0.12em' }}>Use It Anywhere</p>
          <h2 className="font-display text-display-sm mb-4" style={{ color: '#fff' }}>Works Beautifully on Every Device</h2>
          <p className="text-sm leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Annotate on your iPad, type on your laptop, or print and bind at home. Your {categoryName.toLowerCase()} go wherever your ideas do — no subscriptions, no lock-in.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {apps.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Icon size={18} style={{ color: 'var(--gold-light)' }} />
                <span className="text-sm font-medium" style={{ color: '#fff' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 gap-4">
          {[
            { n: '50k+', l: 'Downloads' },
            { n: '4.9★', l: 'Avg Rating' },
            { n: '100%', l: 'Instant Access' },
            { n: '30-Day', l: 'Happiness Promise' },
          ].map((s) => (
            <div key={s.l} className="text-center py-7 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-display text-3xl font-semibold mb-1" style={{ color: 'var(--gold-light)' }}>{s.n}</p>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────
function Testimonials({ categoryName, rating }: { categoryName: string; rating: number }) {
  const reviews = [
    { name: 'Amara N.',    grad: 'linear-gradient(135deg,#B8A9D4,#7B6FAE)', text: `Genuinely the most beautiful planner I've ever used. The hyperlinks make it so fast to navigate — I've finally stuck to a routine.` },
    { name: 'Daniel K.',   grad: 'linear-gradient(135deg,#C9A84C,#E2C97E)', text: `Downloaded it in seconds and had it in GoodNotes before my coffee was ready. Worth every cent and then some.` },
    { name: 'Priya S.',    grad: 'linear-gradient(135deg,#E8C5C0,#C9847C)', text: `I've bought planners before that I never opened. This one I actually look forward to. The design just makes you want to plan.` },
  ]
  return (
    <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="container-site">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Stars value={rating || 5} size={18} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{(rating || 4.9).toFixed(1)} out of 5</span>
          </div>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Loved by Thousands of Planners</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.1 }}
              className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <Quote size={26} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
              <Stars value={5} size={13} />
              <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{r.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: r.grad }}>{r.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified Purchase</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Why Arwign comparison ─────────────────────────────────────
function WhyArwign() {
  const rows = [
    'Instant digital delivery',
    'Hyperlinked, tap-to-navigate pages',
    'Works on iPad, tablet & print',
    'Undated — start anytime, reuse yearly',
    'Free lifetime updates',
    'Designed by real productivity nerds',
  ]
  return (
    <section className="border-t py-16" style={{ borderColor: 'var(--border)' }}>
      <div className="container-site max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Difference</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Why Choose Arwign</h2>
        </div>
        <div className="rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="grid grid-cols-[1fr_auto_auto]">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }} />
            <div className="p-4 border-b text-center min-w-[110px]" style={{ borderColor: 'var(--border)', background: 'rgba(201,168,76,0.08)' }}>
              <span className="font-display text-base font-semibold" style={{ color: 'var(--gold-dark)' }}>Arwign</span>
            </div>
            <div className="p-4 border-b text-center min-w-[110px]" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Ordinary</span>
            </div>
            {rows.map((row, i) => (
              <div key={row} className="contents">
                <div className="p-4 text-sm flex items-center" style={{ color: 'var(--text-secondary)', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>{row}</div>
                <div className="p-4 flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.08)', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--gold)' }}><Check size={13} color="white" strokeWidth={3} /></span>
                </div>
                <div className="p-4 flex items-center justify-center" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <X size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
