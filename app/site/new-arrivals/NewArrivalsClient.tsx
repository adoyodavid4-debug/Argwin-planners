'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ChevronRight, ChevronDown, X, ShoppingCart, Heart, Eye, Check,
  Star, Plus, ArrowRight, Zap, Shield, Smartphone, Layers,
} from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import QuickViewModal from '@/components/shop/QuickViewModal'
import toast from 'react-hot-toast'
import type { Product, Category } from '@/types/database'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
const PER_PAGE = 12
const FORMAT_OPTIONS = ['PDF', 'GoodNotes', 'Notability', 'Xodo']
const SIZE_KEYS: { k: string; l: string }[] = [{ k: 'a4', l: 'A4' }, { k: 'us_letter', l: 'US Letter' }, { k: 'a5', l: 'A5' }]
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Just Dropped' },
  { value: 'popular',    label: 'Most Downloaded' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]
const DAY = 86_400_000

export interface RelItem { id: string; title: string; slug: string; price: number | null; currency: string | null; thumbnail: string | null }

const sizesOf = (p: Product) => SIZE_KEYS.filter(({ k }) => (p.planner_files as any)?.[k]).map(({ l }) => l)
const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}
    </span>
  )
}

interface Props {
  products:   Product[]
  categories: Category[]
  related:    RelItem[]
  latestDate: string | null
}

