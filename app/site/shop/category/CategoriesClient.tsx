'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Tablet, Printer, Wallet, BookOpen, HeartPulse, Briefcase, CheckCircle,
  Utensils, Brain, Target, PiggyBank, LayoutTemplate, Package, Notebook,
  Sparkles, Search, ArrowRight, ChevronRight, X, Zap, Shield, Layers, Star,
} from 'lucide-react'
import type { Category } from '@/types/database'

// ── Slug → presentation meta ──────────────────────────────────
const CAT_META: Record<string, { icon: React.ElementType; accent: string; blurb: string }> = {
  'digital-planners':   { icon: Tablet,         accent: '#7B6FAE', blurb: 'Hyperlinked, GoodNotes-ready planners for iPad & tablet.' },
  'printable-planners': { icon: Printer,         accent: '#C9847C', blurb: 'Print-at-home pages in A4 & A5, ready to bind.' },
  'budget-planners':    { icon: Wallet,          accent: '#C9A84C', blurb: 'Track spending, crush debt and grow your savings.' },
  'student-planners':   { icon: BookOpen,        accent: '#6E7E66', blurb: 'Assignments, exams and study schedules, organised.' },
  'wellness-planners':  { icon: HeartPulse,      accent: '#E8A0A0', blurb: 'Mood, sleep, gratitude and self-care rituals.' },
  'business-planners':  { icon: Briefcase,       accent: '#5A5668', blurb: 'Plan projects, clients and goals like a pro.' },
  'habit-trackers':     { icon: CheckCircle,     accent: '#B8A9D4', blurb: 'Build routines that stick — 21 & 66-day formats.' },
  'adhd-planners':      { icon: Brain,           accent: '#C9A84C', blurb: 'Low-overwhelm layouts designed for focus.' },
  'goal-trackers':      { icon: Target,          accent: '#A8B5A0', blurb: 'Turn big dreams into weekly action.' },
  'meal-planners':      { icon: Utensils,        accent: '#C9847C', blurb: 'Weekly menus, grocery lists and prep sheets.' },
  'savings-challenges': { icon: PiggyBank,       accent: '#9E7A2A', blurb: 'Fun, visual challenges to save more, faster.' },
  'notion-templates':   { icon: LayoutTemplate,  accent: '#3D3A4A', blurb: 'All-in-one digital dashboards for Notion.' },
  'planner-bundles':    { icon: Package,         accent: '#7B6FAE', blurb: 'Complete planning systems at big savings.' },
  'digital-notebooks':  { icon: Notebook,        accent: '#7B6FAE', blurb: 'Beautiful tabbed notebooks for digital note-taking.' },
}
const FALLBACK = { icon: Sparkles, accent: '#C9A84C', blurb: 'Premium planners crafted for productivity.' }

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

interface Props {
  categories:    Category[]
  counts:        Record<string, number>
  totalProducts: number
}

