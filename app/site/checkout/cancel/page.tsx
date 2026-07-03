// app/site/checkout/cancel/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Checkout Cancelled — Arwign Planners',
  robots: { index: false, follow: false },
}

export default function CheckoutCancelPage() {
  return (
    <div className="container-site py-24">
      <div className="max-w-md mx-auto text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <ShoppingBag size={26} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
          Checkout cancelled
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          No worries — you haven&apos;t been charged and your cart is exactly as you left it.
          Ready when you are.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/checkout" className="btn-primary text-sm">Return to Checkout</Link>
          <Link href="/shop" className="btn-outline text-sm">Back to Shop</Link>
        </div>
      </div>
    </div>
  )
}
