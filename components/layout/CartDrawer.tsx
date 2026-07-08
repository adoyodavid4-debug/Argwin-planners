'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { X, ShoppingCart, Trash2, ArrowRight, Lock } from 'lucide-react'
import { useCartStore, useUIStore } from '@/lib/store'

export default function CartDrawer() {
  const { cartOpen, setCartOpen } = useUIStore()
  const { items, removeItem, total } = useCartStore()

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{  opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} style={{ color: 'var(--gold)' }} />
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
              Your Cart
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                  ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>
          <button onClick={() => setCartOpen(false)} className="btn-ghost" aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <ShoppingCart size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your cart is empty</p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Discover our premium digital planner collection
                </p>
                <Link href="/shop" className="btn-primary text-sm" onClick={() => setCartOpen(false)}>
                  Shop Now
                </Link>
              </motion.div>
            ) : (
              items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{  opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-4 p-3 rounded-2xl border"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                >
                  <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={item.thumbnail || '/placeholder-planner.jpg'}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/shop/${item.slug}`}
                      className="text-sm font-semibold line-clamp-2 hover:underline"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                      onClick={() => setCartOpen(false)}
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Instant Digital Download</p>
                    <p className="font-bold mt-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="self-start p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={`Remove ${item.title} from cart`}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>${total().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--gold)' }}>${total().toFixed(2)}</span>
                </div>
              </div>

              {/* Stripe / card checkout */}
              <Link
                href="/checkout"
                className="btn-primary w-full justify-center text-sm"
                onClick={() => setCartOpen(false)}
              >
                Secure Checkout
                <ArrowRight size={15} />
              </Link>

              {/* Trust */}
              <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Lock size={11} />
                256-bit SSL encrypted · Instant download after payment
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  )
}
