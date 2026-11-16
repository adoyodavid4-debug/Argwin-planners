// Guard function unit tests (masterplan §3.5 — "write unit tests for every
// branch before any agent sends anything"). Run: npx tsx scripts/test-guards.ts
// Pure functions only — no DB, no network.
import {
  inQuietHours, inQuietHoursTz, isSuppressed, hasConsent, isUsNumber,
  withinBudget, requiresApproval, optOutRateExceeded, canContact,
} from '../lib/agents/guards'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`) }
}
function expect(actual: unknown, expected: unknown, msg = '') {
  if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`)
}

// Freeze "now" so quiet-hour tests are deterministic: 14:00 UTC
const realDate = Date
function freezeUtcHour(hour: number) {
  const frozen = new realDate(realDate.UTC(2026, 0, 15, hour, 0, 0))
  // @ts-expect-error test shim
  global.Date = class extends realDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) { super(frozen.getTime()); return }
      // @ts-expect-error spread into parent
      super(...args)
    }
    static now() { return frozen.getTime() }
    static UTC = realDate.UTC
    static parse = realDate.parse
  }
}
function unfreeze() { global.Date = realDate }

console.log('\n── inQuietHours (default 21:00–09:00 local) ──')
test('14:00 UTC, offset 0 (UK 14:00) → not quiet', () => {
  freezeUtcHour(14); expect(inQuietHours(0), false); unfreeze()
})
test('14:00 UTC, offset -5 (US-E 09:00) → not quiet (boundary: end hour is awake)', () => {
  freezeUtcHour(14); expect(inQuietHours(-5), false); unfreeze()
})
test('02:00 UTC, offset 0 (UK 02:00) → quiet', () => {
  freezeUtcHour(2); expect(inQuietHours(0), true); unfreeze()
})
test('22:00 UTC, offset 0 (UK 22:00) → quiet (after 21:00 start)', () => {
  freezeUtcHour(22); expect(inQuietHours(0), true); unfreeze()
})
test('13:00 UTC, offset +8 (Asia 21:00) → quiet (start boundary inclusive)', () => {
  freezeUtcHour(13); expect(inQuietHours(8), true); unfreeze()
})
test('01:00 UTC, offset -5 (US-E 20:00) → not quiet', () => {
  freezeUtcHour(1); expect(inQuietHours(-5), false); unfreeze()
})
test('inQuietHoursTz falls back safely on a bad timezone', () => {
  freezeUtcHour(14); expect(inQuietHoursTz('Not/AZone'), false); unfreeze()
})

console.log('\n── isSuppressed ──')
const sup = [{ lead_id: 'L1', channel: 'whatsapp' }, { lead_id: 'L2', channel: 'email' }]
test('suppressed lead+channel → true', () => expect(isSuppressed('L1', 'whatsapp', sup), true))
test('same lead, other channel → false', () => expect(isSuppressed('L1', 'email', sup), false))
test('unknown lead → false', () => expect(isSuppressed('LX', 'whatsapp', sup), false))
test('empty suppression list → false', () => expect(isSuppressed('L1', 'whatsapp', []), false))

console.log('\n── isUsNumber (Canadian +1 excluded) ──')
test('+1415… (San Francisco) → US', () => expect(isUsNumber('+14155550123'), true))
test('+1416… (Toronto) → not US', () => expect(isUsNumber('+14165550123'), false))
test('+1604… (Vancouver) → not US', () => expect(isUsNumber('+16045550123'), false))
test('+44 (UK) → not US', () => expect(isUsNumber('+447911123456'), false))
test('+1 with 9-digit remainder → not US (malformed)', () => expect(isUsNumber('+1123456789'), false))
test('empty string → not US', () => expect(isUsNumber(''), false))

console.log('\n── hasConsent ──')
process.env.US_MARKETING_TEMPLATES_BLOCKED = 'true'
test('WA transactional inside window → allowed', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'transactional', hasExplicitOptIn: false, windowOpen: true, isUsNumber: false }), true))
test('WA transactional, no window but opt-in → allowed', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'transactional', hasExplicitOptIn: true, windowOpen: false, isUsNumber: false }), true))
test('WA marketing, opt-in + window, UK → allowed', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'marketing', hasExplicitOptIn: true, windowOpen: true, isUsNumber: false }), true))
test('WA marketing to US number while flag on → BLOCKED', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'marketing', hasExplicitOptIn: true, windowOpen: true, isUsNumber: true }), false))
test('WA marketing, opt-in but no window → blocked', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'marketing', hasExplicitOptIn: true, windowOpen: false, isUsNumber: false }), false))
test('WA marketing, window but no opt-in → blocked', () =>
  expect(hasConsent({ channel: 'whatsapp', kind: 'marketing', hasExplicitOptIn: false, windowOpen: true, isUsNumber: false }), false))
test('email transactional, no opt-in → allowed', () =>
  expect(hasConsent({ channel: 'email', kind: 'transactional', hasExplicitOptIn: false, windowOpen: false, isUsNumber: false }), true))
