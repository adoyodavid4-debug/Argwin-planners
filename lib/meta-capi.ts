// lib/meta-capi.ts — Meta Conversions API (server-side events). Complements the
// browser pixel: server events survive ad blockers and iOS tracking limits, and
// Meta deduplicates against the pixel copy via event_id (pass the SAME id the
// client used — see lib/analytics.ts newEventId).
//
// Config (both required, else every call is a silent no-op):
//   NEXT_PUBLIC_FB_PIXEL_ID   numeric pixel id (shared with the browser pixel)
//   META_CAPI_ACCESS_TOKEN    system-user token from Meta Events Manager →
//                             Settings → Conversions API → Generate access token
//
// Consent: callers must only pass user identifiers for visitors who granted
// marketing consent (the checkout client sends its consent flag along).
// Never throws — ad reporting must not break checkout.

import { createHash } from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
const TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const API = 'https://graph.facebook.com/v21.0'

export function metaCapiConfigured(): boolean {
  return !!(PIXEL_ID && /^\d{6,}$/.test(PIXEL_ID) && TOKEN)
}

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

export interface CapiUserData {
  email?: string | null      // hashed before sending
  fbp?: string | null        // _fbp cookie from the browser
  fbc?: string | null        // _fbc cookie (click id) from the browser
  clientIp?: string | null
  userAgent?: string | null
}

export interface CapiEvent {
  eventName: 'Purchase' | 'Lead' | 'InitiateCheckout' | 'ViewContent' | 'AddToCart' | string
  eventId: string            // must match the client pixel eventID for dedup
  eventSourceUrl?: string
  user: CapiUserData
  value?: number
  currency?: string
  contentIds?: string[]
}

export async function sendMetaEvent(ev: CapiEvent): Promise<void> {
  if (!metaCapiConfigured()) return
  try {
    const user_data: Record<string, unknown> = {}
    if (ev.user.email) user_data.em = [sha256(ev.user.email)]
    if (ev.user.fbp) user_data.fbp = ev.user.fbp
    if (ev.user.fbc) user_data.fbc = ev.user.fbc
    if (ev.user.clientIp) user_data.client_ip_address = ev.user.clientIp
    if (ev.user.userAgent) user_data.client_user_agent = ev.user.userAgent

    const body = {
      data: [{
        event_name: ev.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: 'website',
        ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
        user_data,
        ...(ev.value != null ? {
          custom_data: {
            value: ev.value,
            currency: ev.currency ?? 'USD',
            ...(ev.contentIds?.length ? { content_ids: ev.contentIds, content_type: 'product' } : {}),
          },
        } : {}),
      }],
    }

    const res = await fetch(`${API}/${PIXEL_ID}/events?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[meta-capi]', ev.eventName, res.status, (err as any)?.error?.message ?? '')
    }
  } catch (e) {
    console.error('[meta-capi] send failed', e)
  }
}
