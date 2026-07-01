'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Search, X, SlidersHorizontal, Grid3X3, Grid2X2, List as ListIcon, ChevronDown, ChevronRight,
  ShoppingCart, Heart, Eye, Check, Star, Plus, Clock, Layers, Crown, Sparkles, BookOpen,
} from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import QuickViewModal from '@/components/shop/QuickViewModal'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types/database'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
const PER_PAGE = 16
const FORMAT_OPTIONS = ['PDF', 'GoodNotes', 'Notability', 'Xodo']
const SIZE_KEYS: { k: string; l: string }[] = [{ k: 'a4', l: 'A4' }, { k: 'us_letter', l: 'US Letter' }, { k: 'a5', l: 'A5' }]
const PRICE_BUCKETS = [
  { v: 'under-10', l: 'Under $10', test: (p: Product) => p.price < 10 },
  { v: '10-20', l: '$10 – $20', test: (p: Product) => p.price >= 10 && p.price <= 20 },
  { v: 'over-20', l: 'Over $20', test: (p: Product) => p.price > 20 },
]
const RATING_OPTS = [{ v: 0, l: 'Any' }, { v: 4, l: '4★ & up' }, { v: 4.5, l: '4.5★ & up' }]
const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Most popular' },
  { value: 'rating',     label: 'Highest rated' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

const sizesOf = (p: Product) => SIZE_KEYS.filter(({ k }) => (p.planner_files as any)?.[k]).map(({ l }) => l)
const money = (n: number, c?: string | null) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}</span>
}

interface Props { products: Product[]; categories: Category[]; featured: Product[] }

