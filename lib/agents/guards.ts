// Guard functions for the Arwign growth agent suite.
// Every agent must call these before sending any message, email or running
// against the budget. All functions are pure (no DB side-effects) except
// where marked. Tests live in lib/agents/guards.test.ts.

import type { Channel, ContactKind, BudgetCheck } from './types'

// ─── Quiet hours ──────────────────────────────────────────────────────────

const QUIET_START_H = parseInt(process.env.QUIET_START ?? '21', 10)
const QUIET_END_H   = parseInt(process.env.QUIET_END   ?? '9',  10)

/**
 * Returns true if the current moment is inside the recipient's quiet hours.
 * Uses the recipient's UTC offset (e.g. -5 for US Eastern, 0 for UK).
 */
export function inQuietHours(recipientUtcOffset: number): boolean {
  const utcNow  = new Date()
  const localH  = (utcNow.getUTCHours() + recipientUtcOffset + 24) % 24
  if (QUIET_START_H > QUIET_END_H) {
    // overnight window, e.g. 21–9
    return localH >= QUIET_START_H || localH < QUIET_END_H
  }
  return localH >= QUIET_START_H && localH < QUIET_END_H
}

/**
 * Returns true if the current moment is inside quiet hours for a named
 * IANA timezone (e.g. "America/New_York"). Falls back to UTC offset 0.
 */
export function inQuietHoursTz(tz: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: tz })
    const localH    = parseInt(formatter.format(new Date()), 10)
    if (QUIET_START_H > QUIET_END_H) {
      return localH >= QUIET_START_H || localH < QUIET_END_H
    }
    return localH >= QUIET_START_H && localH < QUIET_END_H
  } catch {
    return inQuietHours(0)
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────

/**
 * Check whether a lead/contact is suppressed on a given channel.
 * Accepts a pre-fetched suppressions array so the guard stays pure.
 * suppressions should be objects with { lead_id, channel } fields.
 */
export function isSuppressed(
  leadId: string,
  channel: Channel,
  suppressions: Array<{ lead_id: string; channel: string }>
): boolean {
  return suppressions.some(s => s.lead_id === leadId && s.channel === channel)
}

// ─── Consent ──────────────────────────────────────────────────────────────

/**
 * Returns true when a lead has valid, stored consent for the given
 * channel and message kind.
 *
 * Rules:
 * - transactional/utility messages on WhatsApp: inbound window open is enough
 * - marketing messages on WhatsApp: requires explicit opt-in AND window open,
 *   AND the lead must NOT be a US number while US_MARKETING_TEMPLATES_BLOCKED is on
 * - email marketing: explicit opt-in required
 * - Instagram/Messenger: window open is required; marketing only within window
 */
export function hasConsent(opts: {
  channel: Channel
  kind: ContactKind
  hasExplicitOptIn: boolean
  windowOpen: boolean
  isUsNumber: boolean
}): boolean {
  const { channel, kind, hasExplicitOptIn, windowOpen, isUsNumber } = opts

  if (channel === 'whatsapp') {
    if (kind === 'transactional' || kind === 'utility') {
      return windowOpen || hasExplicitOptIn
    }
    // marketing on WhatsApp
    if (isUsNumber && process.env.US_MARKETING_TEMPLATES_BLOCKED === 'true') return false
    return hasExplicitOptIn && windowOpen
  }

  if (channel === 'email') {
    return kind === 'transactional' ? true : hasExplicitOptIn
  }

  if (channel === 'instagram' || channel === 'messenger') {
    if (!windowOpen) return false
    return kind === 'marketing' ? hasExplicitOptIn : windowOpen
  }

  return false
}

// ─── US number detection ──────────────────────────────────────────────────

// Canadian area codes that share the +1 prefix — these are NOT US numbers
const CANADIAN_AREA_CODES = new Set([
  '204','226','236','249','250','289','306','343','365','403','416','418',
  '431','437','438','450','506','514','519','548','579','581','587','604',
  '613','639','647','672','705','709','742','778','780','782','807','819',
  '825','867','873','902','905',
])

/**
 * Returns true if the E.164 phone number belongs to a US subscriber.
 * Canadian +1 numbers are excluded.
 */
export function isUsNumber(e164: string): boolean {
  if (!e164.startsWith('+1')) return false
  const digits = e164.slice(2).replace(/\D/g, '')
  if (digits.length < 10) return false
  const areaCode = digits.slice(0, 3)
  return !CANADIAN_AREA_CODES.has(areaCode)
}

// ─── Budget ───────────────────────────────────────────────────────────────

/**
 * Returns true if the agent has enough remaining budget for the estimated cost.
 * Pass pre-fetched agent budget fields to keep the function pure.
 */
export function withinBudget(
  check: BudgetCheck,
  agentBudget: { monthly_budget_usd: number; budget_used_usd: number }
): boolean {
  if (agentBudget.monthly_budget_usd <= 0) return true  // no cap set
  return (agentBudget.budget_used_usd + check.estimatedCostUsd) <= agentBudget.monthly_budget_usd
}

// ─── Approval gate ────────────────────────────────────────────────────────

import type { ActionType, AutonomyLevel } from './types'

/**
 * Returns true if this action type requires an approval before it can proceed.
 * Spending changes (create_ad, change_budget, change_price) ALWAYS require
 * approval regardless of the autonomy setting.
 */
export function requiresApproval(
  actionType: ActionType,
  autonomy: Partial<Record<ActionType, AutonomyLevel>>
): boolean {
  const spendingActions: ActionType[] = ['create_ad', 'change_budget', 'change_price']
  if (spendingActions.includes(actionType)) return true
  const level = autonomy[actionType] ?? 'approve'
  return level !== 'auto'
}

// ─── Pacing ───────────────────────────────────────────────────────────────

const MAX_OPTOUT_RATE = parseFloat(process.env.MAX_OPTOUT_RATE ?? '0.02')

/**
 * Returns true if the channel's opt-out rate in the last 24 h exceeds
 * the configured threshold (default 2%). Accepts pre-computed values.
 */
export function optOutRateExceeded(optOuts: number, totalSent: number): boolean {
  if (totalSent === 0) return false
  return optOuts / totalSent > MAX_OPTOUT_RATE
}

// ─── Combined canContact guard ────────────────────────────────────────────

/**
 * Master guard: returns { allowed: true } or { allowed: false, reason: string }.
 * Call this immediately before dispatching any outbound message.
 */
export function canContact(opts: {
  leadId: string
  channel: Channel
  kind: ContactKind
  hasExplicitOptIn: boolean
  windowOpen: boolean
  isUsPhoneNumber: boolean
  recipientUtcOffset: number
  suppressions: Array<{ lead_id: string; channel: string }>
  globalPaused: boolean
  agentEnabled: boolean
}): { allowed: boolean; reason?: string } {
  if (opts.globalPaused)    return { allowed: false, reason: 'global kill switch is on' }
  if (!opts.agentEnabled)   return { allowed: false, reason: 'agent is disabled' }

  if (isSuppressed(opts.leadId, opts.channel, opts.suppressions))
    return { allowed: false, reason: 'lead is suppressed on this channel' }

  if (inQuietHours(opts.recipientUtcOffset))
    return { allowed: false, reason: 'quiet hours for recipient' }

  if (!hasConsent({
    channel:          opts.channel,
    kind:             opts.kind,
    hasExplicitOptIn: opts.hasExplicitOptIn,
    windowOpen:       opts.windowOpen,
    isUsNumber:       opts.isUsPhoneNumber,
  })) return { allowed: false, reason: 'no valid consent or window' }

  return { allowed: true }
}
