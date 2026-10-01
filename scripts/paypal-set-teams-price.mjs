// scripts/paypal-set-teams-price.mjs
//
// Updates the price of the Arwign Teams PayPal SUBSCRIPTION PLAN — the amount
// customers actually see and pay at checkout. This lives in PayPal, not in the
// app code, which is why changing PLAN_PRICE in the repo did NOT change checkout.
//
// What it does:
//   1. Authenticates with your PayPal REST creds.
//   2. Reads the current Teams plan, prints its status + current price.
//   3. Updates the REGULAR billing cycle's fixed price to the new value.
//   4. Re-reads the plan and confirms the new price.
//
// New subscriptions use the new price immediately. Existing active subscribers
// are NOT changed by this (PayPal keeps them on the price they signed up at);
// if you also want to raise them, that's a separate per-subscription revision.
//
// Requires Node 18+ (global fetch). Run from the project root:
//
//   PowerShell (live):
//     $env:PAYPAL_ENV="live"
//     $env:NEXT_PUBLIC_PAYPAL_CLIENT_ID="<live client id>"
//     $env:PAYPAL_CLIENT_SECRET="<live secret>"
//     $env:NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID="<live teams plan id>"
//     node scripts/paypal-set-teams-price.mjs
//
//   Dry run (inspect only, no change):
//     node scripts/paypal-set-teams-price.mjs --dry-run
//
//   Override the target price (defaults to 79.99):
//     node scripts/paypal-set-teams-price.mjs --price 79.99
//
// Do NOT commit real credentials. This script only reads them from the
// environment; nothing is written to disk.

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const priceIdx = args.indexOf('--price')
const NEW_PRICE = (priceIdx !== -1 && args[priceIdx + 1] ? args[priceIdx + 1] : '79.99')
const CURRENCY = process.env.PAYPAL_CURRENCY || 'USD'

const ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase()
const BASE = ENV === 'live' || ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const SECRET = process.env.PAYPAL_CLIENT_SECRET
const PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID

function die(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1) }

if (!CLIENT_ID || !SECRET) die('Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the environment.')
if (!PLAN_ID) die('Set NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID (the Teams plan id) in the environment.')
if (!/^\d+\.\d{2}$/.test(NEW_PRICE)) die(`--price must look like 79.99 (got "${NEW_PRICE}")`)

async function token() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) die(`PayPal OAuth failed (${res.status}): ${await res.text()}`)
  return (await res.json()).access_token
}

async function getPlan(t) {
  const res = await fetch(`${BASE}/v1/billing/plans/${encodeURIComponent(PLAN_ID)}`, {
    headers: { Authorization: `Bearer ${t}` },
  })
  if (!res.ok) die(`Could not fetch plan ${PLAN_ID} (${res.status}): ${await res.text()}`)
  return res.json()
}

function regularCycle(plan) {
  const cycles = plan.billing_cycles || []
  return cycles.find((c) => c.tenure_type === 'REGULAR') || cycles[cycles.length - 1]
}

async function main() {
  console.log(`\nPayPal env : ${ENV === 'live' || ENV === 'production' ? 'LIVE' : 'sandbox'}  (${BASE})`)
  console.log(`Plan id    : ${PLAN_ID}`)
  console.log(`Target     : ${CURRENCY} ${NEW_PRICE}/cycle${DRY_RUN ? '   [DRY RUN]' : ''}`)

  const t = await token()
  const plan = await getPlan(t)
  const cycle = regularCycle(plan)
  if (!cycle) die('Plan has no billing cycles to update.')

  const current = cycle.pricing_scheme?.fixed_price
  console.log(`\nPlan name  : ${plan.name}`)
  console.log(`Status     : ${plan.status}`)
  console.log(`Current    : ${current ? `${current.currency_code} ${current.value}` : '(none)'}  (cycle #${cycle.sequence}, ${cycle.frequency?.interval_count} ${cycle.frequency?.interval_unit})`)

  if (current && current.value === NEW_PRICE && current.currency_code === CURRENCY) {
    console.log(`\n✔ Already ${CURRENCY} ${NEW_PRICE}. Nothing to do.\n`)
    return
  }
  if (DRY_RUN) {
    console.log(`\n(dry run) Would set cycle #${cycle.sequence} to ${CURRENCY} ${NEW_PRICE}. Re-run without --dry-run to apply.\n`)
    return
  }

  const res = await fetch(`${BASE}/v1/billing/plans/${encodeURIComponent(PLAN_ID)}/update-pricing-schemes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pricing_schemes: [{
        billing_cycle_sequence: cycle.sequence,
        pricing_scheme: { fixed_price: { value: NEW_PRICE, currency_code: CURRENCY } },
      }],
    }),
  })
  if (res.status !== 204 && !res.ok) die(`Price update failed (${res.status}): ${await res.text()}`)

  const after = regularCycle(await getPlan(t))?.pricing_scheme?.fixed_price
  console.log(`\n✔ Updated. Plan now charges ${after?.currency_code} ${after?.value} per cycle.`)
  console.log('  New checkouts reflect this immediately. Existing subscribers keep their old price.\n')
}

main().catch((e) => die(e?.message || String(e)))