export default function CategoriesClient({ categories, counts, totalProducts }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
  }, [categories, query])

  const featured = filtered.filter((c) => c.is_featured).slice(0, 3)
  const rest     = filtered.filter((c) => !featured.includes(c))
  const meta = (slug: string) => CAT_META[slug] ?? FALLBACK

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative w-full pt-12 pb-16 border-b overflow-hidden bg-gradient-mesh" style={{ borderColor: 'var(--border)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 320, height: 320, top: -100, right: '6%', background: 'var(--lavender)' }} />
          <div className="absolute rounded-full blur-3xl opacity-25 animate-float-delayed" style={{ width: 240, height: 240, bottom: -80, left: '2%', background: 'var(--gold)' }} />
        </div>

        <div className="container-site relative text-center">
          <nav className="flex items-center justify-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Shop</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>Categories</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.14em' }}>The Collections</p>
            <h1 className="font-display mb-4 mx-auto" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', lineHeight: 1.05, color: 'var(--text-primary)', maxWidth: 720 }}>
              Find Your Perfect Planner
            </h1>
            <div className="divider-gold mb-5" />
            <p className="max-w-xl mx-auto text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
              From daily productivity to financial freedom — explore {categories.length} premium collections,
              each crafted in-house and delivered the instant you check out.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search collections…"
                className="input-field !pl-11 !pr-10 !py-3" aria-label="Search categories"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2" aria-label="Clear">
                  <X size={15} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mt-8">
              {[
                { icon: Layers, label: `${categories.length} Collections` },
                { icon: Zap,    label: 'Instant Download' },
                { icon: Star,   label: '4.9 Avg Rating' },
                { icon: Shield, label: 'Secure Checkout' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <Icon size={14} style={{ color: 'var(--gold)' }} /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURED COLLECTIONS ══════════════════════════════ */}
      {featured.length > 0 && (
        <section className="container-site pt-14">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Most Loved</p>
              <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Featured Collections</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map((cat, i) => {
              const m = meta(cat.slug); const Icon = m.icon; const n = counts[cat.id] ?? 0
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }}>
                  <Link href={`/shop/category/${cat.slug}`}
                    className="group relative block rounded-3xl overflow-hidden border h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-product-hover"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    {/* Cover */}
                    <div className="relative h-44 flex items-center justify-center overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${hexToRgba(m.accent, 0.22)}, ${hexToRgba(m.accent, 0.06)})` }}>
                      <div aria-hidden className="absolute rounded-full blur-2xl opacity-50 transition-transform duration-500 group-hover:scale-125" style={{ width: 130, height: 130, background: hexToRgba(m.accent, 0.5) }} />
                      <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                        style={{ background: 'var(--bg-card)', boxShadow: `0 8px 28px ${hexToRgba(m.accent, 0.3)}` }}>
                        <Icon size={34} style={{ color: m.accent }} />
                      </div>
                      <span className="absolute top-4 right-4 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                        {n > 0 ? `${n} ${n === 1 ? 'design' : 'designs'}` : 'New'}
                      </span>
                    </div>
                    {/* Body */}
                    <div className="p-6">
                      <h3 className="font-display text-2xl mb-2 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{cat.name}</h3>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{cat.description || m.blurb}</p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: m.accent }}>
                        Explore collection <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ══ ALL COLLECTIONS ═══════════════════════════════════ */}
      <section className="container-site py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Browse Everything</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>
              {query ? `${filtered.length} ${filtered.length === 1 ? 'Result' : 'Results'}` : 'All Collections'}
            </h2>
          </div>
          <Link href="/shop" className="btn-outline hidden sm:inline-flex !py-2.5 !px-5 text-xs">Shop All Planners <ArrowRight size={14} /></Link>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <Search size={26} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No collections found</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try a different search term.</p>
            <button className="btn-outline" onClick={() => setQuery('')}>Clear Search</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(query ? filtered : rest).map((cat, i) => {
              const m = meta(cat.slug); const Icon = m.icon; const n = counts[cat.id] ?? 0
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}>
                  <Link href={`/shop/category/${cat.slug}`}
                    className="group relative flex flex-col h-full p-5 rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                    aria-label={`Shop ${cat.name}`}>
                    {/* hover glow */}
                    <div aria-hidden className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: hexToRgba(m.accent, 0.35) }} />
                    <div className="relative flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                        style={{ background: hexToRgba(m.accent, 0.12), border: `1.5px solid ${hexToRgba(m.accent, 0.25)}` }}>
                        <Icon size={24} style={{ color: m.accent }} />
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {n > 0 ? n : 'New'}
                      </span>
                    </div>
                    <h3 className="relative font-semibold text-base mb-1.5 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{cat.name}</h3>
                    <p className="relative text-xs leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>{cat.description || m.blurb}</p>
                    <span className="relative inline-flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: m.accent }}>
                      Explore <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* ══ BENEFITS STRIP ════════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap,    title: 'Instant Delivery',  body: 'Files land in your inbox the moment you check out.' },
            { icon: Layers, title: 'Every Format',      body: 'PDF, GoodNotes, Notability & print-ready sizes.' },
            { icon: Star,   title: 'Loved Worldwide',   body: 'Rated 4.9/5 by thousands of happy planners.' },
            { icon: Shield, title: 'Secure & Trusted',  body: 'Encrypted checkout with global payment options.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.10)' }}><Icon size={18} style={{ color: 'var(--gold)' }} /></div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CLOSING CTA ═══════════════════════════════════════ */}
      <section className="border-t py-20 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Not Sure Where to Start?</p>
          <h2 className="font-display text-display-sm mb-4" style={{ color: 'var(--text-primary)' }}>Browse Every Planner in One Place</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Explore our full catalogue of {totalProducts > 0 ? `${totalProducts}+ ` : ''}premium digital and printable planners — filter by format, price and rating to find your perfect match.
          </p>
          <Link href="/shop" className="btn-primary">Shop All Planners <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  )
}
