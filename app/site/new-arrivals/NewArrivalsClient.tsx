'use client'
import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Tag, ChevronRight, X } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import type { Product, Category } from '@/types/database'

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Just Dropped' },
  { value: 'popular',     label: 'Most Downloaded' },
  { value: 'rating',      label: 'Highest Rated' },
  { value: 'price-asc',   label: 'Price: Low → High' },
  { value: 'price-desc',  label: 'Price: High → Low' },
]

interface Props {
  initialProducts: Product[]
  totalCount:      number
  categories:      Category[]
  currentPage:     number
  searchParams:    { sort?: string; category?: string; page?: string }
  latestDate:      string | null
}

export default function NewArrivalsClient({
  initialProducts, totalCount, categories, currentPage, searchParams, latestDate,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const updateParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }, [params, pathname, router])

  const totalPages = Math.ceil(totalCount / 24)

  const formattedDate = latestDate
    ? new Date(latestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="w-full pt-10 pb-14 border-b"
        style={{
          background: 'linear-gradient(135deg, rgba(184,169,212,0.16) 0%, rgba(224,168,44,0.10) 60%, rgba(184,169,212,0.06) 100%)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="container-site">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>New Arrivals</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5"
                style={{ background: 'rgba(184,169,212,0.18)', borderColor: 'rgba(184,169,212,0.45)' }}
              >
                <Sparkles size={14} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
                  Fresh Drop
                </span>
              </div>

              <h1
                className="font-display mb-4"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.75rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}
              >
                New{' '}
                <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Arrivals</em>
              </h1>
              <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
                The freshest additions to the Arwign collection. New designs, new formats, new ways to stay organised — every one an instant download ready for GoodNotes, Notability, or print.
              </p>
              {formattedDate && (
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Latest drop: <span style={{ color: 'var(--gold-dark)' }}>{formattedDate}</span>
                </p>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex gap-8 flex-shrink-0"
            >
              {[
                { icon: Sparkles, value: `${totalCount}`,  label: 'New Arrivals' },
                { icon: Tag,      value: 'Instant',        label: 'Download' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center">
                  <div className="flex items-center justify-center mb-1" style={{ color: 'var(--gold)' }}>
                    <Icon size={16} />
                  </div>
                  <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Social proof bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 mt-8"
          >
            {['✦ Instant PDF download', '◆ GoodNotes & Notability ready', '❋ Undated — start any time', '⭐ 30-day money-back guarantee'].map((item) => (
              <span
                key={item}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Filter + Sort Toolbar ─────────────────────────────── */}
      <div
        className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="container-site">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide hidden sm:block" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Category
              </span>
              <button
                className={`category-pill ${!searchParams.category ? 'active' : ''}`}
                onClick={() => updateParam('category', null)}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  className={`category-pill ${searchParams.category === cat.slug ? 'active' : ''}`}
                  onClick={() => updateParam('category', searchParams.category === cat.slug ? null : cat.slug)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Sort */}
            <select
              value={searchParams.sort ?? 'newest'}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="input-field py-2 cursor-pointer text-sm"
              style={{ width: 'auto', minWidth: 170 }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Active category chip */}
          {searchParams.category && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filtered by:</span>
              <button
                onClick={() => updateParam('category', null)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{ background: 'rgba(184,169,212,0.15)', borderColor: 'rgba(184,169,212,0.4)', color: 'var(--text-primary)' }}
              >
                {categories.find((c) => c.slug === searchParams.category)?.name}
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Product Grid ──────────────────────────────────────── */}
      <div className="container-site py-10">
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          {totalCount} new {totalCount === 1 ? 'arrival' : 'arrivals'}
          {searchParams.category && ` in ${categories.find((c) => c.slug === searchParams.category)?.name}`}
        </p>

        {initialProducts.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <Sparkles size={36} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Nothing new yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>New designs drop regularly — check back soon or browse the full shop.</p>
            <Link href="/shop" className="btn-primary">Browse All Planners</Link>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${searchParams.category}-${searchParams.sort}-${currentPage}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
              >
                {initialProducts.map((product, i) => (
                  <div key={product.id} className="relative">
                    {/* "New" badge on the first card */}
                    {i === 0 && !searchParams.category && (
                      <div
                        className="absolute -top-2 -left-2 z-10 px-2.5 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-gold gap-1"
                        style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)' }}
                      >
                        <Sparkles size={9} />
                        NEW
                      </div>
                    )}
                    <ProductCard product={product} index={i} priority={i < 4} />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-14">
                {currentPage > 1 && (
                  <button onClick={() => updateParam('page', String(currentPage - 1))} className="btn-outline px-6">
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
                  <button onClick={() => updateParam('page', String(currentPage + 1))} className="btn-primary px-6">
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Why Shop New Arrivals ─────────────────────────────── */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <div className="text-center mb-10">
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              Why Shop New Arrivals First
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Every new design is crafted with the latest planning trends in mind — fresher layouts, smarter sections, and styles you won't find in last season's collection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { emoji: '✨', title: 'Fresh Designs',     body: 'New layouts and aesthetics dropping regularly, designed for how you plan today.' },
              { emoji: '⚡', title: 'Instant Download',  body: 'Every new arrival is a digital file — buy now, start planning in under 60 seconds.' },
              { emoji: '📐', title: 'Built to Evolve',  body: 'New arrivals reflect customer feedback from our existing collection — smarter, not just newer.' },
            ].map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center p-6 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="text-3xl mb-3">{item.emoji}</div>
                <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="border-t py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Looking for our most loved picks? Check the best sellers.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/shop" className="btn-primary">Shop All Planners</Link>
            <Link href="/best-sellers" className="btn-outline">Best Sellers</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
