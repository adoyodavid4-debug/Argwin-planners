// app/receipt/[id]/page.tsx
// A clean, printable receipt for a digital order, reachable by the order's
// unguessable UUID (a "capability URL", like Stripe receipts). No store chrome,
// so it prints / saves-as-PDF cleanly. Never indexed.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ReceiptActions from './ReceiptActions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Receipt — Arwign Planners',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAYMENT_LABELS: Record<string, string> = {
  stripe_card: 'Card', paypal: 'PayPal', pesapal: 'Card',
  paystack: 'Paystack', apple_pay: 'Apple Pay', google_pay: 'Google Pay',
}

// Fixed light palette so the receipt always prints clean (ink-friendly),
// regardless of the site theme.
const C = { bg: '#FAF8F4', card: '#fff', ink: '#1A1820', muted: '#8A8578', gold: '#C9A84C', border: '#E8E4DB' }

interface OrderRow {
  id: string; email: string; invoice_number: string | null; created_at: string
  status: string; payment_method: string | null
  amount_subtotal: number; amount_discount: number; amount_total: number
  currency: string | null; coupon_code: string | null
}

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const id = params.id?.trim()
  if (!id || !UUID_RE.test(id)) notFound()

  const supabase = createServiceRoleClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, email, invoice_number, created_at, status, payment_method, amount_subtotal, amount_discount, amount_total, currency, coupon_code')
    .eq('id', id)
    .maybeSingle()

  if (!order) notFound()
  const o = order as OrderRow

  const currency = (o.currency ?? 'USD').toUpperCase()
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
  const orderDate = new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  // A receipt only exists for a settled payment.
  if (o.status !== 'completed' && o.status !== 'refunded') {
    return (
      <main style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: 'var(--nf-jost), sans-serif' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: C.gold }}>ARWIGN PLANNERS</p>
          <h1 style={{ margin: '16px 0 8px' }}>Receipt not available yet</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>This order isn’t marked as paid. If you’ve just paid, please check back in a moment or see your confirmation email.</p>
          <p style={{ marginTop: 24 }}><Link href="/shop" style={{ color: C.gold }}>Back to shop</Link></p>
        </div>
      </main>
    )
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('title, price, quantity')
    .eq('order_id', id)

  const rows = (items ?? []) as { title: string; price: number; quantity: number }[]
  const refunded = o.status === 'refunded'
  const hasDiscount = (o.amount_discount ?? 0) > 0

  return (
    <main style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: 'var(--nf-jost), sans-serif' }}>
      {/* Ink-friendly print: white page, no toolbar */}
      <style>{`@media print { body { background:#fff !important; } .no-print { display:none !important; } @page { margin: 16mm; } }`}</style>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        <ReceiptActions downloadHref={`/checkout/success?order=${o.id}`} pdfHref={`/receipt/${o.id}/pdf`} />

        {/* Receipt document */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '40px', boxShadow: '0 8px 30px rgba(44,42,53,0.06)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Arwign Planners" style={{ height: 36, width: 'auto', display: 'block' }} />
              <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 0' }}>arwignplanners.com</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: 26, margin: 0, color: C.ink }}>Receipt</h1>
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, color: '#fff', background: refunded ? '#B4553E' : '#4E7A5A' }}>
                {refunded ? 'REFUNDED' : 'PAID'}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, margin: '28px 0', padding: '18px 20px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div><p style={m.k}>Invoice number</p><p style={m.v}>{o.invoice_number ?? o.id.slice(0, 8).toUpperCase()}</p></div>
            <div><p style={m.k}>Date</p><p style={m.v}>{orderDate}</p></div>
            <div><p style={m.k}>Paid with</p><p style={m.v}>{PAYMENT_LABELS[o.payment_method ?? ''] ?? 'Card'}</p></div>
            <div><p style={m.k}>Billed to</p><p style={m.v}>{o.email}</p></div>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Description</th>
                <th style={{ ...th, textAlign: 'center', width: 60 }}>Qty</th>
                <th style={{ ...th, textAlign: 'right', width: 110 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'left' }}>{it.title}</td>
                  <td style={{ ...td, textAlign: 'center', color: C.muted }}>{it.quantity}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{money(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ marginTop: 8, marginLeft: 'auto', width: 'min(100%, 280px)' }}>
            <Row label="Subtotal" value={money(o.amount_subtotal ?? o.amount_total)} />
            {hasDiscount && <Row label={`Discount${o.coupon_code ? ` (${o.coupon_code})` : ''}`} value={`− ${money(o.amount_discount)}`} accent />}
            <p style={{ fontSize: 11, color: C.muted, textAlign: 'right', margin: '6px 0 0' }}>Digital goods — no tax applied</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: `2px solid ${C.border}` }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: C.gold }}>{money(o.amount_total)} {currency}</span>
            </div>
          </div>

          {/* Delivery note + seller */}
          <p style={{ fontSize: 13, color: C.muted, marginTop: 28, lineHeight: 1.6 }}>
            Digital delivery — your download links were sent to <strong style={{ color: C.ink }}>{o.email}</strong> and are saved to your account. Links remain valid for 12 months.
          </p>
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <strong style={{ color: C.ink }}>Arwign Planners</strong> · Premium digital &amp; printable planners<br />
            Questions about this receipt? <a href="mailto:support@arwignplanners.com" style={{ color: C.gold }}>support@arwignplanners.com</a><br />
            See our <a href="/refund" style={{ color: C.gold }}>refund policy</a>.
          </div>
        </div>

        <p className="no-print" style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20 }}>
          Keep this receipt for your records. Use “Print / Save as PDF” above to download a copy.
        </p>
      </div>
    </main>
  )
}

const m = {
  k: { fontSize: 11, color: C.muted, margin: '0 0 3px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  v: { fontSize: 14, fontWeight: 700, margin: 0, color: C.ink, wordBreak: 'break-word' as const },
}
const th = { fontSize: 11, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: '0 0 10px', borderBottom: `2px solid ${C.border}` }
const td = { fontSize: 14, padding: '12px 0', borderBottom: `1px solid ${C.border}`, color: C.ink }

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: accent ? '#4E7A5A' : C.ink }}>{value}</span>
    </div>
  )
}