test('email marketing, no opt-in → blocked', () =>
  expect(hasConsent({ channel: 'email', kind: 'marketing', hasExplicitOptIn: false, windowOpen: false, isUsNumber: false }), false))
test('email marketing with opt-in → allowed', () =>
  expect(hasConsent({ channel: 'email', kind: 'marketing', hasExplicitOptIn: true, windowOpen: false, isUsNumber: false }), true))
test('IG anything outside window → blocked', () =>
  expect(hasConsent({ channel: 'instagram', kind: 'transactional', hasExplicitOptIn: true, windowOpen: false, isUsNumber: false }), false))
test('IG transactional inside window → allowed', () =>
  expect(hasConsent({ channel: 'instagram', kind: 'transactional', hasExplicitOptIn: false, windowOpen: true, isUsNumber: false }), true))
test('Messenger marketing inside window without opt-in → blocked', () =>
  expect(hasConsent({ channel: 'messenger', kind: 'marketing', hasExplicitOptIn: false, windowOpen: true, isUsNumber: false }), false))

console.log('\n── withinBudget ──')
test('no cap set (0) → always within', () =>
  expect(withinBudget({ agentKey: 'email', estimatedCostUsd: 999 }, { monthly_budget_usd: 0, budget_used_usd: 500 }), true))
test('under cap → within', () =>
  expect(withinBudget({ agentKey: 'email', estimatedCostUsd: 1 }, { monthly_budget_usd: 10, budget_used_usd: 5 }), true))
test('would exceed cap → not within', () =>
  expect(withinBudget({ agentKey: 'email', estimatedCostUsd: 6 }, { monthly_budget_usd: 10, budget_used_usd: 5 }), false))
test('exactly at cap → within (boundary)', () =>
  expect(withinBudget({ agentKey: 'email', estimatedCostUsd: 5 }, { monthly_budget_usd: 10, budget_used_usd: 5 }), true))

console.log('\n── requiresApproval (spending ALWAYS needs approval) ──')
test('create_ad with autonomy auto → still requires approval', () =>
  expect(requiresApproval('create_ad', { create_ad: 'auto' }), true))
test('change_budget with autonomy auto → still requires approval', () =>
  expect(requiresApproval('change_budget', { change_budget: 'auto' }), true))
test('change_price with autonomy auto → still requires approval', () =>
  expect(requiresApproval('change_price', { change_price: 'auto' }), true))
test('publish_pin with autonomy auto → no approval needed', () =>
  expect(requiresApproval('publish_pin', { publish_pin: 'auto' }), false))
test('publish_pin with no autonomy set → defaults to approval', () =>
  expect(requiresApproval('publish_pin', {}), true))
test('publish_pin with draft → requires approval', () =>
  expect(requiresApproval('publish_pin', { publish_pin: 'draft' }), true))

console.log('\n── optOutRateExceeded (default 2%) ──')
test('0 sent → not exceeded', () => expect(optOutRateExceeded(0, 0), false))
test('1 opt-out of 100 (1%) → not exceeded', () => expect(optOutRateExceeded(1, 100), false))
test('3 opt-outs of 100 (3%) → exceeded', () => expect(optOutRateExceeded(3, 100), true))
test('2 of 100 (exactly 2%) → not exceeded (boundary)', () => expect(optOutRateExceeded(2, 100), false))

console.log('\n── canContact (master guard) ──')
const base = {
  leadId: 'L1',
  channel: 'whatsapp' as const,
  kind: 'transactional' as const,
  hasExplicitOptIn: false,
  windowOpen: true,
  isUsPhoneNumber: false,
  recipientUtcOffset: 0,
  suppressions: [] as Array<{ lead_id: string; channel: string }>,
  globalPaused: false,
  agentEnabled: true,
}
test('happy path → allowed', () => {
  freezeUtcHour(14); expect(canContact(base).allowed, true); unfreeze()
})
test('global kill switch → blocked', () => {
  freezeUtcHour(14); expect(canContact({ ...base, globalPaused: true }).allowed, false); unfreeze()
})
test('agent disabled → blocked', () => {
  freezeUtcHour(14); expect(canContact({ ...base, agentEnabled: false }).allowed, false); unfreeze()
})
test('suppressed → blocked', () => {
  freezeUtcHour(14)
  expect(canContact({ ...base, suppressions: [{ lead_id: 'L1', channel: 'whatsapp' }] }).allowed, false)
  unfreeze()
})
test('quiet hours → blocked', () => {
  freezeUtcHour(2); expect(canContact(base).allowed, false); unfreeze()
})
test('no window, no opt-in, marketing → blocked', () => {
  freezeUtcHour(14)
  expect(canContact({ ...base, kind: 'marketing', windowOpen: false }).allowed, false)
  unfreeze()
})
test('US marketing while flag on → blocked even with window + opt-in', () => {
  freezeUtcHour(14)
  expect(canContact({ ...base, kind: 'marketing', hasExplicitOptIn: true, isUsPhoneNumber: true }).allowed, false)
  unfreeze()
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
