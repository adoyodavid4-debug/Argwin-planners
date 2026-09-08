'use client'
import { useEffect } from 'react'
import { sendGAEvent } from '@next/third-parties/google'

interface Item { product_id: string; title: string; price: number; quantity: number }

// Fires a GA4 `purchase` event once per order (deduped via sessionStorage).
// Google Ads imports this GA4 conversion, so campaigns can optimise for real sales.
export default function PurchaseTracking({
  id, value, currency, items,
}: { id: string; value: number; currency: string; items: Item[] }) {
  useEffect(() => {
    if (!id) return
    const key = `arwign_purchase_${id}`
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1') } catch {}
    sendGAEvent('event', 'purchase', {
      transaction_id: id,
      value,
      currency,
      items: items.map((i) => ({
        item_id: i.product_id,
        item_name: i.title,
        price: i.price,
        quantity: i.quantity,
      })),
    })
  }, [id, value, currency, items])
  return null
}
