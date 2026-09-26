// app/site/checkout/success/page.tsx
// Order confirmation: resolves the order from ?session_id= (Stripe) or
// ?order= (PayPal) and shows download buttons per digital product.
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Download } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SuccessPoller from './SuccessPoller'
import ClearCart from './ClearCart'
import PurchaseTracking from './PurchaseTracking'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order Confirmed — Arwign Planners',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAYMENT_LABELS: Record<string, string> = {
  stripe_card: 'Card',
  paypal:      'PayPal',
  apple_pay:   'Apple Pay',
  google_pay:  'Google Pay',
}

interface OrderRow {
  id:               string
  email:            string
  status:           string
  payment_method:   string | null
  amount_total:     number
  currency:         string | null
  invoice_number:   string | null
  download_tokens:  Record<string, string> | null
  downloads_expire: string | null
  created_at:       string
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; order?: string }
}) {
  const sessionId = searchParams.session_id?.trim()
  const orderId   = searchParams.order?.trim()

  const supabase = createServiceRoleClient()
  let order: OrderRow | null = null

  const SELECT = 'id, email, status, payment_method, amount_total, currency, invoice_number, download_tokens, downloads_expire, created_at'

  if (sessionId) {
    // The Stripe webhook stores the checkout session id in orders.metadata
    const { data } = await supabase
      .from('orders')
      .select(SELECT)
      .filter('metadata->>stripe_session_id', 'eq', sessionId)
      .limit(1)
    order = (data?.[0] as OrderRow | undefined) ?? null
  } else if (orderId && UUID_RE.test(orderId)) {
    const { data } = await supabase
      .from('orders')
      .select(SELECT)
      .eq('id', orderId)
      .maybeSingle()
    order = data as OrderRow | null
  }

  // No lookup parameters at all → nothing to show
  if (!sessionId && !orderId) {
    return (
      <div className="container-site py-24">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            No order found
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            We couldn&apos;t find an order to display. If you just paid, check your email for your receipt and download links.
          </p>
          <Link href="/shop" className="btn-primary text-sm">Back to Shop</Link>
        </div>
      </div>
    )
  }

  // Webhook hasn't landed yet (Stripe) or order still pending — poll
  if (!order || order.status === 'pending' || order.status === 'processing') {
    return (
      <div className="container-site py-24">
        <div
          className="max-w-md mx-auto rounded-2xl border p-10"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          <SuccessPoller />
        </div>
      </div>
    )
  }

  if (order.status === 'cancelled' || order.status === 'refunded') {
    return (
      <div className="container-site py-24">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            {order.status === 'cancelled' ? 'Order cancelled' : 'Order refunded'}
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            {order.status === 'cancelled'
              ? 'This payment was not completed. You have not been charged.'
              : 'This order has been refunded. Download links are no longer active.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/checkout" className="btn-primary text-sm">Try Again</Link>
            <Link href="/shop" className="btn-outline text-sm">Back to Shop</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Completed ───────────────────────────────────────────────
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, title, price, quantity')
    .eq('order_id', order.id)

  const tokens = order.download_tokens ?? {}
  const currency = (order.currency ?? 'USD').toUpperCase()
  const money = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
  const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Bundles are one order line but deliver several planners — expand them so the
  // customer gets a download link per included planner (tokens are keyed per
  // component product id by fulfilDigitalOrder).
  const { data: itemProducts } = await supabase
    .from('products')
    .select('id, is_bundle, bundle_items')
    .in('id', (items ?? []).map((i) => i.product_id))

  const bundleMap = new Map<string, string[]>()
  const componentIds = new Set<string>()
  ;(itemProducts ?? []).forEach((p) => {
    const comps = (p.bundle_items as string[] | null) ?? []
    if (p.is_bundle && comps.length) {
      bundleMap.set(p.id, comps)
      comps.forEach((c) => componentIds.add(c))
    }
  })

  const componentTitles = new Map<string, string>()
  if (componentIds.size) {
    const { data: comps } = await supabase.from('products').select('id, title').in('id', Array.from(componentIds))
    ;(comps ?? []).forEach((c) => componentTitles.set(c.id, c.title))
  }

  const downloadsFor = (productId: string, fallbackTitle: string) => {
    const comps = bundleMap.get(productId)
    if (comps) {
      const compDownloads = comps
        .map((pid) => ({ pid, title: componentTitles.get(pid) ?? fallbackTitle, token: tokens[pid] }))
        .filter((d) => d.token)
      if (compDownloads.length) return compDownloads
      // Legacy bundle orders (fulfilled before bundle expansion) hold a single
      // token keyed by the bundle product itself — fall through so it renders.
    }
    const token = tokens[productId]
    return token ? [{ pid: productId, title: fallbackTitle, token }] : []
  }

  return (
    <div className="container-site py-12 md:py-16">
      <ClearCart />
      {/* GA4 `purchase` conversion. PayPal already fires it client-side in its
          onApprove handler, so skip it here for PayPal to avoid double-counting;
          this covers Paystack (and any other redirect-based method). */}
      {order.payment_method !== 'paypal' && (
        <PurchaseTracking
          id={order.id}
          value={order.amount_total}
          currency={currency}
          items={(items ?? []).map((i) => ({ product_id: i.product_id, title: i.title, price: i.price, quantity: i.quantity }))}
        />
      )}
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(var(--gold-rgb),0.12)' }}
          >
            <CheckCircle2 size={32} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
            Thank you for your order!
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            A receipt with your download links has been sent to <strong>{order.email}</strong>
          </p>
        </div>

        {/* Order card */}
        <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-6 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Invoice</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                {order.invoice_number ?? order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>{orderDate}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Paid with</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                {PAYMENT_LABELS[order.payment_method ?? ''] ?? 'Card'}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {(items ?? []).map((item) => {
                const downloads = downloadsFor(item.product_id, item.title)
                // Show the per-planner box only when tokens actually expanded to
                // components; legacy bundle orders fall back to a single
                // bundle-keyed token and render the plain button instead.
                const isBundleLine =
                  bundleMap.has(item.product_id) &&
                  downloads.length > 0 &&
                  downloads[0].pid !== item.product_id
                return (
                  <div key={item.product_id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                          {item.title}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {money(item.price * item.quantity)}
                        </p>
                      </div>
                      {!isBundleLine && downloads[0] && (
                        <a
                          href={`/api/download/${downloads[0].token}`}
                          className="btn-primary text-xs flex-shrink-0"
                          style={{ padding: '0.55rem 1rem' }}
                        >
                          <Download size={13} /> Download
                        </a>
                      )}
                    </div>
                    {isBundleLine && downloads.length > 0 && (
                      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                        <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                          {downloads.length} planners included
                        </p>
                        {downloads.map((d) => (
                          <div key={d.pid} className="flex items-center gap-3">
                            <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</span>
                            <a
                              href={`/api/download/${d.token}`}
                              className="btn-primary text-xs flex-shrink-0"
                              style={{ padding: '0.45rem 0.9rem' }}
                            >
                              <Download size={13} /> Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between font-bold text-base mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--gold)' }}>{money(order.amount_total)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
          Download links are valid for 12 months. Need help?{' '}
          <a href="mailto:support@arwignplanners.com" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a>
        </p>

        <div className="flex justify-center gap-3 flex-wrap">
          <Link href={`/receipt/${order.id}`} className="btn-primary text-sm">View &amp; print receipt</Link>
          <Link href="/shop" className="btn-outline text-sm">Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
