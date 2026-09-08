'use client'
// Cookie-consent state for UK GDPR / PECR compliance: non-essential tags (GA4,
// Meta Pixel) MUST NOT run until the visitor actively opts in. This provider
// holds the decision, persists it to localStorage, and — when consent is
// withdrawn — purges known tracking cookies and reloads so already-injected
// tags stop firing. Essential cookies (cart, auth, this consent record) are
// always allowed and are never gated here.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface ConsentState {
  analytics: boolean // GA4
  marketing: boolean // Meta/Facebook Pixel
}

const DEFAULT: ConsentState = { analytics: false, marketing: false }
const STORAGE_KEY = 'arwign_consent_v1'

interface ConsentContextValue {
  ready: boolean       // hydrated from storage (client-only)
  decided: boolean     // a choice has been stored
  bannerOpen: boolean  // manually reopened (e.g. from "Cookie settings")
  consent: ConsentState
  save: (next: ConsentState) => void
  acceptAll: () => void
  rejectAll: () => void
  openPreferences: () => void
  closeBanner: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

function readStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p?.analytics !== 'boolean' || typeof p?.marketing !== 'boolean') return null
    return { analytics: p.analytics, marketing: p.marketing }
  } catch {
    return null
  }
}

// Best-effort removal of the third-party cookies GA4 / Meta Pixel set, across
// the host and its registrable domain, when a category is switched off.
function clearTrackingCookies() {
  const existing = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean)
  const targets = new Set<string>(['_ga', '_gid', '_gat', '_fbp', '_fbc'])
  for (const name of existing) {
    if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat') || name.startsWith('_fb')) targets.add(name)
  }
  const host = location.hostname
  const registrable = host.split('.').slice(-2).join('.')
  const domains = [undefined, host, `.${host}`, `.${registrable}`]
  for (const name of Array.from(targets)) {
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [decided, setDecided] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [consent, setConsent] = useState<ConsentState>(DEFAULT)

  useEffect(() => {
    const stored = readStored()
    if (stored) {
      setConsent(stored)
      setDecided(true)
    }
    setReady(true)
  }, [])

  const save = useCallback((next: ConsentState) => {
    setConsent((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, ts: Date.now(), v: 1 }))
      } catch { /* storage blocked — session-only consent */ }
      // Withdrawing a previously-granted category: stop the tags that are already
      // running by clearing their cookies and reloading.
      const withdrew = (prev.analytics && !next.analytics) || (prev.marketing && !next.marketing)
      if (withdrew) {
        clearTrackingCookies()
        setTimeout(() => location.reload(), 80)
      }
      return next
    })
    setDecided(true)
    setBannerOpen(false)
  }, [])

  const value: ConsentContextValue = {
    ready,
    decided,
    bannerOpen,
    consent,
    save,
    acceptAll: () => save({ analytics: true, marketing: true }),
    rejectAll: () => save({ analytics: false, marketing: false }),
    openPreferences: () => setBannerOpen(true),
    closeBanner: () => setBannerOpen(false),
  }

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within <ConsentProvider>')
  return ctx
}
