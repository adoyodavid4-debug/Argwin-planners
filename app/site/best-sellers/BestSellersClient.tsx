'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Star, Download, Award, Crown, ChevronRight, ChevronDown, Search, X,
  Grid3X3, Grid2X2, ShoppingCart, Check, Shield, Zap, RefreshCcw, Quote, BadgeCheck,
  Flame, ArrowRight, Heart, Smartphone, CreditCard, Plus,
} from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import { useCartStore, useWishlistStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types/database'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
const PER_PAGE = 12
const price$ = (n: number) => `$${n.toFixed(2)}`
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Downloaded' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]
const RATING_OPTS = [{ v: 0, l: 'Any' }, { v: 4, l: '4★+' }, { v: 4.5, l: '4.5★+' }]
const PRICE_OPTS = [{ v: 'under-10', l: 'Under $10' }, { v: '10-20', l: '$10–$20' }, { v: 'over-20', l: 'Over $20' }]
const MEDALS = ['#E0A82C', '#AEB6BF', '#CD7F4E'] // gold / silver / bronze

interface Props {
  products:       Product[]
  categories:     Category[]
  totalDownloads: number
  totalReviews:   number
  avgRating:      number
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 1000
    const tick = (t: number) => { const p = Math.min(1, (t - start) / dur); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{compact(n)}{suffix}</>
}

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.6}
          style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />
      ))}
    </div>
  )
}

// ── Podium card for the top 3 ─────────────────────────────────
function PodiumCard({ p, rank }: { p: Product; rank: number }) {
  const addItem    = useCartStore((s) => s.addItem)
  const inCart     = useCartStore((s) => s.hasItem(p.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(p.id))
  const medal = MEDALS[rank - 1]
  const featured = rank === 1
  const weekly = Math.max(12, Math.round((p.download_count ?? 240) / 14)) // deterministic "this week"
  const add = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) return
    addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug })
    toast.success(`"${p.title}" added to cart ✦`)
  }
  const wish = (e: React.MouseEvent) => { e.preventDefault(); toggleWish(p.id); toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' }) }
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5, delay: (rank - 1) * 0.1 }}
      className={`relative ${featured ? 'lg:-mt-6' : ''}`}>
      <div className="relative rounded-3xl border overflow-hidden h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-product-hover"
        style={{ background: 'var(--bg-card)', borderColor: featured ? medal : 'var(--border)', boxShadow: featured ? `0 0 0 1px ${medal}, 0 18px 50px rgba(224,168,44,0.18)` : undefined }}>
        {/* rank ribbon */}
        <div className="absolute top-0 left-0 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-br-2xl text-xs font-bold text-white" style={{ background: medal }}>
          {featured ? <Crown size={13} /> : <Award size={13} />} #{rank}
        </div>
        {/* wishlist */}
        <button onClick={wish} aria-label="Wishlist" className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
          <Heart size={15} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : '#888' }} />
        </button>
        <Link href={`/shop/${p.slug}`} className="block relative overflow-hidden group" style={{ aspectRatio: featured ? '4/3' : '3/2', background: 'var(--bg-secondary)' }}>
          <Image src={p.thumbnail || FALLBACK_IMG} alt={p.title} fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" priority={featured} />
          {/* hot this week */}
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            <Flame size={11} style={{ color: 'var(--gold-light)' }} /> {weekly} bought this week
          </span>
        </Link>
        <div className="p-5">
          {p.category && <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{(p.category as any).name}</p>}
          <Link href={`/shop/${p.slug}`}><h3 className={`font-display ${featured ? 'text-2xl' : 'text-xl'} mb-2 leading-tight transition-colors hover:text-gold`} style={{ color: 'var(--text-primary)' }}>{p.title}</h3></Link>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Stars value={p.rating_avg || 5} size={13} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(p.rating_avg || 5).toFixed(1)}</span></span>
            {(p.download_count ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Download size={12} /> {compact(p.download_count)}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{price$(p.price)}</span>
              {p.compare_price && p.compare_price > p.price && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{price$(p.compare_price)}</span>}
            </div>
            <button onClick={add} disabled={inCart} className="btn-primary !py-2 !px-4 text-xs disabled:opacity-60">
              {inCart ? <><Check size={13} /> In Cart</> : <><ShoppingCart size={13} /> Add</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
      style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)' }}>
      {label} <X size={10} />
    </button>
  )
}

