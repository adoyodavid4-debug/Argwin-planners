# Email deliverability — Resend + HostPinnacle

Goal: send transactional email (order confirmations, opt-in, receipts) from
`@arwignplanners.com` through **Resend**, while **HostPinnacle keeps hosting your
mailboxes** (info@, hello@, etc.). Getting this right stops mail from bouncing or
landing in spam.

> HostPinnacle manages your **DNS zone** *and* your **inbox (MX)**. The rule that
> makes both work together: **leave the root `MX` and root `SPF` pointing at
> HostPinnacle** (so you keep receiving mail) and **add Resend's records on a
> `send` subdomain + a DKIM selector** (so you can send). They never collide.

---

## 1. Add the domain in Resend

1. Resend dashboard → **Domains → Add Domain** → enter `arwignplanners.com`.
2. Pick the region closest to you (e.g. `us-east-1`). This decides the exact
   hostnames in the records below — **always copy the values Resend shows you**,
   don't hand-type the examples here.
3. Resend now lists 3–4 DNS records. Keep that tab open for the next step.

The records Resend generates look like this (yours will differ slightly):

| Purpose | Type | Host / Name              | Value (copy from Resend)                        | Priority |
|---------|------|--------------------------|-------------------------------------------------|----------|
| DKIM    | TXT  | `resend._domainkey`      | `p=MIGfMA0GCSq…` (long key)                      | —        |
| SPF     | TXT  | `send`                   | `v=spf1 include:amazonses.com ~all`             | —        |
| Return-path (bounces) | MX | `send`      | `feedback-smtp.us-east-1.amazonses.com`         | 10       |
| DMARC (recommended)   | TXT | `_dmarc`   | `v=DMARC1; p=none;`                              | —        |

---

## 2. Add the records in HostPinnacle (cPanel → Zone Editor)

1. Log into HostPinnacle → **cPanel** → **Domains → Zone Editor** →
   **Manage** next to `arwignplanners.com`.
2. For each Resend record click **+ Add Record** and fill it in.

HostPinnacle appends the domain automatically, so enter the **Name** as just the
host part:

- DKIM → Name `resend._domainkey`, Type `TXT`, Value = the `p=…` key from Resend.
- SPF (subdomain) → Name `send`, Type `TXT`, Value `v=spf1 include:amazonses.com ~all`.
- Return-path → Name `send`, Type `MX`, Priority `10`,
  Value `feedback-smtp.us-east-1.amazonses.com` (use YOUR region's value).
- DMARC → Name `_dmarc`, Type `TXT`, Value `v=DMARC1; p=none;`
  *(only add if you don't already have a `_dmarc` record — see below).*

> **TXT quoting:** paste the value without surrounding quotes; cPanel adds them.
> If the DKIM key is very long, paste it as one line — don't split it.

### Do **not** touch these (they keep your inbox working)

- **Root `MX`** (`@` → HostPinnacle mail server) — leave exactly as is.
- **Root `SPF`** (`@` TXT `v=spf1 …hostpinnacle… ~all`) — leave as is. Resend's
  SPF lives on the `send` subdomain and aligns via DKIM, so the root SPF does not
  need Resend added.
  - *Optional hardening:* if you also send marketing mail straight from the root
    domain and want belt-and-braces, you may add `include:amazonses.com` **into
    the existing root SPF string** — never create a second root SPF record (only
    one `v=spf1` TXT is allowed at the root).
- **Existing `_dmarc`** — if HostPinnacle already created one, edit it instead of
  adding a second. Only one `_dmarc` record may exist.

---

## 3. Verify

1. Wait for DNS to propagate (usually 10–30 min; can be up to a few hours).
2. Back in Resend → **Domains** → click **Verify**. All records should go green.
3. Sanity-check from your machine:
   ```bash
   nslookup -type=TXT resend._domainkey.arwignplanners.com
   nslookup -type=TXT send.arwignplanners.com
   nslookup -type=MX  send.arwignplanners.com
   nslookup -type=MX  arwignplanners.com   # should still be HostPinnacle
   ```

---

## 4. Register the webhook (bounce / complaint / open tracking)

1. Resend → **Webhooks → Add Endpoint**.
2. URL: `https://www.arwignplanners.com/api/webhooks/email`
3. Events: `email.delivered`, `email.bounced`, `email.complained`,
   `email.opened`, `email.clicked`, `email.unsubscribed`.
4. Copy the endpoint's **Signing Secret** (starts with `whsec_`).
5. Set it as `EMAIL_WEBHOOK_SECRET` (see env vars below).

The app verifies this signature with the Svix scheme in
`lib/email/providers/resend.ts`. If the secret is wrong/missing, the endpoint
returns `401` and bounce tracking is silently skipped — so this step matters.

---

## 5. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production
+ Preview) and in `.env.local` for local dev:

```
RESEND_API_KEY=re_…                 # Resend → API Keys
FROM_EMAIL=Arwign Planners <hello@arwignplanners.com>   # any @arwignplanners.com address
EMAIL_WEBHOOK_SECRET=whsec_…        # from step 4
NEXT_PUBLIC_SITE_URL=https://www.arwignplanners.com
# Optional — only if you want distinct senders per category:
# EMAIL_FROM_INFO / EMAIL_FROM_SALES / EMAIL_FROM_SUPPORT
```

`FROM_EMAIL` must be an address on the domain you verified in step 1–3. The code
falls back to `FROM_EMAIL` for all categories, so a single value is enough.

After changing env vars in Vercel, **redeploy** so they take effect.

---

## 6. Test

1. Trigger a real flow (place a test order, or submit the newsletter opt-in) and
   confirm the email arrives — check the inbox, not just spam.
2. Resend → **Emails** shows each send with its delivery status.
3. Bounce test: send to `bounced@resend.dev` (Resend's sink). You should see an
   `email.bounced` event in Resend **and** the subscriber flipped to `bounced`
   in the DB via `/api/webhooks/email`.
4. Check spam placement with https://www.mail-tester.com — send to the address it
   gives you and aim for 9–10/10 (DKIM pass, SPF pass, DMARC aligned).

---

## Quick troubleshooting

| Symptom | Likely cause |
|---|---|
| Mail bounces / "domain not verified" | Domain still unverified in Resend (step 3) — DKIM/SPF/return-path not resolving yet. |
| Sends but lands in spam | Missing DKIM or DMARC; or `FROM_EMAIL` is on an unverified address. |
| You stopped receiving mail after DNS edits | Root `MX` or root `SPF` was changed — restore them to HostPinnacle's values. |
| Bounce/complaint events not recorded | `EMAIL_WEBHOOK_SECRET` missing/wrong, or webhook URL not registered. |
| `RESEND_API_KEY is not set` in logs | Key missing from the deployed environment — set it in Vercel and redeploy. |
