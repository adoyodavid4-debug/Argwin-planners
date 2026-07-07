'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, Check, Star, Shield, Zap } from 'lucide-react'
import HeroCalendarCard from './HeroCalendarCard'
import {
  HERO_FRAME_CLASS, heroFrameStyle, HeroBadge, HeroCTA, HeroTitle, HeroMeta, FOCUS_RING,
} from './HeroCardKit'

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

export interface HeroCover {
  title: string
  slug: string
  thumbnail: string | null
}

const fmt = (n: number, c?: string | null) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

// ════════════════════════════════════════════════════════════
//  Best Seller — fanned stack of real covers + gold seal accent
// ════════════════════════════════════════════════════════════
const FAN_SLOTS = [
  { tx: '-34%', rotate: -9, z: 10 }, // back left
  { tx: '34%',  rotate: 9,  z: 10 }, // back right
  { tx: '0%',   rotate: 0,  z: 20 }, // front centre (top)
]

function BestSellerCard({ covers, index }: { covers: HeroCover[]; index: number }) {
  const reduce = useReducedMotion()
  const pics = covers.filter((c) => c.thumbnail).slice(0, 3)

  // Arrange so the top seller sits front-and-centre on top of the fan.
  const arranged =
    pics.length >= 3 ? [{ c: pics[1], s: FAN_SLOTS[0] }, { c: pics[2], s: FAN_SLOTS[1] }, { c: pics[0], s: FAN_SLOTS[2] }]
    : pics.length === 2 ? [{ c: pics[1], s: FAN_SLOTS[0] }, { c: pics[0], s: FAN_SLOTS[2] }]
    : pics.length === 1 ? [{ c: pics[0], s: FAN_SLOTS[2] }]
    : []

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index, ease: 'easeOut' }}
      className="h-full"
    >
      <div className={HERO_FRAME_CLASS} style={heroFrameStyle}>
        <HeroBadge label="Best Seller" variant="best" icon={Star} />
        <Link href="/best-sellers" className={`block ${FOCUS_RING} rounded-2xl`} aria-label="Shop Arwign best sellers">
          {/* Visual — fanned covers or a refined seal fallback */}
          <span className="relative block aspect-[4/5]" aria-hidden="true">
            {arranged.length > 0 ? (
              <>
                {arranged.map(({ c, s }, i) => (
                  <span
                    key={`${c.slug}-${i}`}
                    className="absolute left-1/2 top-1/2 block w-[58%] overflow-hidden rounded-lg"
                    style={{
                      aspectRatio: '3 / 4',
                      transform: `translate(-50%,-50%) translateX(${s.tx}) rotate(${s.rotate}deg)`,
                      zIndex: s.z,
                      boxShadow: '0 10px 22px -8px rgba(60,50,20,0.38)',
                      border: '2px solid #FBF7EF',
                    }}
                  >
                    <Image src={c.thumbnail as string} alt="" fill sizes="120px" className="object-cover" />
                  </span>
                ))}
                {/* Gold seal — demoted to a small corner accent */}
                <span
                  className="absolute bottom-1 right-2 z-30 flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: '#F7F2E8', border: '1.5px solid #A0830E', boxShadow: '0 3px 10px rgba(60,50,20,0.28)' }}
                >
                  <Sparkles size={15} style={{ color: '#A0830E' }} />
                </span>
              </>
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ border: '1.5px solid #A0830E' }}>
                  <Sparkles size={22} style={{ color: '#A0830E' }} />
                </span>
                <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#2C2A35', fontWeight: 600 }}>Arwign</span>
              </span>
            )}
          </span>

          <span className="block pt-3">
            <HeroTitle>Reader favourites</HeroTitle>
            <HeroMeta>
              <Star size={12} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />
              4.9 <span style={{ color: 'var(--text-muted)' }}>· 12k+ happy planners</span>
            </HeroMeta>
          </span>
        </Link>
        <HeroCTA href="/best-sellers" label="View all best sellers →" />
      </div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════
