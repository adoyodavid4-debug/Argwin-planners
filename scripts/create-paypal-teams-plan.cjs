#!/usr/bin/env node
/*
 * One-off: create a PayPal subscription product + billing plan for Arwign
 * Calendar Teams at $79.99/month, then print the new plan id.
 *
 * WHY: the recurring-subscription button (SubscribePayPal) charges whatever the
 * PayPal billing plan referenced by NEXT_PUBLIC_PAYPAL_PLAN_TEAMS_ID is set to.
 * The old plan was created at $49.99. PayPal plan prices can't be edited in the
 * dashboard, so we create a fresh $79.99 plan and point the env var at it.
 *
 * USAGE (from the arwign-planners/ directory):
 *   node scripts/create-paypal-teams-plan.cjs
 *
 * It reads PayPal creds from .env.production.pulled (then .env.local, then the
 * process env). Creates the plan in LIVE or SANDBOX based on PAYPAL_ENV — make
 * sure that matches the NEXT_PUBLIC_PAYPAL_CLIENT_ID your site actually uses.
 *
 * Override the amount/names/plan with env or flags if needed:
 *   PRICE=79.99 PLAN=teams node scripts/create-paypal-teams-plan.cjs
 */
const fs = require('fs')
const path = require('path')

// ── config ────────────────────────────────────────────────────────────────
const PLAN = (process.env.PLAN || 'teams').toLowerCase() // 'teams' | 'plus'
const PRICE = process.env.PRICE || (PLAN === 'plus' ? '19.99' : '79.99')
const CURRENCY = process.env.CURRENCY || 'USD'
const LABEL = PLAN === 'plus' ? 'Plus' : 'Teams'

// ── load env (file first, then process.env) ────────────────────────────────
function loadEnvFile(file) {
  const out = {}
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[m[1]] = v
    }
  } catch { /* file may not exist */ }
  return out
}

const here = __dirname
const root = path.resolve(here, '..')
const fileEnv = {
  ...loadEnvFile(path.join(root, '.env.local')),
  ...loadEnvFile(path.join(root, '.env.production.pulled')), // prod wins
}
const env = (k) => process.env[k] || fileEnv[k]

const CLIENT_ID = env('NEXT_PUBLIC_PAYPAL_CLIENT_ID')
const SECRET = env('PAYPAL_CLIENT_SECRET')
const PAYPAL_ENV = (env('PAYPAL_ENV') || 'sandbox').toLowerCase()
const LIVE = PAYPAL_ENV === 'live' || PAYPAL_ENV === 'production'
const BASE = LIVE ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

if (!CLIENT_ID || !SECRET) {
  console.error('✖ Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (checked .env.production.pulled, .env.local, process env).')
  process.exit(1)
}

async function token() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const j = await res.json()
  if (!res.ok) throw new Error(`token ${res.status}: ${JSON.stringify(j)}`)
  return j.access_token
}

async function post(urlPath, accessToken, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${urlPath} ${res.status}: ${JSON.stringify(j)}`)
  return j
}

;(async () => {
  console.log(`→ PayPal ${LIVE ? 'LIVE' : 'SANDBOX'} · creating ${LABEL} plan at ${CURRENCY} ${PRICE}/month`)
  const t = await token()

  const product = await post('/v1/catalogs/products', t, {
    name: `Arwign Calendar ${LABEL}`,
    description: `Arwign Calendar ${LABEL} subscription.`,
    type: 'SERVICE',
    category: 'SOFTWARE',
  })
  console.log(`✓ product: ${product.id}`)

  const plan = await post('/v1/billing/plans', t, {
    product_id: product.id,
    name: `Arwign ${LABEL} — Monthly`,
    description: `Arwign Calendar ${LABEL}, billed monthly. Cancel anytime.`,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 = until cancelled
        pricing_scheme: { fixed_price: { value: PRICE, currency_code: CURRENCY } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0', currency_code: CURRENCY },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 1,
    },
  })

  console.log('')
  console.log('════════════════════════════════════════════════════════')
  console.log(`✓ NEW ${LABEL.toUpperCase()} PLAN CREATED`)
  console.log(`  Plan ID: ${plan.id}`)
  console.log(`  Price:   ${CURRENCY} ${PRICE} / month`)
  console.log(`  Env:     ${LIVE ? 'LIVE' : 'SANDBOX'}`)
  console.log('────────────────────────────────────────────────────────')
  console.log('  Next: set this in Vercel (Production) and redeploy:')
  console.log(`    NEXT_PUBLIC_PAYPAL_PLAN_${LABEL.toUpperCase()}_ID=${plan.id}`)
  console.log('════════════════════════════════════════════════════════')
})().catch((e) => { console.error('✖', e.message || e); process.exit(1) })