export default function BestSellersClient({ products, categories, totalDownloads, totalReviews, avgRating }: Props) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [minRating, setMinRating] = useState(0)
  const [price, setPrice]       = useState<string | null>(null)
  const [formats, setFormats]   = useState<string[]>([])
  const [sort, setSort]         = useState('popular')
  const [cols, setCols]         = useState<3 | 4>(4)
  const [visible, setVisible]   = useState(PER_PAGE)
  const addItem = useCartStore((s) => s.addItem)

  // rank map by downloads (overall, stable)
  const rankMap = useMemo(() => {
    const m: Record<string, number> = {}
    ;[...products].sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0)).forEach((p, i) => { m[p.id] = i + 1 })
    return m
  }, [products])

  const allFormats = useMemo(() => {
    const s = new Set<string>(); products.forEach((p) => (p.file_formats ?? []).forEach((f) => s.add(f))); return Array.from(s).sort()
  }, [products])

  const hasFilters = !!(search || category || minRating || price || formats.length || sort !== 'popular')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products.filter((p) => {
      if (q && !`${p.title} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase().includes(q)) return false
      if (category && (p.category as any)?.slug !== category) return false
      if (minRating && p.rating_avg < minRating) return false
      if (price === 'under-10' && !(p.price < 10)) return false
      if (price === '10-20' && !(p.price >= 10 && p.price <= 20)) return false
      if (price === 'over-20' && !(p.price > 20)) return false
      if (formats.length && !formats.some((f) => (p.file_formats ?? []).includes(f))) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'rating':     return b.rating_avg - a.rating_avg
        case 'newest':     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
        default:           return (b.download_count ?? 0) - (a.download_count ?? 0)
      }
    })
    return list
  }, [products, search, category, minRating, price, formats, sort])

  useEffect(() => { setVisible(PER_PAGE) }, [search, category, minRating, price, formats, sort])

  const podium = !hasFilters ? products.slice(0, 3) : []
  const podiumIds = new Set(podium.map((p) => p.id))
  const gridList = hasFilters ? filtered : filtered.filter((p) => !podiumIds.has(p.id))
  const visibleList = gridList.slice(0, visible)

  const toggleFormat = (f: string) => setFormats((arr) => arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f])
  const clearAll = () => { setSearch(''); setCategory(null); setMinRating(0); setPrice(null); setFormats([]); setSort('popular') }

  const addTop3 = () => {
    const top3 = products.slice(0, 3)
    top3.forEach((p) => addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug }))
    toast.success('Top 3 added to cart ✦')
  }
  const top3Total = products.slice(0, 3).reduce((s, p) => s + p.price, 0)

  const stats = [
    { icon: Download, value: <CountUp to={totalDownloads || products.length * 1200} suffix="+" />, label: 'Downloads' },
    { icon: Star,     value: <span className="inline-flex items-center gap-1"><Star size={20} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />{avgRating.toFixed(1)}</span>, label: 'Avg Rating' },
    { icon: Award,    value: <CountUp to={products.length} />, label: 'Best Sellers' },
    { icon: Heart,    value: <CountUp to={totalReviews || products.length * 60} suffix="+" />, label: 'Happy Reviews' },
  ]

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative w-full pt-10 pb-14 border-b overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(var(--gold-rgb),0.16) 0%, rgba(184,169,212,0.12) 60%, rgba(var(--gold-rgb),0.06) 100%)', borderColor: 'var(--border)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 300, height: 300, top: -90, right: '8%', background: 'var(--gold)' }} />
        </div>
        <div className="container-site relative">
          <nav className="flex items-center gap-1.5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>Best Sellers</span>
          </nav>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)' }}>
                <TrendingUp size={14} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>Customer Favourites</span>
              </div>
              <h1 className="font-display mb-4" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.75rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>
                Our Best Selling <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Planners</em>
              </h1>
              <p className="leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                Top rated. Most downloaded. Loved by thousands.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 flex-shrink-0">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center px-4 py-3 rounded-2xl border min-w-[96px]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-center mb-1" style={{ color: 'var(--gold)' }}><Icon size={15} /></div>
                  <p className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="flex flex-wrap items-center gap-2.5 mt-8">
            {[{ icon: Star, l: '4.9/5 rated' }, { icon: Zap, l: 'Instant download' }, { icon: Smartphone, l: 'GoodNotes ready' }, { icon: Shield, l: '30-day guarantee' }].map(({ icon: Icon, l }) => (
              <span key={l} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Icon size={12} style={{ color: 'var(--gold)' }} /> {l}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TRENDING MARQUEE ══════════════════════════════════ */}
      {products.length > 0 && (
        <div className="border-b overflow-hidden py-3" style={{ borderColor: 'var(--border)', background: 'linear-gradient(90deg, rgba(var(--gold-rgb),0.10) 0%, rgba(184,169,212,0.12) 50%, rgba(var(--gold-rgb),0.10) 100%)' }}>
          <div className="marquee-track items-center" style={{ gap: '2.5rem' }}>
            {[...products, ...products].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                <Flame size={13} style={{ color: 'var(--gold)' }} /> {p.title}
                <span style={{ color: 'var(--gold)', marginLeft: '2.5rem' }}>✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══ TOP 3 PODIUM ══════════════════════════════════════ */}
      {podium.length >= 3 && (
        <section className="border-b py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <div className="text-center mb-10">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}><Crown size={14} /> Hall of Fame</p>
              <h2 className="font-display text-display-sm mb-5" style={{ color: 'var(--text-primary)' }}>The Top 3 Most Loved</h2>
              <button onClick={addTop3} className="btn-primary !py-2.5 !px-6 text-xs">
                <ShoppingCart size={14} /> Add Top 3 to Cart · {price$(top3Total)}
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-5 lg:items-start max-w-5xl mx-auto">
              {/* order: 2, 1, 3 on desktop for podium feel */}
              {[podium[1], podium[0], podium[2]].map((p, idx) => p && (
                <PodiumCard key={p.id} p={p} rank={rankMap[p.id]} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ STICKY TOOLBAR ════════════════════════════════════ */}
      <div className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}>
        <div className="container-site flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search best sellers…" className="input-field !py-2 !pl-10 !pr-9 text-sm" aria-label="Search" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>
          <div className="flex-1 hidden lg:block" />
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field !py-2 !pr-9 cursor-pointer text-sm appearance-none" style={{ width: 'auto', minWidth: 168 }} aria-label="Sort">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setCols(3)} className="p-2 rounded-lg transition-all" style={{ background: cols === 3 ? 'var(--gold)' : 'transparent', color: cols === 3 ? '#fff' : 'var(--text-muted)' }} aria-label="3 columns"><Grid2X2 size={15} /></button>
            <button onClick={() => setCols(4)} className="p-2 rounded-lg transition-all" style={{ background: cols === 4 ? 'var(--gold)' : 'transparent', color: cols === 4 ? '#fff' : 'var(--text-muted)' }} aria-label="4 columns"><Grid3X3 size={15} /></button>
          </div>
        </div>

        {/* filter row */}
        <div className="container-site flex items-center gap-2 mt-3 flex-wrap">
          {categories.length > 0 && (
            <>
              <button className={`category-pill ${!category ? 'active' : ''}`} onClick={() => setCategory(null)}>All</button>
              {categories.map((c) => (
                <button key={c.slug} className={`category-pill ${category === c.slug ? 'active' : ''}`} onClick={() => setCategory(category === c.slug ? null : c.slug)}>{c.name}</button>
              ))}
              <span className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
            </>
          )}
          {RATING_OPTS.map((r) => (
            <button key={r.v} className={`category-pill ${minRating === r.v ? 'active' : ''}`} onClick={() => setMinRating(r.v)}>{r.l}</button>
          ))}
          <span className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
          {PRICE_OPTS.map((o) => (
            <button key={o.v} className={`category-pill ${price === o.v ? 'active' : ''}`} onClick={() => setPrice(price === o.v ? null : o.v)}>{o.l}</button>
          ))}
          {allFormats.length > 0 && <span className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />}
          {allFormats.map((f) => (
            <button key={f} className={`category-pill ${formats.includes(f) ? 'active' : ''}`} onClick={() => toggleFormat(f)}>{f}</button>
          ))}
        </div>

        {hasFilters && (
          <div className="container-site flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
            {search && <Chip label={`“${search}”`} onClear={() => setSearch('')} />}
            {category && <Chip label={categories.find((c) => c.slug === category)?.name ?? category} onClear={() => setCategory(null)} />}
            {minRating > 0 && <Chip label={`${minRating}★ & up`} onClear={() => setMinRating(0)} />}
            {price && <Chip label={PRICE_OPTS.find((o) => o.v === price)?.l ?? price} onClear={() => setPrice(null)} />}
            {formats.map((f) => <Chip key={f} label={f} onClear={() => toggleFormat(f)} />)}
            {sort !== 'popular' && <Chip label={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort} onClear={() => setSort('popular')} />}
            <button onClick={clearAll} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Clear all</button>
          </div>
        )}
      </div>

      {/* ══ GRID ══════════════════════════════════════════════ */}
      <div className="container-site py-10">
        <div className="flex items-center gap-2 mb-6">
          {!hasFilters && <Flame size={15} style={{ color: 'var(--gold)' }} />}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {hasFilters
              ? <>Showing <b style={{ color: 'var(--text-primary)' }}>{Math.min(visible, gridList.length)}</b> of <b style={{ color: 'var(--text-primary)' }}>{gridList.length}</b> matching</>
              : <>The rest of the chart — <b style={{ color: 'var(--text-primary)' }}>{gridList.length}</b> more best {gridList.length === 1 ? 'seller' : 'sellers'}</>}
          </p>
        </div>

        {gridList.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <Search size={28} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Nothing matches those filters</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try clearing a filter to see more favourites.</p>
            <button className="btn-outline" onClick={clearAll}>Clear Filters</button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className={`grid gap-5 ${cols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
              {visibleList.map((p, i) => (
                <motion.div layout key={p.id} className="relative">
                  {rankMap[p.id] <= 10 && (
                    <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-gold"
                      style={{ background: rankMap[p.id] <= 3 ? `linear-gradient(135deg, ${MEDALS[rankMap[p.id] - 1]}, var(--gold-light))` : 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}>
                      #{rankMap[p.id]}
                    </div>
                  )}
                  <ProductCard product={p} index={i} priority={i < 4} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {visible < gridList.length && (
          <div className="flex flex-col items-center gap-3 mt-12">
            <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${(Math.min(visible, gridList.length) / gridList.length) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
            </div>
            <button onClick={() => setVisible((v) => v + PER_PAGE)} className="btn-outline px-8">Load More <Plus size={14} /></button>
          </div>
        )}
      </div>

      {/* ══ WHY BEST SELLERS ══════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <div className="text-center mb-10">
            <div className="divider-gold mb-6" />
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Loved for Good Reason</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Zap, title: 'Instant Download', body: 'Ready in 60 seconds.' },
              { icon: Star, title: 'Top Rated', body: '4.7★+ from real buyers.' },
              { icon: RefreshCcw, title: 'Undated', body: 'Start anytime, reuse yearly.' },
              { icon: Smartphone, title: 'Works Everywhere', body: 'GoodNotes, Notability or print.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════ */}
      <section className="border-t py-14" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3"><Stars value={avgRating || 5} size={18} /><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{avgRating.toFixed(1)} from {compact(totalReviews || products.length * 60)}+ reviews</span></div>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>What Buyers Are Saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Sophie L.', grad: 'linear-gradient(135deg,#A98FE3,#7B6FAE)', text: 'Changed how I plan my entire week. I keep recommending it to everyone at work.' },
              { name: 'Marcus T.', grad: 'linear-gradient(135deg,#E0A82C,#F6D265)', text: 'Bought three so far. The quality and detail is unmatched for the price.' },
              { name: 'Nadia K.', grad: 'linear-gradient(135deg,#F0B0A8,#C9847C)', text: 'Downloaded instantly, set up in GoodNotes in minutes. Absolutely beautiful.' },
            ].map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.1 }}
                className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <Quote size={26} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
                <Stars value={5} size={13} />
                <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: r.grad }}>{r.name.charAt(0)}</div>
                  <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p><p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified Purchase</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GUARANTEE BAND ════════════════════════════════════ */}
      <section className="border-t py-12 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.14)' }}><Shield size={28} style={{ color: 'var(--gold)' }} /></div>
          <div>
            <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Shop With Total Confidence</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Backed by our 30-day happiness promise.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:ml-auto">
            {[{ icon: Shield, l: '30-Day Promise' }, { icon: CreditCard, l: 'Secure Payment' }, { icon: Zap, l: 'Instant Access' }].map(({ icon: Icon, l }) => (
              <span key={l} className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}><Icon size={15} style={{ color: 'var(--gold)' }} /> {l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section className="border-t py-14 newsletter-gradient" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center max-w-xl mx-auto">
          <h2 className="font-display text-display-sm mb-3" style={{ color: 'var(--text-primary)' }}>Looking for Something Specific?</h2>
          <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>Browse the full collection or jump straight into a category.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/shop" className="btn-primary">Shop All Planners <ArrowRight size={15} /></Link>
            <Link href="/shop/category" className="btn-outline">Browse Categories</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