export default function NewArrivalsClient({ products, categories, related, latestDate }: Props) {
  const [category, setCategory] = useState<string | null>(null)
  const [formats, setFormats]   = useState<string[]>([])
  const [sizes, setSizes]       = useState<string[]>([])
  const [sort, setSort]         = useState('newest')
  const [visible, setVisible]   = useState(PER_PAGE)
  const [quickView, setQuickView] = useState<Product | null>(null)

  const fmt = (n: number, c?: string | null) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

  const allFormats = useMemo(() => {
    const s = new Set<string>(); products.forEach((p) => (p.file_formats ?? []).forEach((f) => s.add(f)))
    return FORMAT_OPTIONS.filter((f) => s.has(f))
  }, [products])
  const allSizes = useMemo(() => {
    const s = new Set<string>(); products.forEach((p) => sizesOf(p).forEach((l) => s.add(l)))
    return SIZE_KEYS.map(({ l }) => l).filter((l) => s.has(l))
  }, [products])

  const hasFilters = !!(category || formats.length || sizes.length || sort !== 'newest')

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category && (p.category as any)?.slug !== category) return false
      if (formats.length && !formats.some((f) => (p.file_formats ?? []).includes(f))) return false
      if (sizes.length && !sizes.some((s) => sizesOf(p).includes(s))) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'popular':    return (b.download_count ?? 0) - (a.download_count ?? 0)
        case 'rating':     return b.rating_avg - a.rating_avg
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
        default:           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    return list
  }, [products, category, formats, sizes, sort])

  useEffect(() => { setVisible(PER_PAGE) }, [category, formats, sizes, sort])

  const spotlight = products[0]
  const gridList = hasFilters ? filtered : filtered.filter((p) => p.id !== spotlight?.id)
  const visibleList = gridList.slice(0, visible)
  const thisWeek = products.filter((p) => daysAgo(p.created_at) <= 7).length

  const addItem = useCartStore((s) => s.addItem)
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const clearAll = () => { setCategory(null); setFormats([]); setSizes([]); setSort('newest') }

  const addToCart = (p: Product) => {
    addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug })
    toast.success('Added to cart ✦')
  }

  const formattedDate = latestDate ? new Date(latestDate).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }) : null

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO + SPOTLIGHT ══════════════════════════════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(150deg, rgba(205,199,190,0.18) 0%, rgba(var(--gold-rgb),0.10) 55%, var(--bg-primary) 100%)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full blur-3xl opacity-30 animate-float" style={{ width: 300, height: 300, top: -90, right: '6%', background: '#E5DFD5' }} />
        </div>
        <div className="container-site relative py-12 lg:py-14">
          <nav className="flex items-center gap-1.5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>New Arrivals</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 lg:items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5" style={{ background: 'rgba(205,199,190,0.18)', borderColor: 'rgba(205,199,190,0.45)' }}>
                <Sparkles size={14} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>Just Landed</span>
              </div>
              <h1 className="font-display mb-4" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.75rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>
                New <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Arrivals</em>
              </h1>
              <p className="leading-relaxed max-w-md mb-5" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                The freshest additions to the collection — instant download, ready for GoodNotes, Notability or print.
              </p>
              <p className="text-sm mb-7 inline-flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                <span className="inline-flex items-center gap-1.5"><Sparkles size={13} style={{ color: 'var(--gold)' }} /> {products.length} new {products.length === 1 ? 'design' : 'designs'}</span>
                {thisWeek > 0 && <><span style={{ opacity: 0.4 }}>·</span><span>{thisWeek} this week</span></>}
                {formattedDate && <><span style={{ opacity: 0.4 }}>·</span><span>Latest drop {formattedDate}</span></>}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {[{ icon: Zap, l: 'Instant download' }, { icon: Smartphone, l: 'GoodNotes & Notability' }, { icon: Shield, l: '30-day guarantee' }].map(({ icon: Icon, l }) => (
                  <span key={l} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Icon size={13} style={{ color: 'var(--gold)' }} /> {l}</span>
                ))}
              </div>
            </motion.div>

            {/* Spotlight newest */}
            {spotlight && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.12 }}>
                <div className="rounded-3xl border overflow-hidden grid sm:grid-cols-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 18px 50px rgba(44,42,53,0.12)' }}>
                  <Link href={`/shop/${spotlight.slug}`} className="relative block group" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
                    <Image src={spotlight.thumbnail || FALLBACK_IMG} alt={spotlight.title} fill sizes="(max-width:1024px) 100vw, 30vw" priority className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}><Sparkles size={9} /> NEWEST</span>
                  </Link>
                  <div className="p-6 flex flex-col">
                    {spotlight.category && <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{(spotlight.category as any).name}</p>}
                    <Link href={`/shop/${spotlight.slug}`}><h2 className="font-display text-2xl leading-tight mb-2 transition-colors hover:text-gold" style={{ color: 'var(--text-primary)' }}>{spotlight.title}</h2></Link>
                    {spotlight.rating_avg > 0 && <div className="mb-3"><Stars value={spotlight.rating_avg} size={13} /></div>}
                    <p className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>{fmt(spotlight.price, spotlight.currency)}</p>
                    <div className="flex flex-col gap-2 mt-auto">
                      <button onClick={() => addToCart(spotlight)} className="btn-primary w-full justify-center text-xs"><ShoppingCart size={14} /> Add to cart</button>
                      <button onClick={() => setQuickView(spotlight)} className="btn-outline w-full justify-center text-xs"><Eye size={13} /> Quick view</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ══ STICKY TOOLBAR ════════════════════════════════════ */}
      <div className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', borderColor: 'var(--border)' }}>
        <div className="container-site flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide hidden md:block" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Filter</span>
          <button className={`category-pill ${!category ? 'active' : ''}`} onClick={() => setCategory(null)}>All</button>
          {categories.map((c) => <button key={c.slug} className={`category-pill ${category === c.slug ? 'active' : ''}`} onClick={() => setCategory(category === c.slug ? null : c.slug)}>{c.name}</button>)}
          <div className="flex-1 hidden lg:block" />
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field !py-2 !pr-9 cursor-pointer text-sm appearance-none" style={{ width: 'auto', minWidth: 168 }} aria-label="Sort">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
        {(allFormats.length > 0 || allSizes.length > 0) && (
          <div className="container-site flex items-center gap-2 mt-3 flex-wrap">
            {allFormats.map((f) => <button key={f} className={`category-pill ${formats.includes(f) ? 'active' : ''}`} onClick={() => toggle(formats, setFormats, f)}>{f}</button>)}
            {allFormats.length > 0 && allSizes.length > 0 && <span className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />}
            {allSizes.map((s) => <button key={s} className={`category-pill ${sizes.includes(s) ? 'active' : ''}`} onClick={() => toggle(sizes, setSizes, s)}>{s}</button>)}
          </div>
        )}
        {hasFilters && (
          <div className="container-site flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active:</span>
            {category && <Chip label={categories.find((c) => c.slug === category)?.name ?? category} onClear={() => setCategory(null)} />}
            {formats.map((f) => <Chip key={f} label={f} onClear={() => toggle(formats, setFormats, f)} />)}
            {sizes.map((s) => <Chip key={s} label={s} onClear={() => toggle(sizes, setSizes, s)} />)}
            {sort !== 'newest' && <Chip label={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort} onClear={() => setSort('newest')} />}
            <button onClick={clearAll} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Clear all</button>
          </div>
        )}
      </div>

      {/* ══ GRID ══════════════════════════════════════════════ */}
      <div className="container-site py-10">
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          {hasFilters
            ? <>Showing <b style={{ color: 'var(--text-primary)' }}>{Math.min(visible, gridList.length)}</b> of <b style={{ color: 'var(--text-primary)' }}>{gridList.length}</b> matching</>
            : <><b style={{ color: 'var(--text-primary)' }}>{gridList.length}</b> more fresh {gridList.length === 1 ? 'design' : 'designs'}</>}
        </p>

        {gridList.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <Sparkles size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>{products.length === 0 ? 'Nothing new yet' : 'Nothing matches those filters'}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{products.length === 0 ? 'New designs drop regularly — check back soon.' : 'Try clearing a filter to see more.'}</p>
            {products.length === 0 ? <Link href="/shop" className="btn-primary">Browse all planners</Link> : <button onClick={clearAll} className="btn-outline">Clear filters</button>}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {visibleList.map((p, i) => <NewCard key={p.id} product={p} index={i} onQuickView={() => setQuickView(p)} fmt={fmt} />)}
            </motion.div>
          </AnimatePresence>
        )}

        {visible < gridList.length && (
          <div className="flex flex-col items-center gap-3 mt-12">
            <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ width: `${(Math.min(visible, gridList.length) / gridList.length) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
            </div>
            <button onClick={() => setVisible((v) => v + PER_PAGE)} className="btn-outline px-8">Load more <Plus size={14} /></button>
          </div>
        )}
      </div>

      {/* ══ YOU MAY ALSO LIKE ═════════════════════════════════ */}
      {related.length > 0 && (
        <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <h2 className="font-display text-display-sm mb-8" style={{ color: 'var(--text-primary)' }}>You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.slice(0, 4).map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <Link href={`/shop/${r.slug}`} className="group block rounded-2xl overflow-hidden border tile-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
                      <Image src={r.thumbnail || FALLBACK_IMG} alt={r.title} fill loading="lazy" sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold line-clamp-2 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                      {r.price != null && <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{fmt(r.price, r.currency)}</p>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section className="border-t py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Looking for our most loved picks?</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/shop" className="btn-primary">Shop all planners <ArrowRight size={14} /></Link>
            <Link href="/best-sellers" className="btn-outline">Best sellers</Link>
          </div>
        </div>
      </section>

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
      style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)' }}>
      {label} <X size={10} />
    </button>
  )
}

function NewCard({ product, index, onQuickView, fmt }: { product: Product; index: number; onQuickView: () => void; fmt: (n: number, c?: string | null) => string }) {
  const [loaded, setLoaded] = useState(false)
  const addItem    = useCartStore((s) => s.addItem)
  const inCart     = useCartStore((s) => s.hasItem(product.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(product.id))
  const sale = product.compare_price && product.compare_price > product.price
  const off = sale ? Math.round((1 - product.price / product.compare_price!) * 100) : 0
  const fresh = daysAgo(product.created_at) <= 7
  const psizes = sizesOf(product)

  const add = (e: React.MouseEvent) => { e.preventDefault(); if (inCart) return; addItem({ id: product.id, title: product.title, price: product.price, thumbnail: product.thumbnail || FALLBACK_IMG, slug: product.slug }); toast.success('Added to cart ✦') }
  const wish = (e: React.MouseEvent) => { e.preventDefault(); toggleWish(product.id); toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' }) }

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }} className="group">
      <div className="rounded-xl overflow-hidden tile-hover h-full flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <Link href={`/shop/${product.slug}`} aria-label={product.title}>
            <Image src={product.thumbnail || FALLBACK_IMG} alt={`${product.title} cover`} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" priority={index < 4}
              onLoad={() => setLoaded(true)} className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.05]`} />
          </Link>
          {/* badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {fresh && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}><Sparkles size={9} /> NEW</span>}
            {sale && <span className="badge badge-sale">-{off}%</span>}
          </div>
          {/* wishlist + quick view */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button onClick={wish} aria-label="Toggle wishlist" className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
              <Heart size={14} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : '#888' }} />
            </button>
            <button onClick={(e) => { e.preventDefault(); onQuickView() }} aria-label="Quick view" className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
              <Eye size={14} style={{ color: '#888' }} />
            </button>
          </div>
          {/* hover actions */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <button onClick={(e) => { e.preventDefault(); onQuickView() }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--charcoal)' }}><Eye size={13} /> Quick view</button>
            <button onClick={add} disabled={inCart} aria-label="Add to cart" className="w-10 flex items-center justify-center py-2 rounded-full disabled:opacity-60" style={{ background: 'var(--gold)', color: 'white' }}>{inCart ? <Check size={14} /> : <ShoppingCart size={14} />}</button>
          </div>
        </div>
        {/* info */}
        <div className="px-3.5 pt-3 pb-4 flex flex-col flex-1">
          {product.category && <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{(product.category as any).name}</p>}
          <Link href={`/shop/${product.slug}`}><h3 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-gold mb-1.5" style={{ color: 'var(--text-primary)' }}>{product.title}</h3></Link>
          <div className="flex items-center gap-1.5 mb-2"><Stars value={product.rating_avg || 5} size={11} />{product.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({product.rating_count})</span>}</div>
          {/* format / size tags */}
          {(psizes.length > 0 || (product.file_formats?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {psizes.slice(0, 3).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><Layers size={8} />{s}</span>)}
              {(product.file_formats ?? []).slice(0, 2).map((f) => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{f}</span>)}
            </div>
          )}
          <div className="flex items-baseline gap-1.5 mt-auto">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(product.price, product.currency)}</span>
            {sale && <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{fmt(product.compare_price!, product.currency)}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

