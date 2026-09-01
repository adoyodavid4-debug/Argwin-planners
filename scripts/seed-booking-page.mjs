// seed-booking-page.mjs — create a demo public booking page ("arwign") owned by
// the admin (or first) user, so /calendar/book/arwign works out of the box.
// Requires migration 015_booking.sql to have been applied. Idempotent.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const j = async (res) => { const t = await res.text(); try { return JSON.parse(t) } catch { return t } }

// 1) Pick an owner: prefer an admin profile, else the first profile.
let owner
for (const q of ['role=in.(admin,super_admin)', '']) {
  const res = await fetch(`${URL_}/rest/v1/profiles?select=id,email,role&order=created_at.asc&limit=1${q ? '&' + q : ''}`, { headers: h })
  const rows = await j(res)
  if (Array.isArray(rows) && rows[0]) { owner = rows[0]; if (q) break }
}
if (!owner) { console.error('No user/profile found — create an account first, then re-run.'); process.exit(1) }
console.log('Owner:', owner.email, `(${owner.role})`)

// 2) Skip if the slug already exists.
const existing = await j(await fetch(`${URL_}/rest/v1/booking_pages?select=id&slug=eq.arwign`, { headers: h }))
if (Array.isArray(existing) && existing.length) { console.log('Booking page "arwign" already exists — nothing to do.'); process.exit(0) }

// 3) Create the page.
const page = {
  owner_id: owner.id,
  slug: 'arwign',
  title: 'Book a call with Arwign',
  description: 'A relaxed 30-minute call to talk planners, notebooks or a custom request. Pick a time that suits you.',
  duration_min: 30,
  buffer_min: 10,
  min_notice_hours: 4,
  advance_days: 30,
  timezone: 'Africa/Nairobi',
  working_hours: { '1': [['09:00', '17:00']], '2': [['09:00', '17:00']], '3': [['09:00', '17:00']], '4': [['09:00', '17:00']], '5': [['09:00', '16:00']] },
  location: 'Google Meet (link sent on confirmation)',
  colour: 'sage',
  is_active: true,
}
const res = await fetch(`${URL_}/rest/v1/booking_pages`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(page) })
if (!res.ok) { console.error('Insert failed:', res.status, await res.text()); process.exit(1) }
console.log('Created booking page → /calendar/book/arwign')
