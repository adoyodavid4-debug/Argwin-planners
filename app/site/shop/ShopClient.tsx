'use client'
import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Grid3X3, Grid2X2, Search, X, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import ProductCard from '@/components/shop/ProductCard'
import type { Product, Category } from '@/types/database'

interface Props {
  initialProducts: Product[]
  totalCount:      number
  categories:      Category[]
  currentPage:     number
  searchParams:    { category?: string; sort?: string; q?: string; page?: string }
}

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

export default function ShopClient({ initialProducts, totalCount, categories, currentPage, searchParams }: Props) {
  const router        = useRouter()
  const pathname      = usePathname()
  const params        = useSearchParams()
  const [gridCols, setGridCols] = useState<3 | 4>(4)
  const [search,   setSearch]   = useState(searchParams.q ?? '')

  const updateParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')  // reset pagination on filter change
    router.push(`${pathname}?${p.toString()}`)
  }, [params, pathname, router])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('q', search.trim() || null)
  }

  return (
    <div className="container-site py-12">
      {/* ── Page Header ──────────────────────────────── */}
      <div className="mb-10">
        <h1 className="font-display text-display-md mb-2" style={{ color: 'var(--text-primary)' }}>
          {searchParams.category
            ? categories.find((c) => c.slug === searchParams.category)?.name ?? 'Planners'
            : 'All Planners'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {totalCount} premium digital & printable planners — instant download
        </p>
      </div>

      {/* ── Digital Notebooks Banner ─────────────────── */}
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/notebooks/personalized"
          className="group relative flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:shadow-glass-md hover:-translate-y-0.5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-300"
            style={{ background: 'rgba(var(--gold-rgb),0.12)' }}
          >
            <Sparkles size={20} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Personalized Notebooks
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Custom-made digital notebooks tailored to you
            </p>
          </div>
          <span className="ml-auto text-lg transition-transform duration-200 group-hover:translate-x-1" style={{ color: 'var(--gold)' }}>→</span>
        </Link>

        <Link
          href="/notebooks/general"
          className="group relative flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 hover:shadow-glass-md hover:-translate-y-0.5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(var(--gold-rgb),0.12)' }}
          >
            <BookOpen size={20} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              General Notebooks
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Versatile digital notebooks for everyday use
            </p>
          </div>
          <span className="ml-auto text-lg transition-transform duration-200 group-hover:translate-x-1" style={{ color: 'var(--gold)' }}>→</span>
        </Link>
      </div>

      {/* ── Category Pills ────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          className={`category-pill flex-shrink-0 ${!searchParams.category ? 'active' : ''}`}
          onClick={() => updateParam('category', null)}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            className={`category-pill flex-shrink-0 ${searchParams.category === cat.slug ? 'active' : ''}`}
            onClick={() => updateParam('category', cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search planners, trackers, templates…"
            className="input-field pl-11 pr-10"
            aria-label="Search planners"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); updateParam('q', null) }} className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={searchParams.sort ?? 'popular'}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="input-field py-2.5 cursor-pointer"
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
              className={`p-2 rounded-lg transition-all ${gridCols === 4 ? 'bg-charcoal text-white' : ''}`}
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
      </div>

      {/* ── Product Grid ─────────────────────────────── */}
      {initialProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No planners found</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try a different search term or browse all categories</p>
          <button className="btn-outline" onClick={() => { setSearch(''); router.push(pathname) }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${searchParams.category}-${searchParams.sort}-${searchParams.q}-${currentPage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{  opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`grid gap-5 ${
              gridCols === 4
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-2 md:grid-cols-3'
            }`}
          >
            {initialProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} priority={i < 4} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Pagination ───────────────────────────────── */}
      {totalCount > 24 && (
        <div className="flex items-center justify-center gap-2 mt-14">
          {currentPage > 1 && (
            <button
              onClick={() => updateParam('page', String(currentPage - 1))}
              className="btn-outline px-6"
            >
              Previous
            </button>
          )}
          <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {currentPage} of {Math.ceil(totalCount / 24)}
          </span>
          {currentPage < Math.ceil(totalCount / 24) && (
            <button
              onClick={() => updateParam('page', String(currentPage + 1))}
              className="btn-primary px-6"
            >
              Next Page
            </button>
          )}
        </div>
      )}
    </div>
  )
}
