// Quick deliverability check: sends one test email through Resend using the same
// key + from-address the app uses. Confirms the domain is verified and sending
// works, without going through the full order/opt-in funnel.
//
//   node scripts/test-email.mjs you@example.com
//
// Falls back to ADMIN_EMAIL (then FROM_EMAIL) if no recipient is given.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const API_KEY = env.RESEND_API_KEY
const FROM =
  env.FROM_EMAIL ||
  env.EMAIL_FROM ||
  env.EMAIL_FROM_INFO ||
  'Arwign Planners <hello@arwignplanners.com>'

// Strip a display-name wrapper to derive a sensible default recipient.
const fromAddr = (FROM.match(/<([^>]+)>/)?.[1] ?? FROM).trim()
const to = process.argv[2] || env.ADMIN_EMAIL || fromAddr

if (!API_KEY) {
  console.error('✗ RESEND_API_KEY is missing from .env.local')
  process.exit(1)
}

console.log(`→ Sending test email\n  from: ${FROM}\n  to:   ${to}`)

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: FROM,
    to,
    subject: 'Arwign Planners — Resend test email',
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#C9A84C">It works ✅</h2>
      <p>This is a test email sent through Resend from <strong>${FROM}</strong>.</p>
      <p>If it landed in your inbox (not spam), your domain is verified and
      transactional email is good to go.</p>
    </div>`,
  }),
})

const body = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error(`✗ Resend returned ${res.status}:`, JSON.stringify(body, null, 2))
  console.error('\nCommon causes: unverified domain, from-address not on a verified domain, or a bad API key.')
  process.exit(1)
}

console.log(`✓ Sent. Resend message id: ${body.id}`)
console.log('  Check the inbox (and spam), and the Emails log in the Resend dashboard.')
