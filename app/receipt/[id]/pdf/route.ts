// app/receipt/[id]/pdf/route.ts — streams a PDF receipt for a paid order,
// reachable by the order's UUID (same capability-URL model as the receipt page).
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getReceipt, receiptView } from '@/lib/receipt'
import { renderReceiptPdf } from '@/lib/receipt-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient()
  const receipt = await getReceipt(supabase, params.id)
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const v = receiptView(receipt.order)
  if (!v.paid) return NextResponse.json({ error: 'Receipt not available' }, { status: 404 })

  let pdf: Buffer
  try {
    pdf = await renderReceiptPdf(receipt)
  } catch (err) {
    console.error('[receipt/pdf] render failed', err)
    return NextResponse.json({ error: 'Could not generate receipt' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Arwign-Receipt-${v.invoice}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
