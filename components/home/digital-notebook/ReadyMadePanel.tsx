'use client'
// Ready-Made (General) product panel: variant selector + add-to-cart.
// Calls INTO the existing cart/checkout flow (useCartStore + cart drawer →
// Stripe / Paystack / M-Pesa). It does not rebuild any payment logic.
import { useState } from 'react'
import { ShoppingCart, Check, Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore, useUIStore } from '@/lib/store'
import {
  SIZES, COLOURWAYS, SPREADS, PRODUCT_TITLE, formatPrice, type NotebookSize, type Colourway,
} from './data'

interface Props {
  size: NotebookSize
  colour: Colourway
  onSizeChange: (s: NotebookSize) => void
  onColourChange: (c: Colourway) => void
}

export default function ReadyMadePanel({ size, colour, onSizeChange, onColourChange }: Props) {
  const addItem     = useCartStore((s) => s.addItem)
  const hasItem     = useCartStore((s) => s.hasItem)
  const setCartOpen = useUIStore((s) => s.setCartOpen)

  const [adding, setAdding] = useState(false)
  const [error,  setError]  = useState('')

  // One cart line per size + colourway combination.
  const variantId = `general-notebook-${size.id}-${colour.id}`
  const inCart    = hasItem(variantId)
  const coverSrc  = SPREADS.find((s) => s.cover)?.src ?? SPREADS[0].src

  const handleAddToCart = async () => {
    if (inCart || adding) return
    setError('')
    setAdding(true)
    try {
      addItem({
        id:        variantId,
        title:     `${PRODUCT_TITLE} — ${size.label}, ${colour.label}`,
        price:     size.price,
        thumbnail: coverSrc,
        slug:      'notebooks', // resolves to /shop/notebooks
      })
      toast.success('Added to cart ✦')
      setCartOpen(true)
    } catch {
      setError('Sorry — we could not add this to your cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-popular text-[10px]">Ready-Made</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--sage)' }}>
          <Zap size={12} /> Instant download
        </span>
      </div>

      <h3 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
        General Digital Notebook
      </h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
        A polished, ready-to-use notebook you can download and start writing in straight away — no waiting, no setup.
      </p>

      {/* Size selector */}
      <fieldset className="mb-5">
        <legend className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          Size
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Notebook size">
          {SIZES.map((s) => {
            const selected = s.id === size.id
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSizeChange(s)}
                title={s.note}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={
                  selected
                    ? { borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.1)', color: 'var(--text-primary)' }
                    : { borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }
                }
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Colourway selector */}
      <fieldset className="mb-6">
        <legend className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          Cover · <span style={{ color: 'var(--text-secondary)' }}>{colour.label}</span>
        </legend>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cover colourway">
          {COLOURWAYS.map((c) => {
            const selected = c.id === colour.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.label}
                onClick={() => onColourChange(c)}
                className="relative w-9 h-9 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.accent,
                  outline: selected ? '2px solid var(--gold)' : '1px solid var(--border)',
                  outlineOffset: '2px',
                }}
              >
                {selected && (
                  <Check
                    size={15}
                    className="absolute inset-0 m-auto"
                    style={{ color: '#2C2A35' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Price + CTA */}
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Price</span>
          <p className="font-display text-3xl leading-none" style={{ color: 'var(--text-primary)' }} aria-live="polite">
            {formatPrice(size.price)}
          </p>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {size.label} · {colour.label}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={adding || inCart}
        aria-busy={adding}
        className="btn-primary w-full justify-center"
        style={inCart ? { background: 'var(--sage)', boxShadow: 'none' } : undefined}
      >
        {adding ? (
          <><Loader2 size={16} className="animate-spin" /> Adding…</>
        ) : inCart ? (
          <><Check size={16} /> In cart</>
        ) : (
          <><ShoppingCart size={16} /> Add to cart — {formatPrice(size.price)}</>
        )}
      </button>

      {error && (
        <p role="alert" className="text-xs mt-2" style={{ color: '#C9847C' }}>{error}</p>
      )}

      <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        <Zap size={12} style={{ color: 'var(--gold)' }} />
        Download instantly after checkout · secure payment via Stripe, Paystack &amp; M-Pesa
      </p>
    </div>
  )
}
