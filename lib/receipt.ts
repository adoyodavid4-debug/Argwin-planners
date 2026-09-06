// lib/receipt.ts — shared receipt data + formatting, used by the receipt page,
// the PDF route, and the email attachment so they never drift.
import type { SupabaseClient } from '@supabase/supabase-js'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const PAYMENT_LABELS: Record<string, string> = {
  stripe_card: 'Card', paypal: 'PayPal', pesapal: 'Card',
  paystack: 'Paystack', apple_pay: 'Apple Pay', google_pay: 'Google Pay',
}

// Fixed, ink-friendly palette so the receipt looks the same on screen, in
// print, and in the PDF regardless of the site theme.
export const RC = { bg: '#FAF8F4', card: '#ffffff', ink: '#1A1820', muted: '#8A8578', gold: '#C9A84C', border: '#E8E4DB', green: '#4E7A5A', danger: '#B4553E' }

export interface ReceiptOrder {
  id: string; email: string; invoice_number: string | null; created_at: string
  status: string; payment_method: string | null
  amount_subtotal: number; amount_discount: number; amount_total: number
  currency: string | null; coupon_code: string | null
}
export interface ReceiptItem { title: string; price: number; quantity: number }
export interface Receipt { order: ReceiptOrder; items: ReceiptItem[] }

export async function getReceipt(supabase: SupabaseClient, id: string): Promise<Receipt | null> {
  if (!id || !UUID_RE.test(id)) return null
  const { data: order } = await supabase
    .from('orders')
    .select('id, email, invoice_number, created_at, status, payment_method, amount_subtotal, amount_discount, amount_total, currency, coupon_code')
    .eq('id', id)
    .maybeSingle()
  if (!order) return null
  const { data: items } = await supabase
    .from('order_items')
    .select('title, price, quantity')
    .eq('order_id', id)
  return { order: order as ReceiptOrder, items: (items ?? []) as ReceiptItem[] }
}

// Derived display fields shared by every renderer.
export function receiptView(o: ReceiptOrder) {
  const currency = (o.currency ?? 'USD').toUpperCase()
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
  return {
    currency,
    money,
    invoice: o.invoice_number ?? o.id.slice(0, 8).toUpperCase(),
    date: new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
    payment: PAYMENT_LABELS[o.payment_method ?? ''] ?? 'Card',
    paid: o.status === 'completed' || o.status === 'refunded',
    refunded: o.status === 'refunded',
    hasDiscount: (o.amount_discount ?? 0) > 0,
  }
}
