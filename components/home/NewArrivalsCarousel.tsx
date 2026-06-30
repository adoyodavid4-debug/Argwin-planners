'use client'
// components/home/NewArrivalsCarousel.tsx
// Client carousel + refined cards for the homepage "New Arrivals" section.
// Self-contained: reuses global design tokens (.product-card, .badge, .skeleton,
// CSS custom properties) and calls into the existing cart flow — it does not
// rebuild checkout or modify any shared component.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, Check, Sparkles } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Product, PlannerSize } from '@/types/database'

const SIZE_LABELS: Record<PlannerSize, string> = {
  a4: 'A4',
  a5: 'A5',
  us_letter: 'US Letter',
}

const RECENT_DAYS = 21

/** Small format/size hints so shoppers grasp the offering at a glance. */
function formatTags(product: Product): string[] {
  const sizes = Object.keys(product.planner_files ?? {})
    .map((k) => SIZE_LABELS[k as PlannerSize])
    .filter(Boolean)
  const formats = (product.file_formats ?? []).map((f) => f.toUpperCase())
  // De-duplicate while preserving order, cap to keep cards tidy.
  return Array.from(new Set([...sizes, ...formats])).slice(0, 4)
}

function isRecentlyAdded(createdAt: string): boolean {
  const added = new Date(createdAt).getTime()
  if (Number.isNaN(added)) return false
  return Date.now() - added < RECENT_DAYS * 24 * 60 * 60 * 1000
}

// ── Single card ──────────────────────────────────────────────
function NewArrivalCard({
  product,
  index,
  reduceMotion,
}: {
  product: Product
  index: number
  reduceMotion: boolean
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const hasItem = useCartStore((s) => s.hasItem)
  const inCart = hasItem(product.id)

  const tags = formatTags(product)
  const showNew = isRecentlyAdded(product.created_at)
  const hasDiscount = product.compare_price && product.compare_price > product.price

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) return
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail || '/placeholder-planner.jpg',
      slug: product.slug,
    })
    toast.success(`“${product.title}” added to cart ✦`)
  }

  return (
    <motion.div
      role="listitem"
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 5) * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="snap-start shrink-0 basis-[78%] sm:basis-[46%] md:basis-[31.5%] lg:basis-[23.5%]"
      style={{ minWidth: 0 }}
    >
      <Link
        href={`/shop/${product.slug}`}
        className="product-card group flex h-full flex-col"
        aria-label={`View ${product.title} — $${product.price.toFixed(2)}`}
      >
        {/* ── Cover ─────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
          {!imageLoaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
          <Image
            src={
              product.thumbnail ||
              'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
            }
            alt={`${product.title} — new ${product.delivery_type} planner cover`}
            fill
            sizes="(max-width: 640px) 78vw, (max-width: 768px) 46vw, (max-width: 1024px) 31vw, 23vw"
            loading="lazy"
            className={`object-cover product-image transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {showNew && (
              <span
                className="badge"
                style={{
                  background: 'rgba(var(--gold-rgb),0.16)',
                  color: 'var(--gold-dark)',
                  boxShadow: '0 1px 6px rgba(var(--gold-rgb),0.18)',
                }}
              >
                <Sparkles size={10} aria-hidden="true" /> New
              </span>
            )}
            {hasDiscount && <span className="badge badge-sale">Save</span>}
          </div>

          {/* Add-to-basket affordance — appears on hover/focus, also keyboard reachable */}
          <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={inCart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white transition-colors duration-200"
              style={{
                background: inCart ? 'rgba(110,126,102,0.92)' : 'rgba(44,42,53,0.92)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--font-jost)',
                letterSpacing: '0.05em',
              }}
              aria-label={inCart ? `${product.title} is in your cart` : `Add ${product.title} to cart`}
            >
              {inCart ? (
                <>
                  <Check size={13} /> In cart
                </>
              ) : (
                <>
                  <ShoppingCart size={13} /> Add to cart
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Info ──────────────────────────────── */}
        <div className="flex flex-1 flex-col p-4">
          {product.category && (
            <p
              className="mb-1.5 text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}
            >
              {product.category.name}
            </p>
          )}

          <h3
            className="mb-2 line-clamp-2 text-sm font-semibold leading-snug transition-colors duration-200 group-hover:text-gold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
          >
            {product.title}
          </h3>

          {/* Format / size hints */}
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-jost)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Price + View affordance pinned to the bottom for a tidy grid */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span
                className="text-base font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
              >
                ${product.price.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                  ${product.compare_price!.toFixed(2)}
                </span>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: 'var(--gold-dark)' }}
            >
              <Eye size={13} aria-hidden="true" /> View
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Carousel ─────────────────────────────────────────────────
export default function NewArrivalsCarousel({ products }: { products: Product[] }) {
  const reduceMotion = useReducedMotion() ?? false
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateAffordance = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateAffordance()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateAffordance, { passive: true })
    window.addEventListener('resize', updateAffordance)
    return () => {
      el.removeEventListener('scroll', updateAffordance)
      window.removeEventListener('resize', updateAffordance)
    }
  }, [updateAffordance, products.length])

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const firstCard = el.querySelector<HTMLElement>('[role="listitem"]')
    const step = firstCard ? firstCard.offsetWidth + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="relative">
      {/* Prev / Next controls — hidden on touch where native swipe + snap is the norm */}
      <button
        type="button"
        onClick={() => scrollByCards(-1)}
        disabled={!canPrev}
        aria-label="Show previous new arrivals"
        className="absolute -left-3 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-[var(--bg-card)] shadow-md transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-0 md:flex"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => scrollByCards(1)}
        disabled={!canNext}
        aria-label="Show more new arrivals"
        className="absolute -right-3 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-[var(--bg-card)] shadow-md transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-0 md:flex"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        <ChevronRight size={20} />
      </button>

      {/* Edge fades give a visible scroll affordance on mobile */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 transition-opacity duration-200 md:w-12 ${
          canPrev ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(90deg, var(--bg-primary), transparent)' }}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 transition-opacity duration-200 md:w-12 ${
          canNext ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(270deg, var(--bg-primary), transparent)' }}
        aria-hidden="true"
      />

      <div
        ref={trackRef}
        role="list"
        aria-label="New arrivals"
        className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2"
        style={{ scrollPadding: '0 4px' }}
      >
        {products.map((product, i) => (
          <NewArrivalCard key={product.id} product={product} index={i} reduceMotion={reduceMotion} />
        ))}
      </div>
    </div>
  )
}
