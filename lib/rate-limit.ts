// lib/rate-limit.ts — in-memory per-IP rate limiting shared across API routes.
//
// Call makeRateLimiter() once at module scope (NOT inside the handler) so the
// Map persists across requests on the same serverless instance. Each Vercel
// instance has its own copy — limits are approximate deterrence, not hard
// fleet-wide caps. Upgrade to Upstash Redis for strict enforcement.
//
// Returns true when the caller should respond 429.

import type { NextRequest } from 'next/server'

interface Entry { count: number; reset: number }

// The caller's IP from Vercel's edge headers, for use as a rate-limit key.
// x-forwarded-for is a client-controlled header, but on Vercel the platform
// overwrites it with the real edge IP, so the first entry is trustworthy.
export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function makeRateLimiter(maxPerWindow: number, windowMs: number) {
  const store = new Map<string, Entry>()
  return function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = store.get(ip)
    if (!entry || now > entry.reset) {
      store.set(ip, { count: 1, reset: now + windowMs })
      return false
    }
    if (entry.count >= maxPerWindow) return true
    entry.count++
    return false
  }
}