//  New Arrival — cover framed in a soft premium mat
// ════════════════════════════════════════════════════════════
function NewArrivalCard({ product, index }: { product: HeroProduct | null; index: number }) {
  const reduce = useReducedMotion()
  const cardHref = product ? `/shop/${product.slug}` : '/new-arrivals'
  const alt = product ? `${product.title} — New Arrival digital planner cover` : 'Arwign new arrivals'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index, ease: 'easeOut' }}
      className="h-full"
    >
      <div className={HERO_FRAME_CLASS} style={heroFrameStyle}>
        <HeroBadge label="New Arrival" variant="new" icon={Sparkles} />
        <Link href={cardHref} className={`block ${FOCUS_RING} rounded-2xl`} aria-label={product ? `Shop ${product.title}` : 'Shop new arrivals'}>
          {/* Framed cover — mat + drop shadow + gentle hover zoom */}
          <span
            className="relative flex aspect-[4/5] items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(160deg,#FFFDF8 0%,#F3EBDD 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }}
          >
            <span
              className="relative block w-[74%] overflow-hidden rounded-lg"
              style={{ aspectRatio: '3 / 4', boxShadow: '0 14px 28px -10px rgba(60,50,20,0.42)', border: '2px solid #FFFFFF' }}
            >
              {product?.thumbnail ? (
                <Image
                  src={product.thumbnail}
                  alt={alt}
                  fill
                  sizes="(max-width: 640px) 45vw, 160px"
                  className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover/card:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center" style={{ background: '#F7F2E8' }}>
                  <Sparkles size={20} style={{ color: '#A0830E' }} />
                </span>
              )}
            </span>
          </span>

          <span className="block pt-3">
            <HeroTitle className="line-clamp-2">{product ? product.title : 'New Arrivals'}</HeroTitle>
            {product && (
              <HeroMeta>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(product.price, product.currency)}</span>
                {product.rating_count && product.rating_avg ? (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <Star size={12} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />
                    {product.rating_avg.toFixed(1)}
                    <span style={{ color: 'var(--text-muted)' }}>({product.rating_count})</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>· Instant download</span>
                )}
              </HeroMeta>
            )}
          </span>
        </Link>
        <HeroCTA href="/new-arrivals" label="View all new arrivals →" />
      </div>
    </motion.div>
  )
}

export default function HomeHero({
  bestSeller = null,
  newArrival = null,
  bestSellerCovers = [],
  eyebrow = 'Premium digital & printable planners',
  headline = 'Plan your best life,',
  headlineAccent = 'beautifully.',
  subcopy = 'Hyperlinked planners & notebooks designed to make organising a joy — instant download, ready for GoodNotes, Notability or print.',
}: {
  bestSeller?: HeroProduct | null
  newArrival?: HeroProduct | null
  bestSellerCovers?: HeroCover[]
  eyebrow?: string
  headline?: string
  headlineAccent?: string
  subcopy?: string
}) {
  const reduce = useReducedMotion()

  // Cover source for the Best Seller fan: the flagged best seller (if any)
  // first, then the supplied top covers — never changes the card's link.
  const covers: HeroCover[] = [
    ...(bestSeller?.thumbnail ? [{ title: bestSeller.title, slug: bestSeller.slug, thumbnail: bestSeller.thumbnail }] : []),
    ...bestSellerCovers,
  ].filter((c, i, arr) => c.thumbnail && arr.findIndex((x) => x.slug === c.slug) === i)

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

        {/* Hero card cluster — Best Seller · New Arrival · Arwign Calendar */}
        <div className="relative">
          {/* Faint shared backdrop glow ties the trio together */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
            <div style={{ width: '88%', height: '82%', background: 'radial-gradient(ellipse at center, rgba(160,131,14,0.10) 0%, transparent 70%)' }} />
          </div>
          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 lg:pr-1">
            <BestSellerCard covers={covers} index={0} />
            <NewArrivalCard product={newArrival} index={1} />
            <HeroCalendarCard index={2} />
          </div>
        </div>
      </div>
    </section>
  )
}
