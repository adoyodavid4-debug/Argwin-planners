'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Check, ChevronDown, ChevronRight, ShoppingCart, Zap, Shield, Tablet,
  Star, Quote, BadgeCheck, Link2, Layers, Ruler, Type, Sparkles, Palette,
  LayoutDashboard, Calendar, Grid3X3, Bookmark, List, Hash,
} from 'lucide-react'
import { useCartStore, useUIStore } from '@/lib/store'
import { OptInForm } from '@/components/funnel/OptInForm'
import toast from 'react-hot-toast'
import CoverMockup from './CoverMockup'
import InteriorCarousel from './InteriorCarousel'
import {
  COLOURWAYS, SIZES, SPREADS, FEATURES, WHATS_INSIDE, REVIEWS, RATING, REVIEW_COUNT, FAQS,
} from './data'

const FEAT_ICON: Record<string, React.ElementType> = { link: Link2, layers: Layers, ruler: Ruler, type: Type, tablet: Tablet, zap: Zap }
const INSIDE_ICON: Record<string, React.ElementType> = { layout: LayoutDashboard, calendar: Calendar, grid: Grid3X3, bookmark: Bookmark, list: List, hash: Hash }

export interface NbProduct { id: string; title: string; slug: string; price: number; currency: string | null; thumbnail: string | null }
export interface RelItem { id: string; title: string; slug: string; price: number | null; currency: string | null; image: string | null }

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}
    </span>
  )
}

