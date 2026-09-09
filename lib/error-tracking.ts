// lib/error-tracking.ts — lightweight production error capture without a paid
// SaaS (Sentry et al). Persists every reported error to the `error_events`
// table (service role, so it works from any API route / cron) and, for the
// first occurrence of a given error in a cooldown window, emails ADMIN_EMAIL so
// failures surface without trawling Vercel logs.
//
// Fire-and-forget: captureError NEVER throws and NEVER rejects — a logging
// failure must not turn a handled error into an unhandled one. Await it if you
// can, but `void captureError(...)` is fine in hot paths.

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEmailProvider } from '@/lib/email'

interface CaptureContext {
  // Where it happened, e.g. 'api/paypal/capture' — used for grouping + alert subject.
  source: string
  // Extra structured context (order id, user id, etc). Kept small; stored as JSON.
  extra?: Record<string, unknown>
  // Alert even on repeats within the cooldown (default false → dedupe alerts).
  alwaysAlert?: boolean
}

// Don't email more than once per (source+message) within this window; the row
// is still written every time, so no data is lost — only the email is throttled.
const ALERT_COOLDOWN_MS = 15 * 60_000
const recentAlerts = new Map<string, number>()

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return String(err) }
}

export async function captureError(err: unknown, ctx: CaptureContext): Promise<void> {
  try {
    const message = messageOf(err).slice(0, 1000)
    const stack = err instanceof Error ? err.stack?.slice(0, 4000) ?? null : null

    // Always log to Vercel too, so it's greppable even if the DB write fails.
    console.error(`[${ctx.source}]`, message, ctx.extra ?? '')

    // Persist best-effort. Isolated so a missing table / DB hiccup still lets the
    // email alert below fire (the table lands via migration 026).
    try {
      const supabase = createServiceRoleClient()
      await supabase.from('error_events').insert({
        source: ctx.source,
        message,
        stack,
        context: ctx.extra ?? {},
      })
    } catch { /* DB persistence is best-effort */ }

    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) return

    const dedupeKey = `${ctx.source}:${message}`
    const last = recentAlerts.get(dedupeKey) ?? 0
    const now = Date.now()
    if (!ctx.alwaysAlert && now - last < ALERT_COOLDOWN_MS) return
    recentAlerts.set(dedupeKey, now)

    const provider = getEmailProvider()
    await provider.sendTransactional({
      to: adminEmail,
      locale: 'en',
      templateKey: 'system.error',
      data: { source: ctx.source, message, stack, context: JSON.stringify(ctx.extra ?? {}, null, 2) },
      idempotencyKey: `error:${dedupeKey}:${Math.floor(now / ALERT_COOLDOWN_MS)}`,
      category: 'support',
    }).catch(() => {})
  } catch {
    // Never let error tracking itself throw.
  }
}
