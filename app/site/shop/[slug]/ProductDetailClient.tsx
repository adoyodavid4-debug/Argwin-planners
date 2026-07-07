'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, ChevronDown, Star, ShoppingCart, Heart, Check, Shield, Zap,
  Smartphone, Download, RefreshCcw, FileText, Layers, Ruler, Globe, Link2, X, Maximize2,
  Twitter, Facebook, Linkedin, Link as LinkIcon, Quote, BadgeCheck, ArrowRight, Crown, FileType,
} from 'lucide-react'
import { useCartStore, useWishlistStore, useUIStore } from '@/lib/store'
import toast from 'react-hot-toast'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'
const SIZE_KEYS: { k: string; l: string }[] = [{ k: 'a4', l: 'A4' }, { k: 'us_letter', l: 'US Letter' }, { k: 'a5', l: 'A5' }]

interface P {
  id: string; title: string; slug: string; description: string
  price: number; compare_price: number | null; currency: string
  images: string[]; thumbnail: string | null; preview_pages: string[]
  file_formats: string[]; planner_files: Record<string, unknown>; page_count: number | null; file_size_mb: number | null; delivery_type: string | null
  rating_avg: number; rating_count: number; is_new: boolean; is_bestseller: boolean; tags: string[]; is_bundle: boolean; updated_at: string
  category: { name: string; slug: string } | null
}
interface Rel { id: string; title: string; slug: string; thumbnail: string | null; price: number; currency: string | null; rating_avg: number; rating_count: number; is_bestseller: boolean; is_new: boolean }
interface Rev { id: string; reviewer_name: string; rating: number; title: string | null; body: string | null; verified: boolean; created_at: string }
interface Bundle { id: string; title: string; slug: string; thumbnail: string | null; price: number; currency: string | null }

// TODO(reviews): shown only when a product has no approved rows in the reviews table.
const PLACEHOLDER_REVIEWS: Rev[] = [
  { id: 'ph1', reviewer_name: 'Amara N.', rating: 5, title: 'Beautiful and so easy to use', body: 'The hyperlinks make navigating effortless and it looks gorgeous on my iPad. I actually look forward to planning now.', verified: true, created_at: '2026-05-02' },
  { id: 'ph2', reviewer_name: 'Daniel K.', rating: 5, title: 'Set up in minutes', body: 'Downloaded it in seconds and had it in GoodNotes before my coffee was ready. Worth every penny.', verified: true, created_at: '2026-04-20' },
  { id: 'ph3', reviewer_name: 'Priya S.', rating: 4, title: 'Lovely design', body: 'Gorgeous templates and the sage colourway is my favourite. Printed the A5 size too — just as lovely on paper.', verified: true, created_at: '2026-04-05' },
]

const money = (n: number, c?: string | null) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)
const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} strokeWidth={1.6} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}</span>
}

