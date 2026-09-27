'use client'

import { useEffect } from 'react'

// Records one "click" (a real open) for a product or blog post. Runs only in the
// browser on actual mount — so link prefetching and bots (no client JS) don't
// count — and dedupes per session so refreshes/back-navigation don't double-count.
export default function TrackView({ type, id }: { type: 'product' | 'blog'; id: string }) {
  useEffect(() => {
    if (!id) return
    const key = `av:seen:${type}:${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // sessionStorage unavailable (private mode / SSR guard) — still count once.
    }
    const body = JSON.stringify({ type, id })
    // sendBeacon survives the page being navigated away; fall back to fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/view', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/track/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  }, [type, id])

  return null
}
