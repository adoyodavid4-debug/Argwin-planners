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
2. Open the domain's **Records** tab. **Always copy the values Resend shows
   you** — don't hand-type the examples here.

Resend's current infrastructure (**Forge**, hostnames under `rmta.net` — that
domain belongs to Resend) uses **three records**:

| Purpose | Type  | Host / Name         | Value (copy from Resend) |
|---------|-------|---------------------|--------------------------|
| Sending + SPF + bounces | CNAME | `send`  | `send.forge.rmta.net`    |
| Return-path             | CNAME | `rsend` | `rsend.forge.rmta.net`   |
| DKIM                    | TXT   | `resend._domainkey` | `p=MIGfMA0GCSq…` (long key, nothing else) |

> **Where did the SPF TXT and `feedback-smtp…amazonses.com` MX go?** Older
> Resend domains (Amazon SES-backed) needed a `v=spf1 include:amazonses.com`
> TXT and a `feedback-smtp` MX on `send`. Forge replaces both with the CNAMEs
> above: the SPF policy and the bounce ("feedback") mail exchanger now live on
> `send.forge.rmta.net`, on Resend's side of the CNAME. If your dashboard shows
> the CNAME values, do **not** add the old SPF/MX records.

Also recommended (after verification): TXT `_dmarc` → `v=DMARC1; p=none;` —
only if a `_dmarc` record doesn't already exist.

---

## 2. Add the records in HostPinnacle (cPanel → Zone Editor)

1. Log into HostPinnacle → **cPanel** → **Domains → Zone Editor** →
   **Manage** next to `arwignplanners.com`.
2. **First remove any old attempt:** if `send` already has a TXT (`v=spf1 …`)
   or an MX (`feedback-smtp…`) record from earlier instructions, delete them.
   DNS forbids a CNAME from coexisting with any other record on the same name —
   the CNAME can't be added (or won't resolve) until they're gone.
3. For each Resend record click **+ Add Record**:

HostPinnacle appends the domain automatically, so enter the **Name** as just the
host part:

- Name `send`,  Type `CNAME`, Value `send.forge.rmta.net`
- Name `rsend`, Type `CNAME`, Value `rsend.forge.rmta.net`
- Name `resend._domainkey`, Type `TXT`, Value = the `p=…` key from Resend —
  **the value must contain ONLY the key** (starts `p=MIG…`, ends `…IDAQAB`).
  Pasting any surrounding text from instructions corrupts the record and DKIM
  fails verification.

> **TXT quoting:** paste the value without surrounding quotes; cPanel adds them.
> If the DKIM key is very long, paste it as one line — don't split it.

### Do **not** touch these (they keep your inbox working)

- **Root `MX`** (`@` → HostPinnacle mail server) — leave exactly as is, and it
  must be the **only** root MX. A second root MX pointing anywhere else (e.g.
  `inbound-smtp.us-east-1.amazonaws.com`) splits your incoming mail between two
  servers and silently loses the half that goes to the wrong one — delete any
  such extra record.
- **Root `SPF`** (`@` TXT `v=spf1 …hostpinnacle… ~all`) — leave as is. Resend's
  SPF lives behind the `send` CNAME and aligns via DKIM, so the root SPF does
  not need Resend added. Only one `v=spf1` TXT is allowed at the root.
- **Existing `_dmarc`** — if one already exists, edit it instead of adding a
  second. Only one `_dmarc` record may exist.

---

## 3. Verify

1. Wait for DNS to propagate (usually 10–30 min; can be up to a few hours).
2. Back in Resend → **Domains** → click **Verify**. All records should go green.
3. Sanity-check from your machine:
   ```bash
   nslookup -type=CNAME send.arwignplanners.com    # → send.forge.rmta.net
   nslookup -type=CNAME rsend.arwignplanners.com   # → rsend.forge.rmta.net
   nslookup -type=TXT resend._domainkey.arwignplanners.com  # → p=MIG… only
   nslookup -type=MX  arwignplanners.com   # → HostPinnacle only, nothing else
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