export default function ShopClient({ products, categories, featured }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [formats, setFormats]   = useState<string[]>([])
  const [sizes, setSizes]       = useState<string[]>([])
  const [price, setPrice]       = useState<string | null>(null)
  const [minRating, setMinRating] = useState(0)
  const [onlyNew, setOnlyNew]   = useState(false)
  const [onlyBest, setOnlyBest] = useState(false)
  const [sort, setSort]         = useState('featured')
  const [view, setView]         = useState<'grid' | 'list'>('grid')
  const [cols, setCols]         = useState<3 | 4>(4)
  const [visible, setVisible]   = useState(PER_PAGE)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [mounted, setMounted]   = useState(false)

  const hydrated = useRef(false)

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 200); return () => clearTimeout(t) }, [searchInput])
  useEffect(() => {
    setMounted(true)
    try { const raw = localStorage.getItem('arwign-recently-viewed'); if (raw) setRecentIds(JSON.parse(raw)) } catch {}
  }, [])

  // ── Shareable state: read filters/sort/search/view from the URL ──
  useEffect(() => {
    const apply = () => {
      const sp = new URLSearchParams(window.location.search)
      setCategory(sp.get('category'))
      setFormats(sp.get('format')?.split(',').filter(Boolean) ?? [])
      setSizes(sp.get('size')?.split(',').filter(Boolean) ?? [])
      setPrice(sp.get('price'))
      setMinRating(Number(sp.get('rating') ?? 0) || 0)
      setOnlyNew(sp.get('new') === '1')
      setOnlyBest(sp.get('best') === '1')
      setSort(sp.get('sort') ?? 'featured')
      setView(sp.get('view') === 'list' ? 'list' : 'grid')
      const q = sp.get('q') ?? ''
      setSearchInput(q); setSearch(q)
      hydrated.current = true
    }
    apply()
    window.addEventListener('popstate', apply)
    return () => window.removeEventListener('popstate', apply)
  }, [])

  // ── …and reflect current state back into the URL (no reload) ──
  useEffect(() => {
    if (!hydrated.current) return
    const sp = new URLSearchParams()
    if (search) sp.set('q', search)
    if (category) sp.set('category', category)
    if (formats.length) sp.set('format', formats.join(','))
    if (sizes.length) sp.set('size', sizes.join(','))
    if (price) sp.set('price', price)
    if (minRating) sp.set('rating', String(minRating))
    if (onlyNew) sp.set('new', '1')
    if (onlyBest) sp.set('best', '1')
    if (sort !== 'featured') sp.set('sort', sort)
    if (view === 'list') sp.set('view', 'list')
    const qs = sp.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [search, category, formats, sizes, price, minRating, onlyNew, onlyBest, sort, view])

  const allFormats = useMemo(() => { const s = new Set<string>(); products.forEach((p) => (p.file_formats ?? []).forEach((f) => s.add(f))); return FORMAT_OPTIONS.filter((f) => s.has(f)) }, [products])
  const allSizes   = useMemo(() => { const s = new Set<string>(); products.forEach((p) => sizesOf(p).forEach((l) => s.add(l))); return SIZE_KEYS.map(({ l }) => l).filter((l) => s.has(l)) }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products.filter((p) => {
      if (q && !`${p.title} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase().includes(q)) return false
      if (category && (p.category as any)?.slug !== category) return false
      if (formats.length && !formats.some((f) => (p.file_formats ?? []).includes(f))) return false
      if (sizes.length && !sizes.some((s) => sizesOf(p).includes(s))) return false
      if (price && !PRICE_BUCKETS.find((b) => b.v === price)?.test(p)) return false
      if (minRating && p.rating_avg < minRating) return false
      if (onlyNew && !p.is_new) return false
      if (onlyBest && !p.is_bestseller) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':    return (b.download_count ?? 0) - (a.download_count ?? 0)
        case 'rating':     return b.rating_avg - a.rating_avg
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
        default:           return (Number(b.is_featured) - Number(a.is_featured)) || (b.download_count ?? 0) - (a.download_count ?? 0)
      }
    })
    return list
  }, [products, search, category, formats, sizes, price, minRating, onlyNew, onlyBest, sort])

  useEffect(() => { setVisible(PER_PAGE) }, [search, category, formats, sizes, price, minRating, onlyNew, onlyBest, sort])

  const activeCount = (category ? 1 : 0) + formats.length + sizes.length + (price ? 1 : 0) + (minRating ? 1 : 0) + (onlyNew ? 1 : 0) + (onlyBest ? 1 : 0) + (search ? 1 : 0)
  const hasFilters = activeCount > 0
  const visibleList = filtered.slice(0, visible)
  const recent = useMemo(() => recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 6) as Product[], [recentIds, products])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const clearAll = () => { setSearchInput(''); setSearch(''); setCategory(null); setFormats([]); setSizes([]); setPrice(null); setMinRating(0); setOnlyNew(false); setOnlyBest(false) }

  const openQuickView = (p: Product) => {
    setQuickView(p)
    setRecentIds((prev) => { const next = [p.id, ...prev.filter((x) => x !== p.id)].slice(0, 12); try { localStorage.setItem('arwign-recently-viewed', JSON.stringify(next)) } catch {}; return next })
  }

  const filterPanel = (
    <FilterPanel
      categories={categories} allFormats={allFormats} allSizes={allSizes}
      category={category} formats={formats} sizes={sizes} price={price} minRating={minRating} onlyNew={onlyNew} onlyBest={onlyBest}
      setCategory={setCategory} setFormats={setFormats} setSizes={setSizes} setPrice={setPrice} setMinRating={setMinRating} setOnlyNew={setOnlyNew} setOnlyBest={setOnlyBest}
      toggle={toggle} activeCount={activeCount} clearAll={clearAll}
    />
  )

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <section className="border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(var(--gold-rgb),0.10) 0%, rgba(184,169,212,0.08) 60%, var(--bg-primary) 100%)' }}>
        <div className="container-site py-10">
          <nav className="flex items-center gap-1.5 mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>Shop</span>
          </nav>
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>The Collection</p>
          <h1 className="font-display mb-3" style={{ fontSize: 'clamp(2.2rem,4.5vw,3.4rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>Shop all planners</h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--text-secondary)' }}>Premium digital &amp; printable planners, trackers and notebooks — instant download, ready for GoodNotes, Notability or print.</p>
          {/* notebook cross-links */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/notebooks/general" className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors hover:border-gold" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><BookOpen size={13} style={{ color: 'var(--gold)' }} /> Digital Notebooks</Link>
            <Link href="/notebooks/personalized" className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors hover:border-gold" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><Sparkles size={13} style={{ color: 'var(--gold)' }} /> Personalise yours</Link>
          </div>
        </div>
      </section>

      {/* ══ FEATURED STRIP (merchandising) ════════════════════ */}
      {!hasFilters && featured.length >= 4 && (
        <section className="border-b py-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <div className="flex items-center gap-2 mb-4"><Crown size={15} style={{ color: 'var(--gold)' }} /><h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Bestsellers</h2></div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {featured.map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="flex-shrink-0 w-36 group">
                  <div className="relative rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '3/4', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill loading="lazy" sizes="144px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}><Crown size={8} /> BEST</span>
                  </div>
                  <p className="text-xs font-semibold line-clamp-2 group-hover:text-gold transition-colors" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                  <p className="text-xs mt-0.5 font-bold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ TOOLBAR (sticky) ══════════════════════════════════ */}
      <div className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}>
        <div className="container-site flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--gold)' }}>{activeCount}</span>}
          </button>
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search planners, trackers…" className="input-field !py-2 !pl-10 !pr-9 text-sm" aria-label="Search products" />
            {searchInput && <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>
          <div className="flex-1 hidden lg:block" />
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field !py-2 !pr-9 cursor-pointer text-sm appearance-none" style={{ width: 'auto', minWidth: 150 }} aria-label="Sort">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setView('list')} className="p-2 rounded-lg transition-all" style={{ background: view === 'list' ? 'var(--gold)' : 'transparent', color: view === 'list' ? '#fff' : 'var(--text-muted)' }} aria-label="List view"><ListIcon size={15} /></button>
            <button onClick={() => { setView('grid'); setCols(3) }} className="p-2 rounded-lg transition-all" style={{ background: view === 'grid' && cols === 3 ? 'var(--gold)' : 'transparent', color: view === 'grid' && cols === 3 ? '#fff' : 'var(--text-muted)' }} aria-label="3 columns"><Grid2X2 size={15} /></button>
            <button onClick={() => { setView('grid'); setCols(4) }} className="p-2 rounded-lg transition-all" style={{ background: view === 'grid' && cols === 4 ? 'var(--gold)' : 'transparent', color: view === 'grid' && cols === 4 ? '#fff' : 'var(--text-muted)' }} aria-label="4 columns"><Grid3X3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════ */}
      <div className="container-site py-8 flex gap-8 items-start">
        {/* Desktop sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-[150px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Hide</button>
            </div>
            {filterPanel}
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {/* count + reopen sidebar + chips */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}><SlidersHorizontal size={13} /> Filters{activeCount > 0 ? ` (${activeCount})` : ''}</button>}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Showing <b style={{ color: 'var(--text-primary)' }}>{Math.min(visible, filtered.length)}</b> of <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> {filtered.length === 1 ? 'planner' : 'planners'}</p>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {search && <Chip label={`“${search}”`} onClear={() => { setSearchInput(''); setSearch('') }} />}
              {category && <Chip label={categories.find((c) => c.slug === category)?.name ?? category} onClear={() => setCategory(null)} />}
              {formats.map((f) => <Chip key={f} label={f} onClear={() => toggle(formats, setFormats, f)} />)}
              {sizes.map((s) => <Chip key={s} label={s} onClear={() => toggle(sizes, setSizes, s)} />)}
              {price && <Chip label={PRICE_BUCKETS.find((b) => b.v === price)?.l ?? price} onClear={() => setPrice(null)} />}
              {minRating > 0 && <Chip label={`${minRating}★ & up`} onClear={() => setMinRating(0)} />}
              {onlyNew && <Chip label="New" onClear={() => setOnlyNew(false)} />}
              {onlyBest && <Chip label="Bestseller" onClear={() => setOnlyBest(false)} />}
              <button onClick={clearAll} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Clear all</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <Search size={30} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No planners found</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try a different search or clear your filters.</p>
              <button className="btn-outline" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : view === 'list' ? (
            <div className="flex flex-col gap-4">
              {visibleList.map((p, i) => <ShopRow key={p.id} p={p} index={i} onQuickView={() => openQuickView(p)} />)}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className={`grid gap-5 ${cols === 4 ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                {visibleList.map((p, i) => <ShopCard key={p.id} p={p} index={i} onQuickView={() => openQuickView(p)} />)}
              </motion.div>
            </AnimatePresence>
          )}

          {visible < filtered.length && (
            <div className="flex flex-col items-center gap-3 mt-12">
              <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${(Math.min(visible, filtered.length) / filtered.length) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
              </div>
              <button onClick={() => setVisible((v) => v + PER_PAGE)} className="btn-outline px-8">Load more <Plus size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* ══ RECENTLY VIEWED ═══════════════════════════════════ */}
      {mounted && recent.length > 0 && (
        <section className="border-t py-12" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <div className="flex items-center gap-2 mb-6"><Clock size={16} style={{ color: 'var(--gold)' }} /><h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Recently viewed</h2></div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {recent.map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="flex-shrink-0 w-36 group">
                  <div className="relative rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '3/4', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill loading="lazy" sizes="144px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <p className="text-xs font-semibold line-clamp-2 group-hover:text-gold transition-colors" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{money(p.price, p.currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ MOBILE FILTER DRAWER ══════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(44,42,53,0.5)', backdropFilter: 'blur(3px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.div className="fixed top-0 left-0 h-full w-[86vw] max-w-sm z-50 lg:hidden overflow-y-auto p-6" style={{ background: 'var(--bg-card)' }} initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.35 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Filters</h2>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><X size={16} /></button>
              </div>
              {filterPanel}
              <button onClick={() => setDrawerOpen(false)} className="btn-primary w-full justify-center mt-6">Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80" style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)' }}>{label} <X size={10} /></button>
}

function FHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{children}</p>
}

interface FPProps {
  categories: Category[]; allFormats: string[]; allSizes: string[]
  category: string | null; formats: string[]; sizes: string[]; price: string | null; minRating: number; onlyNew: boolean; onlyBest: boolean
  setCategory: (v: string | null) => void; setFormats: (v: string[]) => void; setSizes: (v: string[]) => void; setPrice: (v: string | null) => void; setMinRating: (v: number) => void; setOnlyNew: (v: boolean) => void; setOnlyBest: (v: boolean) => void
  toggle: (arr: string[], set: (v: string[]) => void, v: string) => void; activeCount: number; clearAll: () => void
}
function FilterPanel(p: FPProps) {
  return (
    <div className="flex flex-col gap-7">
      {/* toggles */}
      <div className="flex flex-col gap-1">
        {[{ label: 'New arrivals', on: p.onlyNew, set: p.setOnlyNew }, { label: 'Bestsellers', on: p.onlyBest, set: p.setOnlyBest }].map((t) => (
          <button key={t.label} onClick={() => t.set(!t.on)} className="flex items-center justify-between py-1.5">
            <span className="text-sm font-medium" style={{ color: t.on ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.label}</span>
            <span className={`switch ${t.on ? 'on' : ''}`}><span className="knob" /></span>
          </button>
        ))}
      </div>

      {p.categories.length > 0 && (
        <div>
          <FHeading>Category</FHeading>
          <div className="flex flex-col gap-1">
            <RadioRow label="All categories" on={!p.category} onClick={() => p.setCategory(null)} />
            {p.categories.map((c) => <RadioRow key={c.slug} label={c.name} on={p.category === c.slug} onClick={() => p.setCategory(c.slug)} />)}
          </div>
        </div>
      )}

      {p.allFormats.length > 0 && (
        <div>
          <FHeading>Format</FHeading>
          <div className="flex flex-col">
            {p.allFormats.map((f) => { const on = p.formats.includes(f); return (
              <button key={f} onClick={() => p.toggle(p.formats, p.setFormats, f)} className={`filter-check ${on ? 'on' : ''}`}><span className="box">{on && <Check size={12} color="white" strokeWidth={3} />}</span>{f}</button>
            )})}
          </div>
        </div>
      )}

      {p.allSizes.length > 0 && (
        <div>
          <FHeading>Size</FHeading>
          <div className="flex flex-wrap gap-2">
            {p.allSizes.map((s) => { const on = p.sizes.includes(s); return (
              <button key={s} onClick={() => p.toggle(p.sizes, p.setSizes, s)} className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all" style={{ background: on ? 'rgba(var(--gold-rgb),0.14)' : 'transparent', borderColor: on ? 'rgba(var(--gold-rgb),0.4)' : 'var(--border)', color: on ? 'var(--gold-dark)' : 'var(--text-secondary)' }}>{s}</button>
            )})}
          </div>
        </div>
      )}

      <div>
        <FHeading>Price</FHeading>
        <div className="flex flex-col gap-1">
          <RadioRow label="Any price" on={!p.price} onClick={() => p.setPrice(null)} />
          {PRICE_BUCKETS.map((b) => <RadioRow key={b.v} label={b.l} on={p.price === b.v} onClick={() => p.setPrice(p.price === b.v ? null : b.v)} />)}
        </div>
      </div>

      <div>
        <FHeading>Rating</FHeading>
        <div className="flex flex-col gap-1">
          {RATING_OPTS.map((r) => (
            <button key={r.v} onClick={() => p.setMinRating(r.v)} className="flex items-center gap-2 py-1.5">
              <span className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0" style={{ borderColor: p.minRating === r.v ? 'var(--gold)' : 'var(--border)' }}>{p.minRating === r.v && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />}</span>
              {r.v > 0 && <Stars value={r.v} size={12} />}<span className="text-sm" style={{ color: p.minRating === r.v ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.v === 0 ? r.l : '& up'}</span>
            </button>
          ))}
        </div>
      </div>

      {p.activeCount > 0 && <button onClick={p.clearAll} className="btn-ghost justify-center w-full !py-2 text-xs" style={{ border: '1px solid var(--border)' }}>Clear all filters</button>}
    </div>
  )
}

function RadioRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 py-1.5 text-left">
      <span className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0" style={{ borderColor: on ? 'var(--gold)' : 'var(--border)' }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />}</span>
      <span className="text-sm" style={{ color: on ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: on ? 600 : 400 }}>{label}</span>
    </button>
  )
}

function useCard(p: Product) {
  const addItem    = useCartStore((s) => s.addItem)
  const inCart     = useCartStore((s) => s.hasItem(p.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(p.id))
  const add = (e: React.MouseEvent) => { e.preventDefault(); if (inCart) return; addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug }); toast.success('Added to cart ✦') }
  const wish = (e: React.MouseEvent) => { e.preventDefault(); toggleWish(p.id); toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' }) }
  return { add, wish, inCart, isWished }
}

function Badges({ p }: { p: Product }) {
  const sale = p.compare_price && p.compare_price > p.price
  const off = sale ? Math.round((1 - p.price / p.compare_price!) * 100) : 0
  return (
    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
      {p.is_new && <span className="badge badge-new">New</span>}
      {p.is_bestseller && <span className="badge badge-popular">Bestseller</span>}
      {sale && <span className="badge badge-sale">-{off}%</span>}
    </div>
  )
}

function Tags({ p }: { p: Product }) {
  const psizes = sizesOf(p)
  if (!psizes.length && !(p.file_formats?.length)) return null
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {psizes.slice(0, 3).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><Layers size={8} />{s}</span>)}
      {(p.file_formats ?? []).slice(0, 2).map((f) => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{f}</span>)}
    </div>
  )
}

function ShopCard({ p, index, onQuickView }: { p: Product; index: number; onQuickView: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const reduce = useReducedMotion()
  const { add, wish, inCart, isWished } = useCard(p)
  const sale = p.compare_price && p.compare_price > p.price
  return (
    <motion.div layout initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : Math.min(index * 0.03, 0.25) }} className="group">
      <div className="rounded-xl overflow-hidden tile-hover h-full flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <Badges p={p} />
          <Link href={`/shop/${p.slug}`} aria-label={p.title}><Image src={p.thumbnail || FALLBACK_IMG} alt={`${p.title} cover`} fill sizes="(max-width:640px) 50vw, 25vw" priority={index < 4} onLoad={() => setLoaded(true)} className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.05]`} /></Link>
          <button onClick={wish} aria-label="Toggle wishlist" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}><Heart size={14} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : '#888' }} /></button>
          <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <button onClick={(e) => { e.preventDefault(); onQuickView() }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--charcoal)' }}><Eye size={13} /> Quick view</button>
            <button onClick={add} disabled={inCart} aria-label="Add to cart" className="w-10 flex items-center justify-center py-2 rounded-full disabled:opacity-60" style={{ background: 'var(--gold)', color: 'white' }}>{inCart ? <Check size={14} /> : <ShoppingCart size={14} />}</button>
          </div>
        </div>
        <div className="px-3.5 pt-3 pb-4 flex flex-col flex-1">
          {p.category && <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{(p.category as any).name}</p>}
          <Link href={`/shop/${p.slug}`}><h3 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-gold mb-1.5" style={{ color: 'var(--text-primary)' }}>{p.title}</h3></Link>
          <div className="flex items-center gap-1.5 mb-2"><Stars value={p.rating_avg || 5} size={11} />{p.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({p.rating_count})</span>}</div>
          <Tags p={p} />
          <div className="flex items-baseline gap-1.5 mt-auto"><span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</span>{sale && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{money(p.compare_price!, p.currency)}</span>}</div>
        </div>
      </div>
    </motion.div>
  )
}

function ShopRow({ p, index, onQuickView }: { p: Product; index: number; onQuickView: () => void }) {
  const reduce = useReducedMotion()
  const { add, wish, inCart, isWished } = useCard(p)
  const sale = p.compare_price && p.compare_price > p.price
  return (
    <motion.div layout initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : Math.min(index * 0.03, 0.2) }} className="flex gap-4 p-3 rounded-2xl border tile-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <Link href={`/shop/${p.slug}`} className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 128, aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
        <Badges p={p} />
        <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill loading="lazy" sizes="128px" className="object-cover" />
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {p.category && <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{(p.category as any).name}</p>}
            <Link href={`/shop/${p.slug}`}><h3 className="text-base font-semibold leading-snug hover:text-gold transition-colors line-clamp-1" style={{ color: 'var(--text-primary)' }}>{p.title}</h3></Link>
          </div>
          <button onClick={wish} aria-label="Wishlist" className="flex-shrink-0"><Heart size={16} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : 'var(--text-muted)' }} /></button>
        </div>
        <div className="flex items-center gap-1.5 mt-1"><Stars value={p.rating_avg || 5} size={12} />{p.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({p.rating_count})</span>}</div>
        {p.description && <p className="text-xs mt-1.5 line-clamp-2 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>}
        <div className="mt-2"><Tags p={p} /></div>
        <div className="flex items-center gap-3 mt-auto pt-2">
          <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</span>
          {sale && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{money(p.compare_price!, p.currency)}</span>}
          <div className="flex-1" />
          <button onClick={onQuickView} className="btn-ghost !py-2 !px-3 text-xs hidden sm:inline-flex" style={{ border: '1px solid var(--border)' }}><Eye size={13} /> Quick view</button>
          <button onClick={add} disabled={inCart} className="btn-primary !py-2 !px-4 text-xs disabled:opacity-60">{inCart ? <><Check size={13} /> In cart</> : <><ShoppingCart size={13} /> Add</>}</button>
        </div>
      </div>
    </motion.div>
  )
}
