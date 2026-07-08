import type { Metadata } from 'next'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Order Status — Arwign Planners', robots: { index: false, follow: false } }

const STATUS_LABELS: Record<string, { label: string; desc: string; step: number }> = {
  pending_review: { label: 'Pending Review',    desc: 'Your order is being reviewed before printing.',              step: 1 },
  submitted:      { label: 'Submitted',          desc: 'Sent to our print partner.',                                 step: 2 },
  accepted:       { label: 'Accepted',           desc: 'Print partner has accepted the job.',                        step: 2 },
  in_production:  { label: 'In Production',      desc: 'Your notebook is being printed.',                           step: 3 },
  shipped:        { label: 'Shipped',            desc: 'On its way to you!',                                         step: 4 },
  delivered:      { label: 'Delivered',          desc: 'Your notebook has arrived.',                                 step: 5 },
  rejected:       { label: 'Rejected',           desc: 'There was an issue with your order. Contact support.',       step: 0 },
  canceled:       { label: 'Canceled',           desc: 'This order has been canceled.',                              step: 0 },
  error:          { label: 'Error',              desc: 'There was a technical issue. Our team has been notified.',   step: 0 },
}

const STEPS = ['Ordered', 'Submitted', 'In Production', 'Shipped', 'Delivered']

export default async function OrderStatusPage({ params }: { params: { id: string } }) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect(`/auth/login?next=/order/${params.id}`)

  const supabase = createServiceRoleClient()
  const { data: po, error } = await supabase
    .from('physical_orders')
    .select('id, order_id, fulfillment_status, tracking_url, tracking_number, failure_reason, created_at, shipping_address, currency, total')
    .eq('id', params.id)
    .single()

  if (error || !po) notFound()

  // Verify the order belongs to this user
  const { data: order } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', (po as unknown as { order_id: string }).order_id ?? '')
    .single()

  if (!order || order.user_id !== user.id) notFound()

  const meta   = STATUS_LABELS[po.fulfillment_status] ?? STATUS_LABELS.pending_review
  const addr   = po.shipping_address as Record<string, string> | null
  const isError = ['rejected','canceled','error'].includes(po.fulfillment_status)

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Order Status</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Ordered on {new Date(po.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        {po.total != null && ` · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: po.currency ?? 'USD' }).format(po.total / 100)}`}
      </p>

      {/* Progress stepper */}
      {!isError && (
        <div className="flex items-center gap-0 mb-10 overflow-x-auto">
          {STEPS.map((step, i) => {
            const stepNum = i + 1
            const done    = stepNum < meta.step
            const current = stepNum === meta.step
            return (
              <div key={step} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                    ${done ? 'bg-green-500 text-white' : current ? 'bg-[#A0830E] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span className={`text-xs text-center ${current ? 'font-semibold text-[#A0830E]' : 'text-[var(--text-muted)]'}`}>{step}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${done ? 'bg-green-400' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-2xl border p-6 mb-6 ${isError ? 'border-red-200 bg-red-50' : 'border-[var(--border)] bg-[var(--bg-card)]'}`}>
        <p className="text-lg font-semibold mb-1">{meta.label}</p>
        <p className="text-[var(--text-muted)] text-sm">{meta.desc}</p>
        {po.failure_reason && <p className="text-red-600 text-sm mt-2">Details: {po.failure_reason}</p>}
      </div>

      {/* Tracking */}
      {po.tracking_url && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
          <p className="font-semibold mb-2">Tracking</p>
          {po.tracking_number && <p className="text-sm text-[var(--text-muted)] mb-3">Number: <span className="font-mono">{po.tracking_number}</span></p>}
          <a href={po.tracking_url} target="_blank" rel="noopener"
            className="inline-block rounded-lg bg-[#A0830E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8963e]">
            Track my order →
          </a>
        </div>
      )}

      {/* Shipping address */}
      {addr && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <p className="font-semibold mb-2">Shipping Address</p>
          <address className="not-italic text-sm text-[var(--text-muted)] space-y-0.5">
            <p>{addr.name}</p>
            <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
            <p>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}</p>
            <p>{addr.countryCode}</p>
          </address>
        </div>
      )}

      <p className="mt-8 text-sm text-[var(--text-muted)] text-center">
        Questions? <a href="mailto:support@arwignplanners.com" className="text-[#A0830E] hover:underline">support@arwignplanners.com</a>
      </p>
    </main>
  )
}
