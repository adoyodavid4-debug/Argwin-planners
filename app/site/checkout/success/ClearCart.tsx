'use client'
import { useEffect } from 'react'
import { useCartStore } from '@/lib/store'

// After a Stripe redirect the persisted cart still holds the purchased items —
// clear it once the order is confirmed. Renders nothing.
export default function ClearCart() {
  const clearCart = useCartStore((s) => s.clearCart)
  useEffect(() => { clearCart() }, [clearCart])
  return null
}
