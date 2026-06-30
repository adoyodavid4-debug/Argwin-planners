'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingCart, ExternalLink } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Product } from '@/types/database'

interface Props {
  product: Product
  onClose: () => void
}

export default function QuickViewModal({ product, onClose }: Props) {
  const addItem  = useCartStore((s) => s.addItem)
  const hasItem  = useCartStore((s) => s.hasItem)
  const inCart   = hasItem(product.id)

  const closeRef   = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef  = useRef<HTMLDivElement>(null)

  // Lock scroll, focus close button, handle ESC + click-outside
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }

      // Basic focus-trap inside dialog
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])'
        )
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleAddToCart = () => {
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

  const hasDiscount = product.compare_price && product.compare_price > product.price
  const categoryName = (product.category as any)?.name

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label={`Quick view: ${product.title}`}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-card)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Close */}
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          aria-label="Close quick view"
        >
          <X size={16} />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 overflow-y-auto">
          {/* Cover */}
          <div className="relative bg-[var(--bg-secondary)]" style={{ aspectRatio: '3/4', minHeight: 240 }}>
            <Image
              src={product.thumbnail || 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {product.is_new        && <span className="badge badge-new">New</span>}
              {product.is_bestseller && <span className="badge badge-popular">Best Seller</span>}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {categoryName && (
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-jost)' }}>
                {categoryName}
              </p>
            )}
            <h2 className="font-display text-xl leading-tight" style={{ color: 'var(--text-primary)' }}>
              {product.title}
            </h2>

            {product.description && (
              <p className="text-sm leading-relaxed line-clamp-5" style={{ color: 'var(--text-secondary)' }}>
                {product.description}
              </p>
            )}

            {/* Preview thumbnails */}
            {product.preview_pages?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {product.preview_pages.slice(0, 4).map((url, i) => (
                  <div
                    key={i}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden border"
                    style={{ width: 60, height: 78, borderColor: 'var(--border)' }}
                  >
                    <Image src={url} alt={`Preview ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* File formats */}
            {product.file_formats?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.file_formats.map((fmt) => (
                  <span key={fmt} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'var(--font-jost)' }}>
                    {fmt}
                  </span>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="font-bold text-2xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                ${product.price.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                  ${product.compare_price!.toFixed(2)}
                </span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleAddToCart}
                disabled={inCart}
                className="btn-primary w-full justify-center gap-2 disabled:opacity-60"
              >
                <ShoppingCart size={15} />
                {inCart ? 'Already in Cart' : 'Add to Cart'}
              </button>
              <Link
                href={`/shop/${product.slug}`}
                className="btn-outline w-full justify-center gap-2 text-center"
                onClick={onClose}
              >
                <ExternalLink size={14} />
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
