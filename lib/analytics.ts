// lib/analytics.ts — one client-side facade for GA4 (gtag) and the Meta Pixel
// (fbq). Every helper is a safe no-op when the tag isn't loaded (no ID set, or
// the visitor hasn't consented), so call sites never need to guard.
//
// GA4 runs in Consent Mode v2 (loaded always, cookieless until the visitor
// grants analytics consent — see ConsentedAnalytics). The Meta Pixel is only
// injected after marketing consent, so `window.fbq` existing IS the consent
// signal for client events.
//
// Server-side Meta Conversions API lives in lib/meta-capi.ts; pass the same
// eventId to both so Meta deduplicates the client + server copies.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

export interface ProductLike { id: string; title: string; price: number }

const gtag = (...args: unknown[]) => { try { window.gtag?.(...args) } catch { /* never break the UI */ } }
const fbq  = (...args: unknown[]) => { try { window.fbq?.(...args) } catch { /* never break the UI */ } }

/** Random id shared between the client Pixel event and the server CAPI event for dedup. */
export const newEventId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Meta browser identifiers (set by the pixel once marketing consent is granted). */
export function getFbIds(): { fbp: string | null; fbc: string | null } {
  try {
    const read = (name: string) =>
      document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? null
    return { fbp: read('_fbp'), fbc: read('_fbc') }
  } catch { return { fbp: null, fbc: null } }
}

/** Whether the visitor has granted marketing consent (mirrors ConsentProvider storage). */
export function hasMarketingConsent(): boolean {
  try { return JSON.parse(localStorage.getItem('arwign_consent_v1') ?? 'null')?.marketing === true } catch { return false }
}

// ── Standard e-commerce events (GA4 + Meta names side by side) ──────────────

export function trackViewContent(p: ProductLike) {
  gtag('event', 'view_item', { currency: 'USD', value: p.price, items: [{ item_id: p.id, item_name: p.title, price: p.price }] })
  fbq('track', 'ViewContent', { content_ids: [p.id], content_name: p.title, content_type: 'product', value: p.price, currency: 'USD' })
}

export function trackAddToCart(p: ProductLike) {
  gtag('event', 'add_to_cart', { currency: 'USD', value: p.price, items: [{ item_id: p.id, item_name: p.title, price: p.price }] })
  fbq('track', 'AddToCart', { content_ids: [p.id], content_name: p.title, content_type: 'product', value: p.price, currency: 'USD' })
}

export function trackInitiateCheckout(items: ProductLike[], total: number) {
  gtag('event', 'begin_checkout', { currency: 'USD', value: total, items: items.map((i) => ({ item_id: i.id, item_name: i.title, price: i.price })) })
  fbq('track', 'InitiateCheckout', { content_ids: items.map((i) => i.id), content_type: 'product', num_items: items.length, value: total, currency: 'USD' })
}

export function trackPurchase(opts: { orderId: string; total: number; items: ProductLike[]; eventId?: string }) {
  gtag('event', 'purchase', {
    transaction_id: opts.orderId, currency: 'USD', value: opts.total,
    items: opts.items.map((i) => ({ item_id: i.id, item_name: i.title, price: i.price })),
  })
  fbq('track', 'Purchase',
    { content_ids: opts.items.map((i) => i.id), content_type: 'product', value: opts.total, currency: 'USD' },
    opts.eventId ? { eventID: opts.eventId } : undefined)
}

export function trackLead(label?: string) {
  gtag('event', 'generate_lead', label ? { lead_source: label } : {})
  fbq('track', 'Lead', label ? { content_name: label } : {})
}

export function trackSearch(query: string) {
  gtag('event', 'search', { search_term: query })
  fbq('track', 'Search', { search_string: query })
}

/** Escape hatch for anything custom — fires on both tags with the same name. */
export function track(name: string, params?: Record<string, unknown>) {
  gtag('event', name, params ?? {})
  fbq('trackCustom', name, params ?? {})
}
