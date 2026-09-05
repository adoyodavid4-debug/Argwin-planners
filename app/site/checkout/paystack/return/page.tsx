// app/site/checkout/paystack/return/page.tsx
// Paystack redirects the customer's browser here after they finish (or cancel)
// paying on the hosted Paystack page. We actively verify the transaction here
// as a fast-path safety net in case the async webhook hasn't landed yet, then
// hand off to the existing generic success page.
// Mirrors app/site/checkout/pesapal/return/page.tsx.
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyAndFulfilPaystackOrder } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PaystackReturnPage({
  searchParams,
}: {
  // Paystack appends ?reference=&trxref= ; we also set ?order= ourselves.
  searchParams: { order?: string; reference?: string; trxref?: string }
}) {
  const ref = (searchParams.order ?? searchParams.reference ?? searchParams.trxref)?.trim()

  if (ref && UUID_RE.test(ref)) {
    try {
      const supabase = createServiceRoleClient()
      await verifyAndFulfilPaystackOrder(supabase, ref)
    } catch (err) {
      console.error('[paystack/return]', err)
    }
    redirect(`/checkout/success?order=${ref}`)
  }

  redirect('/checkout')
}
