/**
 * Lulu Print API driver — sandbox-first.
 * Docs: https://developers.lulu.com/api-reference
 *
 * All endpoint shapes verified against the Lulu sandbox API schema.
 * Switch LULU_API_BASE to https://api.lulu.com for production.
 */

import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { FulfillmentProvider, Address, PodLineItem, ShippingQuote, PrintJobStatus } from '../types'

const SANDBOX_BASE = 'https://api.sandbox.lulu.com'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let _tokenCache: TokenCache | null = null

async function getLuluToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 30_000) {
    return _tokenCache.accessToken
  }

  const key    = process.env.LULU_CLIENT_KEY!
  const secret = process.env.LULU_CLIENT_SECRET!
  const base   = process.env.LULU_API_BASE ?? SANDBOX_BASE

  const res = await fetch(`${base}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     key,
      client_secret: secret,
    }),
  })

  if (!res.ok) throw new Error(`Lulu auth failed: ${res.status} ${await res.text()}`)

  const data = await res.json()
  _tokenCache = {
    accessToken: data.access_token,
    expiresAt:   Date.now() + data.expires_in * 1000,
  }
  return _tokenCache.accessToken
}

async function luluFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base  = process.env.LULU_API_BASE ?? SANDBOX_BASE
  const token = await getLuluToken()
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...(init.headers ?? {}),
    },
  })
}

// Resolve print_product row → Lulu line-item shape
async function resolvePrintProductSpec(printProductId: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('print_products')
    .select('pod_package_id, interior_pdf_url, cover_pdf_url')
    .eq('id', printProductId)
    .single()
  if (error || !data) throw new Error(`print_product not found: ${printProductId}`)
  return data
}

function mapLuluStatus(raw: string): PrintJobStatus {
  const map: Record<string, PrintJobStatus> = {
    CREATED:        'submitted',
    UNPAID:         'submitted',
    PAYMENT_IN_PROGRESS: 'submitted',
    PRODUCTION_READY: 'accepted',
    PRODUCTION_DELAYED: 'accepted',
    IN_PRODUCTION:  'in_production',
    SHIPPED:        'shipped',
    DELIVERED:      'delivered',
    REJECTED:       'rejected',
    CANCELED:       'canceled',
    ERROR:          'error',
  }
  return map[raw] ?? 'error'
}

export class LuluProvider implements FulfillmentProvider {
  readonly id = 'lulu' as const

  async getShippingQuotes({ lineItems, shippingAddress }: {
    lineItems: PodLineItem[]
    shippingAddress: Address
  }): Promise<ShippingQuote[]> {
    const specs = await Promise.all(lineItems.map((li) => resolvePrintProductSpec(li.printProductId)))

    const body = {
      line_items: lineItems.map((li, i) => ({
        page_count:     1,       // Lulu requires page_count for cost calc; set per product in a real integration
        pod_package_id: specs[i].pod_package_id,
        quantity:       li.quantity,
      })),
      shipping_address: {
        name:         shippingAddress.name,
        street1:      shippingAddress.line1,
        street2:      shippingAddress.line2 ?? '',
        city:         shippingAddress.city,
        state_code:   shippingAddress.state ?? '',
        postcode:     shippingAddress.postalCode,
        country_code: shippingAddress.countryCode,
        phone_number: shippingAddress.phone ?? '',
        email:        shippingAddress.email,
      },
    }

    const res = await luluFetch('/shipping-options/', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`Lulu shipping quotes failed: ${res.status} ${await res.text()}`)

    const data = await res.json()

    return (data.shipping_options ?? []).map((opt: Record<string, unknown>) => {
      const costObj = opt.cost_excl_tax as Record<string, unknown> | undefined
      const costNum = costObj?.amount ? Math.round(parseFloat(String(costObj.amount)) * 100) : 0
      const currency = (costObj?.currency as string) ?? 'USD'
      const delivery = opt.estimated_shipping_dates as Record<string, unknown> | undefined
      const minDays  = parseInt(String(delivery?.min ?? '5'))
      const maxDays  = parseInt(String(delivery?.max ?? '14'))

      return {
        level:               opt.id as string,
        label:               opt.title as string ?? String(opt.id),
        cost:                costNum,
        currency,
        estDeliveryMinDays:  minDays,
        estDeliveryMaxDays:  maxDays,
      } satisfies ShippingQuote
    })
  }

  async createPrintJob({ externalId, lineItems, shippingAddress, shippingLevel }: {
    externalId: string
    lineItems: PodLineItem[]
    shippingAddress: Address
    shippingLevel: string
  }): Promise<{ providerJobId: string; status: PrintJobStatus }> {
    const specs = await Promise.all(lineItems.map((li) => resolvePrintProductSpec(li.printProductId)))

    const body = {
      external_id: externalId,
      contact_email: shippingAddress.email,
      shipping_level: shippingLevel,
      shipping_address: {
        name:         shippingAddress.name,
        street1:      shippingAddress.line1,
        street2:      shippingAddress.line2 ?? '',
        city:         shippingAddress.city,
        state_code:   shippingAddress.state ?? '',
        postcode:     shippingAddress.postalCode,
        country_code: shippingAddress.countryCode,
        phone_number: shippingAddress.phone ?? '',
        email:        shippingAddress.email,
      },
      line_items: lineItems.map((li, i) => ({
        external_id:    `${externalId}-${i}`,
        printable_normalization: {
          cover:    { source_url: specs[i].cover_pdf_url },
          interior: { source_url: specs[i].interior_pdf_url },
          pod_package_id: specs[i].pod_package_id,
        },
        quantity: li.quantity,
      })),
    }

    const res = await luluFetch('/print-jobs/', {
      method: 'POST',
      body:   JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Lulu createPrintJob failed: ${res.status} ${text}`)
    }

    const data = await res.json()
    return {
      providerJobId: String(data.id),
      status:        mapLuluStatus(data.status?.name ?? 'CREATED'),
    }
  }

  async getPrintJobStatus(providerJobId: string): Promise<{
    status: PrintJobStatus
    trackingUrl?: string
    trackingNumber?: string
  }> {
    const res = await luluFetch(`/print-jobs/${providerJobId}/`)
    if (!res.ok) throw new Error(`Lulu getPrintJobStatus failed: ${res.status}`)
    const data = await res.json()
    const tracking = (data.line_items ?? [])[0]?.tracking_id as string | undefined
    const trackingUrl = tracking ? `https://www.ups.com/track?tracknum=${tracking}` : undefined

    return {
      status:        mapLuluStatus(data.status?.name ?? 'ERROR'),
      trackingUrl,
      trackingNumber: tracking,
    }
  }

  async verifyAndParseWebhook(req: Request): Promise<
    | { valid: false }
    | { valid: true; providerJobId: string; status: PrintJobStatus; trackingUrl?: string; trackingNumber?: string }
  > {
    const secret = process.env.LULU_WEBHOOK_SECRET
    if (!secret) return { valid: false }

    const body      = await req.text()
    const signature = req.headers.get('x-hub-signature') ?? ''

    const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
    if (signature !== expected) return { valid: false }

    let payload: Record<string, unknown>
    try { payload = JSON.parse(body) } catch { return { valid: false } }

    const jobId    = String(payload.id ?? '')
    const rawStatus = (payload.status as Record<string, unknown>)?.name as string ?? ''
    const status   = mapLuluStatus(rawStatus)
    const tracking  = ((payload.line_items as unknown[])?.[0] as Record<string, unknown> | undefined)?.tracking_id as string | undefined

    return {
      valid: true,
      providerJobId:  jobId,
      status,
      trackingUrl:    tracking ? `https://www.ups.com/track?tracknum=${tracking}` : undefined,
      trackingNumber: tracking,
    }
  }

  async cancelPrintJob(providerJobId: string): Promise<void> {
    const res = await luluFetch(`/print-jobs/${providerJobId}/cancel/`, { method: 'POST' })
    if (!res.ok && res.status !== 404) {
      throw new Error(`Lulu cancelPrintJob failed: ${res.status}`)
    }
  }
}
