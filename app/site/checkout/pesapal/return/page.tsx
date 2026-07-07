// app/site/checkout/pesapal/return/page.tsx
// PesaPal redirects the customer's browser here after they finish (or cancel)
// paying on the hosted PesaPal page. We actively verify the transaction
// status here as a safety net in case the async IPN hasn't landed yet, then
// hand off to the existing generic success page (which polls + shows
// downloads for every payment method).
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyAndFulfilPesapalOrder } from '@/lib/pesapal'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PesapalReturnPage({
  searchParams,
}: {
  searchParams: { order?: string }
}) {
  const orderId = searchParams.order?.trim()

  if (orderId && UUID_RE.test(orderId)) {
    try {
      const supabase = createServiceRoleClient()
      await verifyAndFulfilPesapalOrder(supabase, orderId)
    } catch (err) {
      console.error('[pesapal/return]', err)
    }
    redirect(`/checkout/success?order=${orderId}`)
  }

  redirect('/checkout')
}
