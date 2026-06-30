'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star, Eye, Download } from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Product } from '@/types/database'

interface ProductCardProps {
  product: Product
  priority?: boolean
  index?: number
}

export default function ProductCard({ product, priority = false, index = 0 }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hovered,     setHovered]     = useState(false)

  const addItem       = useCartStore((s) => s.addItem)
  const hasItem       = useCartStore((s) => s.hasItem)
  const toggleWish    = useWishlistStore((s) => s.toggle)
  const isWished      = useWishlistStore((s) => s.has(product.id))

  const inCart       = hasItem(product.id)
  const hasDiscount  = product.compare_price && product.compare_price > product.price
  const discountPct  = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) return
    addItem({
      id:        product.id,
      title:     product.title,
      price:     product.price,
      thumbnail: product.thumbnail || '/placeholder-planner.jpg',
      slug:      product.slug,
    })
    toast.success(`"${product.title}" added to cart ✦`)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleWish(product.id)
    toast(isWished ? 'Removed from wishlist' : 'Added to wishlist ♡', {
      icon: isWished ? '💔' : '❤️',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        href={`/shop/${product.slug}`}
        className="product-card group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`View ${product.title} — $${product.price}`}
      >
        {/* ── Image ────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          <Image
            src={product.thumbnail || `https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80`}
            alt={`${product.title} — premium ${product.delivery_type} planner`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover product-image transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            priority={priority}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_new       && <span className="badge badge-new">New</span>}
            {product.is_bestseller && <span className="badge badge-popular">Best Seller</span>}
            {hasDiscount          && <span className="badge badge-sale">-{discountPct}%</span>}
            {product.is_bundle    && <span className="badge badge-gold">Bundle</span>}
          </div>

          {/* Wishlist button */}
          <button
            className={`wishlist-btn ${isWished ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={15} strokeWidth={2} />
          </button>

          {/* Quick View overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-3 bottom-3 flex gap-2"
          >
            <button
              onClick={handleAddToCart}
              disabled={inCart}
              className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: inCart ? 'rgba(168,181,160,0.9)' : 'rgba(44,42,53,0.92)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--font-jost)',
                letterSpacing: '0.05em',
              }}
              aria-label={inCart ? 'Already in cart' : `Add ${product.title} to cart`}
            >
              {inCart ? (
                <><Download size={12} /> In Cart</>
              ) : (
                <><ShoppingCart size={12} /> Add to Cart</>
              )}
            </button>
          </motion.div>
        </div>

        {/* ── Info ─────────────────────────────────── */}
        <div className="p-4">
          {/* Category */}
          {product.category && (
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
              {product.category.name}
            </p>
          )}

          {/* Title */}
          <h3
            className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-gold transition-colors duration-200"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
          >
            {product.title}
          </h3>

          {/* Rating */}
          {product.rating_count > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center gap-0.5" aria-label={`${product.rating_avg} out of 5 stars`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={i < Math.floor(product.rating_avg) ? 'star-filled fill-current' : 'star-empty'}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ({product.rating_count.toLocaleString()})
              </span>
            </div>
          )}

          {/* Price + Download count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                ${product.price.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                  ${product.compare_price!.toFixed(2)}
                </span>
              )}
            </div>
            {product.download_count > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Download size={10} />
                {product.download_count.toLocaleString()}
              </span>
            )}
          </div>

          {/* File formats */}
          {product.file_formats.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {product.file_formats.slice(0, 3).map((fmt) => (
                <span
                  key={fmt}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'var(--font-jost)' }}
                >
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
