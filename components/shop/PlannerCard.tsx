'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Star, MoreHorizontal, ShoppingCart, Share2, Eye } from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Product } from '@/types/database'
import QuickViewModal from './QuickViewModal'

interface Props {
  product: Product
  index?: number
  priority?: boolean
}

export default function PlannerCard({ product, index = 0, priority = false }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hovered,     setHovered]     = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [quickView,   setQuickView]   = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  const addItem    = useCartStore((s) => s.addItem)
  const hasItem    = useCartStore((s) => s.hasItem)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const isWished   = useWishlistStore((s) => s.has(product.id))
  const inCart     = hasItem(product.id)

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggleWish(product.id)
    toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', {
      icon: isWished ? '💔' : '❤️',
    })
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (inCart) return
    addItem({ id: product.id, title: product.title, price: product.price, thumbnail: product.thumbnail || '/placeholder-planner.jpg', slug: product.slug })
    toast.success(`"${product.title}" added to cart ✦`)
    setMenuOpen(false)
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const url = `${window.location.origin}/shop/${product.slug}`
    if (navigator.share) {
      await navigator.share({ title: product.title, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
    setMenuOpen(false)
  }

  const numberPrefix = product.display_order != null ? `${product.display_order}. ` : ''

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="rounded-xl overflow-hidden transition-shadow duration-300 group-hover:shadow-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* ── Cover image ──────────────────────────────── */}
          <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>

            {/* Skeleton */}
            {!imageLoaded && <div className="absolute inset-0 skeleton" />}

            {/* Image — navigates to product page */}
            <Link href={`/shop/${product.slug}`} tabIndex={-1} aria-hidden="true">
              <Image
                src={product.thumbnail || 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80'}
                alt={`${product.title} cover`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.03]`}
                priority={priority}
                onLoad={() => setImageLoaded(true)}
              />
            </Link>

            {/* Dark hover overlay */}
            <div
              className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.40)', opacity: hovered ? 1 : 0 }}
            />

            {/* Centered Quick View button */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
              style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
            >
              <button
                onClick={(e) => { e.preventDefault(); setQuickView(true) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-semibold transition-transform duration-150 hover:scale-105 active:scale-95"
                style={{ background: 'var(--gold)', fontFamily: 'var(--font-jost)', letterSpacing: '0.05em' }}
                aria-label={`Quick view: ${product.title}`}
              >
                <Eye size={13} />
                Quick View
              </button>
            </div>

            {/* Top-right floating pill: Star + ··· */}
            <div
              ref={menuRef}
              className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1.5 rounded-full transition-opacity duration-200"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                opacity: hovered ? 1 : 0.75,
                zIndex: 10,
              }}
            >
              {/* Wishlist star */}
              <button
                onClick={handleWishlist}
                className="p-0.5 rounded-full transition-transform hover:scale-110"
                aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Star
                  size={14}
                  strokeWidth={1.8}
                  style={{
                    fill:   isWished ? 'var(--gold)' : 'transparent',
                    stroke: isWished ? 'var(--gold)' : '#888',
                  }}
                />
              </button>

              {/* Divider */}
              <span aria-hidden="true" style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.15)', display: 'block', flexShrink: 0 }} />

              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v) }}
                  className="p-0.5 rounded-full transition-transform hover:scale-110"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <MoreHorizontal size={14} style={{ color: '#888' }} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-7 w-36 rounded-xl shadow-xl border py-1.5 z-20"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    <Link
                      href={`/shop/${product.slug}`}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Eye size={13} style={{ color: 'var(--text-muted)' }} />
                      View
                    </Link>
                    <button
                      role="menuitem"
                      onClick={handleAddToCart}
                      disabled={inCart}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <ShoppingCart size={13} style={{ color: 'var(--text-muted)' }} />
                      {inCart ? 'In Cart' : 'Add to Cart'}
                    </button>
                    <button
                      role="menuitem"
                      onClick={handleShare}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Share2 size={13} style={{ color: 'var(--text-muted)' }} />
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Title below image ────────────────────────── */}
          <Link
            href={`/shop/${product.slug}`}
            className="block px-3.5 pt-3 pb-4 group/title"
            style={{ minHeight: 64 }}
          >
            <p
              className="text-sm font-semibold leading-snug line-clamp-2 transition-colors duration-200 group-hover/title:text-gold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
            >
              {numberPrefix}{product.title}
            </p>
          </Link>
        </div>
      </motion.div>

      {quickView && (
        <QuickViewModal product={product} onClose={() => setQuickView(false)} />
      )}
    </>
  )
}
