// app/api/download/[token]/route.ts
// Secure download delivery: resolves the order owning the token, validates
// expiry, signs a 10-minute URL on the private 'product-files' bucket and
// 302-redirects to it.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { incrementDownloadCount } from '@/lib/orders'

export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL = 600 // 10 minutes

type PlannerFile = { url: string; size_mb?: number; name?: string }

function errorPage(status: number, title: string, message: string) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title} — Arwign Planners</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="max-width:420px;background:#fff;border:1px solid #E8E4DB;border-radius:12px;padding:40px;text-align:center">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
<p style="color:#666;font-size:14px;margin:0 0 24px">${message}</p>
<a href="mailto:support@arwignplanners.com" style="color:#C9A84C">support@arwignplanners.com</a>
</div></body></html>`
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

// planner_files.url may be a storage path (new uploads) or a full URL (legacy).
// Normalise both to a bucket-relative path for createSignedUrl.
function toStoragePath(url: string): string | null {
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, '')
  const match = url.match(/\/product-files\/(.+?)(?:\?|$)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token?.trim()
  if (!token) return errorPage(400, 'Invalid link', 'This download link is not valid.')

  const supabase = createServiceRoleClient()

  // Tokens are `<orderId>.<uuid>` — resolve the order by primary key.
  // Fall back to a bounded scan for any legacy plain-uuid tokens.
  let order: { id: string; status: string; download_tokens: Record<string, string> | null; downloads_expire: string | null } | null = null

  const dotIndex = token.indexOf('.')
  if (dotIndex > 0) {
    const orderId = token.slice(0, dotIndex)
    const { data } = await supabase
      .from('orders')
      .select('id, status, download_tokens, downloads_expire')
      .eq('id', orderId)
      .maybeSingle()
    order = data
  } else {
    const { data: candidates } = await supabase
      .from('orders')
      .select('id, status, download_tokens, downloads_expire')
      .not('download_tokens', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000)
    order = candidates?.find((o) =>
      Object.values((o.download_tokens as Record<string, string>) ?? {}).includes(token)
    ) ?? null
  }

  const tokens = (order?.download_tokens as Record<string, string> | null) ?? {}
  const productId = Object.keys(tokens).find((pid) => tokens[pid] === token)

  if (!order || !productId) {
    return errorPage(404, 'Download not found', 'We could not find this download. Please check the link in your order confirmation email.')
  }
  if (order.status !== 'completed') {
    return errorPage(403, 'Order not completed', 'This order has not been completed yet. If you have just paid, please wait a moment and try again.')
  }
  if (order.downloads_expire && new Date(order.downloads_expire) < new Date()) {
    return errorPage(410, 'Link expired', 'This download link has expired (links are valid for 12 months). Contact support and we will sort you out.')
  }

  // Resolve the product file — prefer A4, then A5, then US Letter, then legacy file_url
  const { data: product } = await supabase
    .from('products')
    .select('id, title, planner_files, file_url')
    .eq('id', productId)
    .single()

  if (!product) {
    return errorPage(404, 'Product not found', 'This product is no longer available. Contact support and we will help.')
  }

  const pf = (product.planner_files ?? {}) as Record<string, PlannerFile>
  const rawUrl = pf.a4?.url ?? pf.a5?.url ?? pf.us_letter?.url ?? product.file_url ?? null
  const path = rawUrl ? toStoragePath(rawUrl) : null

  if (!path) {
    console.error('[download] no file for product', productId, rawUrl)
    return errorPage(404, 'File unavailable', 'The file for this product could not be located. Contact support and we will send it to you directly.')
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('product-files')
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (signErr || !signed?.signedUrl) {
    console.error('[download] signed URL failed:', path, signErr)
    return errorPage(500, 'Something went wrong', 'We could not prepare your download. Please try again in a minute.')
  }

  // Best-effort download counter — never block the download on it
  try {
    await incrementDownloadCount(supabase, productId)
  } catch (err) {
    console.warn('[download] count increment failed:', err)
  }

  return NextResponse.redirect(signed.signedUrl, 302)
}