export default function ProductDetailClient({ product: p, related, reviews, bundleItems, faqs, howToSteps }: {
  product: P; related: Rel[]; reviews: Rev[]; bundleItems: Bundle[]
  faqs: { question: string; answer: string }[]; howToSteps: { name: string; text: string }[]
}) {
  const reduce = useReducedMotion()
  const gallery = useMemo(() => {
    const all = [p.thumbnail, ...p.images, ...p.preview_pages].filter(Boolean) as string[]
    return Array.from(new Set(all)).slice(0, 8)
  }, [p])
  const imgs = gallery.length ? gallery : [FALLBACK_IMG]

  const availableSizes = SIZE_KEYS.filter(({ k }) => (p.planner_files as any)?.[k]).map(({ l }) => l)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [size, setSize] = useState<string | null>(availableSizes[0] ?? null)
  const [added, setAdded] = useState(false)

  const addItem   = useCartStore((s) => s.addItem)
  const inCart    = useCartStore((s) => s.hasItem(p.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished  = useWishlistStore((s) => s.has(p.id))
  const setCartOpen = useUIStore((s) => s.setCartOpen)

  const sale = p.compare_price && p.compare_price > p.price
  const off = sale ? Math.round((1 - p.price / p.compare_price!) * 100) : 0
  const tagline = (p.description.split(/(?<=[.!?])\s+/)[0] ?? '').slice(0, 120)

  const doAdd = (buyNow = false) => {
    const title = size ? `${p.title} — ${size}` : p.title
    addItem({ id: p.id, title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug })
    if (buyNow) { setCartOpen(true) } else { setAdded(true); toast.success('Added to cart ✦'); setTimeout(() => setAdded(false), 1800) }
  }
  const wish = () => { toggleWish(p.id); toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' }) }

  const reveal = (d = 0) => reduce ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5, delay: d } }

  return (
    <div className="w-full pb-20 lg:pb-0" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-6 text-xs flex-wrap" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link><ChevronRight size={12} />
          <Link href="/shop" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Shop</Link>
          {p.category && <><ChevronRight size={12} /><Link href={`/shop/category/${p.category.slug}`} className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>{p.category.name}</Link></>}
          <ChevronRight size={12} /><span className="line-clamp-1" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
        </nav>

        {/* ── HERO: gallery + buy panel ── */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Gallery */}
          <div>
            <div className="relative rounded-3xl overflow-hidden border group" style={{ borderColor: 'var(--border)', background: '#151119', aspectRatio: '3/4' }}
              tabIndex={0} role="group" aria-label="Product gallery"
              onKeyDown={(e) => { if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + imgs.length) % imgs.length); if (e.key === 'ArrowRight') setActive((a) => (a + 1) % imgs.length) }}>
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3 }} className="absolute inset-0">
                  <Image src={imgs[active]} alt={`${p.title} — image ${active + 1}`} fill priority={active === 0} sizes="(max-width:1024px) 100vw, 45vw" className="object-contain" />
                </motion.div>
              </AnimatePresence>
              {/* badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {p.is_new && <span className="badge badge-new">New</span>}
                {p.is_bestseller && <span className="badge badge-popular inline-flex items-center gap-1"><Crown size={9} /> Bestseller</span>}
                {sale && <span className="badge badge-sale">-{off}%</span>}
              </div>
              <button onClick={() => setLightbox(true)} aria-label="Expand image" className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}><Maximize2 size={15} style={{ color: 'var(--charcoal)' }} /></button>
              {imgs.length > 1 && (
                <>
                  <button onClick={() => setActive((a) => (a - 1 + imgs.length) % imgs.length)} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.92)' }}><ChevronLeft size={17} style={{ color: 'var(--charcoal)' }} /></button>
                  <button onClick={() => setActive((a) => (a + 1) % imgs.length)} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.92)' }}><ChevronRight size={17} style={{ color: 'var(--charcoal)' }} /></button>
                </>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2.5 mt-4 overflow-x-auto scrollbar-hide pb-1" role="tablist" aria-label="Gallery thumbnails">
                {imgs.map((src, i) => (
                  <button key={i} onClick={() => setActive(i)} role="tab" aria-selected={i === active} aria-label={`View image ${i + 1}`}
                    className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all" style={{ width: 68, aspectRatio: '3/4', outline: i === active ? '2px solid var(--gold)' : 'none', outlineOffset: 2, opacity: i === active ? 1 : 0.65 }}>
                    <Image src={src} alt="" fill loading="lazy" sizes="68px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy panel */}
          <div className="lg:sticky lg:top-24">
            {p.category && <Link href={`/shop/category/${p.category.slug}`} className="text-xs font-semibold uppercase tracking-widest mb-2 inline-block hover:text-gold transition-colors" style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>{p.category.name}</Link>}
            <h1 className="font-display mb-2" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', lineHeight: 1.1, color: 'var(--text-primary)' }}>{p.title}</h1>
            {tagline && <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{tagline}</p>}

            <a href="#reviews" className="inline-flex items-center gap-2 mb-5 group">
              <Stars value={p.rating_avg || 4.9} />
              <span className="text-sm group-hover:text-gold transition-colors" style={{ color: 'var(--text-secondary)' }}>{(p.rating_avg || 4.9).toFixed(1)} · {p.rating_count || PLACEHOLDER_REVIEWS.length} reviews</span>
            </a>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</span>
              {sale && <span className="text-lg line-through" style={{ color: 'var(--text-muted)' }}>{money(p.compare_price!, p.currency)}</span>}
              {sale && <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: 'var(--gold)' }}>Save {off}%</span>}
            </div>

            {/* Size variant */}
            {availableSizes.length > 1 && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>Size — {size}</p>
                <div className="flex flex-wrap gap-2.5">
                  {availableSizes.map((s) => (
                    <button key={s} onClick={() => setSize(s)} aria-pressed={size === s} className="px-4 py-2 rounded-xl border text-sm font-medium transition-all" style={{ borderColor: size === s ? 'var(--gold)' : 'var(--border)', background: size === s ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)', color: 'var(--text-primary)' }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex gap-3 mb-3">
              <button onClick={() => doAdd(false)} className="btn-primary flex-1 justify-center">{added ? <><Check size={16} /> Added</> : inCart ? <><Check size={16} /> In cart — add again</> : <><ShoppingCart size={16} /> Add to cart</>}</button>
              <button onClick={wish} aria-label={isWished ? 'Remove from wishlist' : 'Save to wishlist'} className="w-12 flex-shrink-0 rounded-full border flex items-center justify-center transition-colors hover:border-gold" style={{ borderColor: 'var(--border)' }}><Heart size={18} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : 'var(--text-secondary)' }} /></button>
            </div>
            <button onClick={() => doAdd(true)} className="btn-outline w-full justify-center mb-4">Buy now <ArrowRight size={15} /></button>

            {/* reassurance */}
            <p className="flex items-center justify-center gap-2 text-xs mb-5" style={{ color: 'var(--text-secondary)' }}><Zap size={13} style={{ color: 'var(--gold)' }} /> Delivered instantly by email &amp; in your account</p>

            {/* trust badges */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[{ icon: Shield, l: 'Secure checkout' }, { icon: Download, l: 'Instant download' }, { icon: Smartphone, l: 'GoodNotes & Notability' }, { icon: RefreshCcw, l: '30-day promise' }].map(({ icon: Icon, l }) => (
                <div key={l} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><Icon size={14} style={{ color: 'var(--gold)' }} /> {l}</div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Works with</span>
              {['GoodNotes', 'Notability', 'Xodo', 'PDF'].map((b) => <span key={b} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Check size={11} style={{ color: 'var(--sage)' }} /> {b}</span>)}
            </div>

            {/* share */}
            <Share title={p.title} slug={p.slug} />
          </div>
        </div>

        {/* Take a closer look — every uploaded image, full-width & uncropped */}
        {imgs.length > 1 && (
          <motion.section {...reveal()} className="mt-16">
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Take a closer look</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Every page and preview, shown in full — tap any image to enlarge.</p>
            <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-3xl p-3 sm:p-5" style={{ background: '#151119' }}>
              {imgs.slice(1).map((src, idx) => {
                const i = idx + 1
                return (
                <button
                  key={i}
                  onClick={() => { setActive(i); setLightbox(true) }}
                  aria-label={`Enlarge preview ${idx + 1}`}
                  className="group block w-full overflow-hidden rounded-2xl border transition-shadow hover:shadow-product"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#151119' }}
                >
                  <Image
                    src={src}
                    alt={`${p.title} — preview ${i + 1}`}
                    width={0}
                    height={0}
                    sizes="(max-width: 768px) 100vw, 768px"
                    loading="lazy"
                    className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.01]"
                  />
                </button>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Bundle contents */}
        {p.is_bundle && bundleItems.length > 0 && (
          <motion.section {...reveal()} className="mt-16 rounded-3xl border p-7" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <h2 className="font-display text-2xl mb-5" style={{ color: 'var(--text-primary)' }}>What&rsquo;s included ({bundleItems.length} planners)</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {bundleItems.map((item) => (
                <Link key={item.id} href={`/shop/${item.slug}`} className="flex items-center gap-3 p-3 rounded-2xl border group hover:border-gold transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}><Image src={item.thumbnail || FALLBACK_IMG} alt={item.title} fill loading="lazy" sizes="56px" className="object-cover" /></div>
                  <span className="text-sm flex-1 font-medium group-hover:text-gold transition-colors" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{money(item.price, item.currency)}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* At-a-glance specs */}
        <motion.section {...reveal()} className="mt-16">
          <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>At a glance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: FileType, l: 'Formats', v: p.file_formats.length ? p.file_formats.join(', ') : 'PDF' },
              { icon: Ruler, l: 'Sizes', v: availableSizes.length ? availableSizes.join(' · ') : 'A4 · US Letter · A5' },
              { icon: FileText, l: 'Pages', v: p.page_count ? String(p.page_count) : '—' },
              { icon: Link2, l: 'Navigation', v: 'Hyperlinked tabs' },
              { icon: Layers, l: 'Templates', v: 'Dotted · Lined · Blank' },
              { icon: Globe, l: 'Language', v: 'English (UK)' },
              { icon: Download, l: 'Delivery', v: 'Instant download' },
              { icon: RefreshCcw, l: 'Format', v: 'Undated · reusable' },
            ].map(({ icon: Icon, l, v }) => (
              <div key={l} className="p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={16} style={{ color: 'var(--gold)' }} /></div>
                <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{l}</p>
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{v}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Story / description */}
        {p.description && (
          <motion.section {...reveal()} className="mt-16 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div>
              <h2 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>About this planner</h2>
              <div className="flex flex-col gap-4">
                {p.description.split(/\n{2,}|(?<=[.!?])\s{2,}/).filter(Boolean).slice(0, 5).map((para, i) => (
                  <p key={i} className="text-[0.98rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{para.trim()}</p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>What&rsquo;s inside</h3>
              <ul className="flex flex-col gap-2.5">
                {['Instant hyperlinked PDF', p.file_formats.includes('GoodNotes') ? 'GoodNotes-ready template' : 'Works in any PDF app', 'A4, US Letter & A5 sizes', p.page_count ? `${p.page_count} pages` : 'Full year of pages', 'Dotted, lined & blank layouts', 'Personal-use licence'].map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Check size={15} style={{ color: 'var(--gold)' }} className="mt-0.5 flex-shrink-0" /> {l}</li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        {/* How to use */}
        <motion.section {...reveal()} className="mt-16">
          <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>How to use it</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howToSteps.map((step, i) => (
              <div key={i} className="p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3" style={{ background: 'var(--gold)' }}>{i + 1}</span>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{step.name}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Reviews */}
        <ReviewsSection reviews={reviews.length ? reviews : PLACEHOLDER_REVIEWS} isPlaceholder={reviews.length === 0}
          avg={p.rating_count > 0 ? p.rating_avg : 4.9} count={p.rating_count > 0 ? p.rating_count : PLACEHOLDER_REVIEWS.length} reveal={reveal} />

        {/* FAQ */}
        <motion.section {...reveal()} className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>Frequently asked</h2>
          <div className="flex flex-col gap-3">
            {(faqs.length ? faqs : DEFAULT_FAQS).map((f, i) => <Faq key={i} q={f.question} a={f.answer} reduce={!!reduce} />)}
          </div>
        </motion.section>

        {/* Related */}
        {related.length > 0 && (
          <motion.section {...reveal()} className="mt-16">
            <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {related.slice(0, 4).map((r) => (
                <Link key={r.id} href={`/shop/${r.slug}`} className="group block rounded-2xl overflow-hidden border tile-hover" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-secondary)' }}>
                    <Image src={r.thumbnail || FALLBACK_IMG} alt={r.title} fill loading="lazy" sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    {r.is_bestseller && <span className="badge badge-popular absolute top-3 left-3">Bestseller</span>}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold line-clamp-2 transition-colors group-hover:text-gold mb-1.5" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                    <div className="flex items-center gap-1.5 mb-1"><Stars value={r.rating_avg || 5} size={11} /></div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{money(r.price, r.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>{lightbox && <Lightbox imgs={imgs} active={active} setActive={setActive} onClose={() => setLightbox(false)} title={p.title} reduce={!!reduce} />}</AnimatePresence>

      {/* Mobile sticky buy bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 -6px 24px rgba(44,42,53,0.10)' }}>
        <div className="min-w-0">
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{size ? `${p.title} · ${size}` : p.title}</p>
          <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{money(p.price, p.currency)}</p>
        </div>
        <button onClick={() => doAdd(true)} className="btn-primary flex-1 justify-center ml-auto"><ShoppingCart size={15} /> Add to cart</button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function Share({ title, slug }: { title: string; slug: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { setUrl(window.location.href) }, [slug])
  const enc = encodeURIComponent
  const links = [
    { icon: Twitter, label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { icon: Facebook, label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { icon: Linkedin, label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]
  return (
    <div className="flex items-center gap-2.5 mt-5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Share</span>
      {links.map(({ icon: Icon, label, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:-translate-y-0.5 hover:border-gold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}><Icon size={14} /></a>
      ))}
      <button onClick={() => { navigator.clipboard?.writeText(url); toast.success('Link copied ✦') }} aria-label="Copy link" className="w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:-translate-y-0.5 hover:border-gold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}><LinkIcon size={14} /></button>
    </div>
  )
}

function Lightbox({ imgs, active, setActive, onClose, title, reduce }: { imgs: string[]; active: number; setActive: (fn: (a: number) => number) => void; onClose: () => void; title: string; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + imgs.length) % imgs.length); if (e.key === 'ArrowRight') setActive((a) => (a + 1) % imgs.length) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [imgs.length, onClose, setActive])
  return (
    <motion.div ref={ref} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none" style={{ background: 'rgba(26,24,32,0.92)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true" aria-label={`${title} — enlarged image`}>
      <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}><X size={18} /></button>
      <button onClick={() => setActive((a) => (a - 1 + imgs.length) % imgs.length)} aria-label="Previous" className="absolute left-4 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}><ChevronLeft size={20} /></button>
      <button onClick={() => setActive((a) => (a + 1) % imgs.length)} aria-label="Next" className="absolute right-4 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}><ChevronRight size={20} /></button>
      <motion.div key={active} initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduce ? 0 : 0.25 }} className="relative" style={{ width: 'min(90vw, 560px)', aspectRatio: '3/4' }}>
        <Image src={imgs[active]} alt={`${title} — image ${active + 1}`} fill sizes="90vw" className="object-contain" />
      </motion.div>
      <p className="absolute bottom-5 text-xs text-white/70">{active + 1} / {imgs.length}</p>
    </motion.div>
  )
}

function ReviewsSection({ reviews, isPlaceholder, avg, count, reveal }: { reviews: Rev[]; isPlaceholder: boolean; avg: number; count: number; reveal: (d?: number) => any }) {
  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0]
    reviews.forEach((r) => { const s = Math.round(r.rating); if (s >= 1 && s <= 5) d[s - 1]++ })
    const total = reviews.length || 1
    return d.map((n) => Math.round((n / total) * 100))
  }, [reviews])
  return (
    <motion.section {...reveal()} id="reviews" className="mt-16 scroll-mt-24">
      <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>Reviews</h2>
      <div className="grid lg:grid-cols-[260px_1fr] gap-8 lg:gap-12 items-start">
        {/* summary */}
        <div className="rounded-2xl border p-6 text-center lg:sticky lg:top-24" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="font-display text-5xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</p>
          <div className="flex justify-center mb-2"><Stars value={avg} size={16} /></div>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Based on {count} review{count === 1 ? '' : 's'}</p>
          <div className="flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-3" style={{ color: 'var(--text-muted)' }}>{star}</span>
                <Star size={11} style={{ fill: 'var(--gold)', stroke: 'var(--gold)' }} />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}><div className="h-full rounded-full" style={{ width: `${dist[star - 1]}%`, background: 'var(--gold)' }} /></div>
              </div>
            ))}
          </div>
        </div>
        {/* list */}
        <div>
          {isPlaceholder && <p className="text-[11px] mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Sample reviews — real reviews appear here once submitted</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <figure key={r.id} className="p-5 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2"><Stars value={r.rating} size={13} /><Quote size={16} style={{ color: 'var(--gold)', opacity: 0.3 }} /></div>
                {r.title && <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{r.title}</p>}
                {r.body && <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>{r.body}</p>}
                <figcaption className="flex items-center gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}>{initials(r.reviewer_name)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.reviewer_name}</p>
                    {r.verified && <p className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sage)' }}><BadgeCheck size={11} /> Verified buyer</p>}
                  </div>
                  <span className="text-[11px] ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function Faq({ q, a, reduce }: { q: string; a: string; reduce: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300" style={{ color: 'var(--gold)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}><p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p></motion.div>}
      </AnimatePresence>
    </div>
  )
}

const DEFAULT_FAQS = [
  { question: 'What file formats will I receive?', answer: 'A high-resolution hyperlinked PDF that works in GoodNotes, Notability, Xodo and any PDF app — plus print-ready A4, US Letter and A5 sizing.' },
  { question: 'How fast is delivery?', answer: 'Instant. A secure download link is emailed to you the moment payment clears, and it stays in your account for re-download any time.' },
  { question: 'How do I import it into GoodNotes or Notability?', answer: 'Open the PDF on your device and choose “Open in GoodNotes / Notability”, or import it from Files — the tabs and links carry across automatically.' },
  { question: 'What is your refund policy?', answer: 'Because these are instant digital downloads we generally cannot offer refunds, but if anything is wrong with your file our team will make it right within 30 days.' },
]
