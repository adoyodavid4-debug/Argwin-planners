'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, Check, Star, Shield, Zap } from 'lucide-react'

export interface HeroProduct {
  id: string
  title: string
  slug: string
  price: number
  currency: string | null
  thumbnail: string | null
  rating_avg: number | null
  rating_count: number | null
}

const fmt = (n: number, c?: string | null) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

function BadgePill({ variant }: { variant: 'best' | 'new' }) {
  const isBest = variant === 'best'
  return (
    <span
      className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={
        isBest
          ? { background: '#254A38', color: '#F7F2E8' }
          : { background: '#C79A3E', color: '#2C2A35' }
      }
    >
      {isBest ? <Star size={10} style={{ fill: 'currentColor' }} /> : <Sparkles size={10} />}
      {isBest ? 'Best Seller' : 'New Arrival'}
    </span>
  )
}

function FallbackCover({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center" style={{ background: '#F7F2E8' }}>
      <span
        className="mb-2 flex items-center justify-center rounded-full"
        style={{ width: 44, height: 44, border: '1.5px solid #9E7A2A' }}
      >
        <Sparkles size={18} style={{ color: '#9E7A2A' }} />
      </span>
      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#2C2A35', fontWeight: 600 }}>Arwign</p>
      <p className="mt-1 text-[9px] uppercase" style={{ letterSpacing: '0.25em', color: '#9E7A2A' }}>{label}</p>
    </div>
  )
}

function ShowcaseCard({
  product,
  variant,
  index,
}: {
  product: HeroProduct | null
  variant: 'best' | 'new'
  index: number
}) {
  const reduce = useReducedMotion()
  const isBest = variant === 'best'
  const collectionHref = isBest ? '/best-sellers' : '/new-arrivals'
  const collectionLabel = isBest ? 'View all best sellers' : 'View all new arrivals'
  const cardHref = product ? `/shop/${product.slug}` : collectionHref
  const alt = product
    ? `${product.title} — ${isBest ? 'Best Seller' : 'New Arrival'} digital planner cover`
    : `Arwign ${isBest ? 'best sellers' : 'new arrivals'} collection`

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index, ease: 'easeOut' }}
      className={`group w-full max-w-[240px] ${index === 0 ? 'lg:-translate-y-6' : 'lg:translate-y-6'}`}
    >
      <Link
        href={cardHref}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C79A3E] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:-translate-y-1"
      >
        <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl shadow-[0_20px_50px_-20px_rgba(37,42,32,0.25)] motion-safe:transition-shadow motion-safe:duration-300 group-hover:shadow-[0_26px_56px_-18px_rgba(37,42,32,0.35)]">
          <BadgePill variant={variant} />
          {product?.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={alt}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
              priority={index === 0}
            />
          ) : (
            <FallbackCover label={isBest ? 'Best Seller' : 'New Arrival'} />
          )}
        </span>
        {product && (
          <span className="mt-3 block px-0.5">
            <span
              className="line-clamp-2 block text-[0.98rem] leading-snug"
              style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 600, color: 'var(--text-primary)' }}
            >
              {product.title}
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {fmt(product.price, product.currency)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Star size={11} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />
                {(product.rating_avg ?? 4.9).toFixed(1)}
                {product.rating_count ? ` · ${product.rating_count}` : ''}
              </span>
            </span>
          </span>
        )}
      </Link>
      <Link
        href={collectionHref}
        className="mt-2 inline-block px-0.5 text-xs font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C79A3E]"
        style={{ color: '#9E7A2A' }}
      >
        {collectionLabel} →
      </Link>
    </motion.div>
  )
}

export default function HomeHero({
  bestSeller = null,
  newArrival = null,
  eyebrow = 'Premium digital & printable planners',
  headline = 'Plan your best life,',
  headlineAccent = 'beautifully.',
  subcopy = 'Hyperlinked planners & notebooks designed to make organising a joy — instant download, ready for GoodNotes, Notability or print.',
}: {
  bestSeller?: HeroProduct | null
  newArrival?: HeroProduct | null
  eyebrow?: string
  headline?: string
  headlineAccent?: string
  subcopy?: string
}) {
  const reduce = useReducedMotion()

  return (
    <section
      className="relative overflow-hidden bg-[#F7F4EE] dark:bg-[var(--bg-neutral)]"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="container-site relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-8 lg:py-28">
        {/* Copy */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-5 px-3 py-1.5 rounded-full" style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.14em' }}>
            <Sparkles size={12} /> {eyebrow}
          </p>
          <h1 className="font-display mb-5" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.4rem)', lineHeight: 1.02, color: 'var(--text-primary)' }}>
            {headline}<br /><span style={{ color: 'var(--gold)' }}>{headlineAccent}</span>
          </h1>
          <p className="leading-relaxed max-w-md mb-8" style={{ color: 'var(--text-secondary)', fontSize: '1.12rem' }}>
            {subcopy}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-9">
            <Link href="/shop" className="btn-primary">Shop the collection <ArrowRight size={16} /></Link>
            <Link href="/notebooks/personalized" className="btn-outline">Personalise yours</Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />)}</span>
              4.9 <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· 12k+ happy planners</span>
            </span>
            <span className="w-px h-4 hidden sm:block" style={{ background: 'var(--border)' }} />
            {[{ icon: Zap, l: 'Instant download' }, { icon: Shield, l: 'Secure checkout' }].map(({ icon: Icon, l }) => (
              <span key={l} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Icon size={13} style={{ color: 'var(--gold)' }} /> {l}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            {['GoodNotes', 'Notability', 'Xodo', 'PDF'].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Check size={11} style={{ color: 'var(--sage)' }} /> {b}</span>
            ))}
          </div>
        </motion.div>

        {/* Two-Card Showcase */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 lg:justify-end lg:pr-2">
          <ShowcaseCard product={bestSeller} variant="best" index={0} />
          <ShowcaseCard product={newArrival} variant="new" index={1} />
        </div>
      </div>
    </section>
  )
}
