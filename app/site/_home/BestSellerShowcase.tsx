'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Star, ShoppingCart, Heart, Eye, Check, ArrowRight, Crown } from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import QuickViewModal from '@/components/shop/QuickViewModal'
import toast from 'react-hot-toast'
import type { Product } from '@/types/database'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'
const fmt = (n: number, c?: string | null) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c ?? 'USD' }).format(n)

function Stars({ value }: { value: number }) {
  return <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={11} style={{ fill: i <= Math.round(value) ? 'var(--gold)' : 'transparent', stroke: i <= Math.round(value) ? 'var(--gold)' : 'var(--border)' }} />)}</span>
}

function Card({ p, index, onQuickView }: { p: Product; index: number; onQuickView: () => void }) {
  const reduce = useReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const addItem    = useCartStore((s) => s.addItem)
  const inCart     = useCartStore((s) => s.hasItem(p.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(p.id))
  const add = (e: React.MouseEvent) => { e.preventDefault(); if (inCart) return; addItem({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail || FALLBACK_IMG, slug: p.slug }); toast.success('Added to cart ✦') }
  const wish = (e: React.MouseEvent) => { e.preventDefault(); toggleWish(p.id); toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', { icon: isWished ? '💔' : '❤️' }) }

  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }} className="group">
      <div className="rounded-xl overflow-hidden tile-hover h-full flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          {!loaded && <div className="absolute inset-0 skeleton" />}
          <Link href={`/shop/${p.slug}`} aria-label={p.title}>
            <Image src={p.thumbnail || FALLBACK_IMG} alt={`${p.title} cover`} fill sizes="(max-width:640px) 50vw, 25vw" priority={index < 2} onLoad={() => setLoaded(true)}
              className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.05]`} />
          </Link>
          {p.is_bestseller && <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}><Crown size={9} /> BESTSELLER</span>}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button onClick={wish} aria-label="Toggle wishlist" className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}><Heart size={14} style={{ fill: isWished ? 'var(--blush)' : 'transparent', stroke: isWished ? '#C9847C' : '#888' }} /></button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
            <button onClick={(e) => { e.preventDefault(); onQuickView() }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--charcoal)' }}><Eye size={13} /> Quick view</button>
            <button onClick={add} disabled={inCart} aria-label="Add to cart" className="w-10 flex items-center justify-center py-2 rounded-full disabled:opacity-60" style={{ background: 'var(--gold)', color: 'white' }}>{inCart ? <Check size={14} /> : <ShoppingCart size={14} />}</button>
          </div>
        </div>
        <Link href={`/shop/${p.slug}`} className="block px-3.5 pt-3 pb-4">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-gold mb-1.5" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
          <div className="flex items-center gap-1.5 mb-1.5"><Stars value={p.rating_avg || 5} />{p.rating_count > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>({p.rating_count})</span>}</div>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(p.price, p.currency)}</span>
        </Link>
      </div>
    </motion.div>
  )
}

export default function BestSellerShowcase({ products }: { products: Product[] }) {
  const [quickView, setQuickView] = useState<Product | null>(null)
  if (!products.length) return null

  return (
    <section className="py-16 lg:py-20" style={{ background: 'var(--bg-primary)' }} aria-label="Best sellers">
      <div className="container-site">
        <div className="flex items-end justify-between mb-9 gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}><Crown size={13} /> Customer favourites</p>
            <h2 className="font-display" style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>Our Best Sellers</h2>
          </div>
          <Link href="/best-sellers" className="btn-outline !py-2.5 !px-5 text-xs hidden sm:inline-flex flex-shrink-0">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.slice(0, 4).map((p, i) => <Card key={p.id} p={p} index={i} onQuickView={() => setQuickView(p)} />)}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link href="/best-sellers" className="btn-outline">View all best sellers <ArrowRight size={14} /></Link>
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  )
}