export default function GeneralClient({ product, related }: { product: NbProduct | null; related: RelItem[] }) {
  const reduce = useReducedMotion()
  const [colourId, setColourId] = useState(COLOURWAYS[0].id)
  const [sizeId, setSizeId]     = useState(SIZES[0].id)
  const [showCta, setShowCta]   = useState(false)
  const swatchRef = useRef<(HTMLButtonElement | null)[]>([])

  const addItem    = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const inCart     = useCartStore((s) => (product ? s.hasItem(product.id) : false))
  const setCartOpen = useUIStore((s) => s.setCartOpen)

  useEffect(() => {
    const onScroll = () => setShowCta(window.scrollY > 640)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const colour = COLOURWAYS.find((c) => c.id === colourId)!
  const size   = SIZES.find((s) => s.id === sizeId)!

  const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: product?.currency ?? 'USD' }).format(n)
  const relFmt = (n: number, c: string | null) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

  const addToCart = (buyNow: boolean) => {
    if (!product) return
    // refresh the line so the latest colour/size variant is reflected in the title
    if (inCart) removeItem(product.id)
    addItem({
      id: product.id,
      title: `${product.title} — ${colour.name}, ${size.label}`,
      price: product.price,
      thumbnail: product.thumbnail || '/placeholder-planner.jpg',
      slug: product.slug,
    })
    if (buyNow) { setCartOpen(true) } else { toast.success('Added to cart ✦') }
  }

  const onSwatchKey = (e: React.KeyboardEvent, i: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % COLOURWAYS.length
    if (e.key === 'ArrowLeft')  next = (i - 1 + COLOURWAYS.length) % COLOURWAYS.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End')  next = COLOURWAYS.length - 1
    setColourId(COLOURWAYS[next].id)
    swatchRef.current[next]?.focus()
  }

  const reveal = (delay = 0) => reduce ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay } }

  // ── Buy panel (shared desktop sticky + inline) ──────────────
  const BuyPanel = () => (
    <div className="rounded-3xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <h3 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Your notebook</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
        <div><dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Colour</dt>
          <dd className="font-medium mt-0.5 inline-flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}><span className="w-3.5 h-3.5 rounded-full" style={{ background: colour.hex, border: '1px solid var(--border)' }} />{colour.name}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Size</dt><dd className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{size.label}</dd></div>
      </dl>
      {product ? (
        <>
          <p className="font-display text-3xl mb-4" style={{ color: 'var(--text-primary)' }}>{fmt(product.price)}</p>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => addToCart(true)} className="btn-primary w-full justify-center">Buy now <ArrowRight size={15} /></button>
            <button onClick={() => addToCart(false)} className="btn-outline w-full justify-center">{inCart ? <><Check size={15} /> In cart — add again</> : <><ShoppingCart size={15} /> Add to cart</>}</button>
          </div>
          <p className="text-[11px] text-center mt-3 inline-flex items-center justify-center gap-1 w-full" style={{ color: 'var(--text-muted)' }}><Shield size={11} /> Secure checkout · instant download</p>
        </>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This notebook is launching soon — join the list and we&rsquo;ll email you the moment it&rsquo;s live.</p>
          <OptInForm variant="footer" locale="en" />
        </>
      )}
    </div>
  )

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HERO + VARIANT SELECTOR ═══════════════════════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)', background: `linear-gradient(160deg, ${colour.hex}22 0%, rgba(205,199,190,0.08) 55%, var(--bg-primary) 100%)`, transition: 'background 0.6s ease' }}>
        <div className="container-site py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 lg:items-start">

            {/* LEFT — copy + variant controls */}
            <div>
              <nav className="flex items-center gap-1.5 mb-5 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
                <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
                <ChevronRight size={12} /><Link href="/notebooks" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Notebooks</Link>
                <ChevronRight size={12} /><span style={{ color: 'var(--text-primary)' }}>General</span>
              </nav>

              <motion.p {...reveal()} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-4 px-3 py-1.5 rounded-full" style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.12em' }}>
                <Zap size={12} /> Ready-Made · Instant Download
              </motion.p>
              <motion.h1 {...reveal(0.05)} className="font-display mb-4" style={{ fontSize: 'clamp(2.3rem,5vw,3.6rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}>
                The everyday notebook,<br /><span style={{ color: 'var(--gold)' }}>ready in seconds.</span>
              </motion.h1>
              <motion.p {...reveal(0.1)} className="leading-relaxed max-w-md mb-6" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                A beautifully structured, hyperlinked notebook for journaling, planning and notes — pick your colour and size, download instantly.
              </motion.p>

              {product && <p className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>{fmt(product.price)}</p>}

              <div className="flex flex-wrap gap-x-5 gap-y-2 mb-9">
                {['GoodNotes', 'Notability', 'Xodo', 'PDF'].map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Check size={12} style={{ color: 'var(--gold)' }} /> {b}</span>
                ))}
              </div>

              {/* Colourway */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3"><Palette size={15} style={{ color: 'var(--gold)' }} /><h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Colourway — {colour.name}</h2></div>
                <div role="radiogroup" aria-label="Cover colourway" className="flex items-center gap-3">
                  {COLOURWAYS.map((c, i) => {
                    const active = c.id === colourId
                    return (
                      <button key={c.id} ref={(el) => { swatchRef.current[i] = el }} role="radio" aria-checked={active} aria-label={c.name}
                        tabIndex={active ? 0 : -1} onClick={() => setColourId(c.id)} onKeyDown={(e) => onSwatchKey(e, i)}
                        className="relative rounded-full transition-transform hover:scale-110"
                        style={{ width: 38, height: 38, background: c.hex, border: '2px solid var(--bg-card)', boxShadow: active ? '0 0 0 2px var(--gold)' : '0 1px 5px rgba(44,42,53,0.2)' }}>
                        {active && <Check size={15} style={{ color: c.ink, position: 'absolute', inset: 0, margin: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Size */}
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Size</h2>
                <div className="flex flex-wrap gap-2.5">
                  {SIZES.map((s) => {
                    const active = s.id === sizeId
                    return (
                      <button key={s.id} onClick={() => setSizeId(s.id)} aria-pressed={active} className="px-4 py-2.5 rounded-xl border text-left transition-all"
                        style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)' }}>
                        <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                        <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.dim}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT — sticky preview + buy panel */}
            <div className="lg:sticky lg:top-24 self-start order-first lg:order-last">
              <div className="mb-7"><CoverMockup colour={colour} sizeLabel={size.label} /></div>
              <div className="hidden lg:block"><BuyPanel /></div>
            </div>
          </div>
        </div>
      </section>

      {/* mobile buy panel */}
      <section className="container-site py-8 lg:hidden"><BuyPanel /></section>

      {/* ══ INTERIOR PREVIEW ══════════════════════════════════ */}
      <section className="container-site py-16">
        <motion.div {...reveal()} className="max-w-2xl mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Look Inside</p>
          <h2 className="font-display text-display-sm mb-2" style={{ color: 'var(--text-primary)' }}>See exactly what you&rsquo;re getting</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sample interior spreads, hyperlinked tabs and template options.</p>
        </motion.div>
        <motion.div {...reveal(0.05)} className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3"><InteriorCarousel spreads={SPREADS} /></div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            {FEATURES.slice(0, 4).map((f) => { const Icon = FEAT_ICON[f.icon] ?? Sparkles; return (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={18} style={{ color: 'var(--gold)' }} /></div>
                <div><p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p><p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.body}</p></div>
              </div>
            )})}
          </div>
        </motion.div>
      </section>

      {/* ══ FEATURE GRID ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="text-center mb-12 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Why You&rsquo;ll Love It</p>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Every Detail, Considered</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => { const Icon = FEAT_ICON[f.icon] ?? Sparkles; return (
              <motion.div key={f.title} {...reveal(i * 0.05)} className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-product" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={20} style={{ color: 'var(--gold)' }} /></div>
                <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.body}</p>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* ══ WHAT'S INSIDE ═════════════════════════════════════ */}
      <section className="container-site py-16">
        <motion.div {...reveal()} className="text-center mb-12 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>What&rsquo;s Inside</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Everything in the Notebook</h2>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {WHATS_INSIDE.map((it, i) => { const Icon = INSIDE_ICON[it.icon] ?? Sparkles; return (
            <motion.div key={it.title} {...reveal(i * 0.05)} className="flex items-start gap-3.5 p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={18} style={{ color: 'var(--gold)' }} /></div>
              <div><p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{it.title}</p><p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{it.body}</p></div>
            </motion.div>
          )})}
        </div>
      </section>

      {/* ══ SOCIAL PROOF ══════════════════════════════════════ */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-site">
          <motion.div {...reveal()} className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3"><Stars value={RATING} size={18} /><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{RATING} from {REVIEW_COUNT}+ happy customers</span></div>
            <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Loved by Note-Takers</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map((r, i) => (
              <motion.div key={r.name} {...reveal(i * 0.08)} className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <Quote size={24} style={{ color: 'var(--gold)', opacity: 0.4 }} className="mb-3" />
                <Stars value={5} size={13} />
                <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}>{r.name.charAt(0)}</div>
                  <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p><p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified Purchase</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="container-site py-16 max-w-2xl mx-auto">
        <motion.div {...reveal()} className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>Good to Know</p>
          <h2 className="font-display text-display-sm" style={{ color: 'var(--text-primary)' }}>Frequently Asked</h2>
        </motion.div>
        <div className="flex flex-col gap-3">{FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} reduce={!!reduce} />)}</div>
      </section>

      {/* ══ YOU MAY ALSO LIKE ═════════════════════════════════ */}
      {related.length > 0 && (
        <section className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="container-site">
            <motion.h2 {...reveal()} className="font-display text-display-sm mb-8" style={{ color: 'var(--text-primary)' }}>You may also like</motion.h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.slice(0, 4).map((r, i) => (
                <motion.div key={r.id} {...reveal(i * 0.05)}>
                  <Link href={`/shop/${r.slug}`} className="group block rounded-2xl overflow-hidden border tile-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
                      {r.image ? <Image src={r.image} alt={r.title} fill loading="lazy" sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={28} style={{ color: 'var(--text-muted)' }} /></div>}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold line-clamp-2 transition-colors group-hover:text-gold" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                      {r.price != null && <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{relFmt(r.price, r.currency)}</p>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ STICKY CTA ════════════════════════════════════════ */}
      <AnimatePresence>
        {showCta && product && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40">
            <div className="rounded-2xl border shadow-2xl flex items-center gap-3 p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <span className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: colour.hex, border: '1px solid var(--border)' }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{colour.name} · {size.label}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(product.price)}</p>
              </div>
              <button onClick={() => addToCart(true)} className="btn-primary !py-2.5 !px-5 text-xs flex-shrink-0 ml-1">Buy now</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FaqItem({ q, a, reduce }: { q: string; a: string; reduce: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300" style={{ color: 'var(--gold)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
            <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
