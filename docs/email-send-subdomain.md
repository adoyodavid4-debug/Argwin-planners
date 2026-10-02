# Move Resend sending to `send.arwignplanners.com`

Goal: verify a dedicated **sending subdomain** in Resend so marketing/transactional
mail is signed as `send.arwignplanners.com`, keeping the root `arwignplanners.com`
clean for your HostPinnacle mailboxes and protecting its reputation.

Do the steps **in order**. There is never a moment where live email breaks — the
from-address only changes (last step) *after* the subdomain is Verified.

---

## Step 1 — Add the domain in Resend

1. [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Domain: **`send.arwignplanners.com`** (type the full subdomain)
3. Region: pick the one closest to your buyers (e.g. **US East (N. Virginia)**).
   *Note the region* — it changes the MX host in Step 2.
4. Click **Add**. Resend now shows a table of **3 DNS records**. Leave this tab open —
   you'll copy exact values from it. They look like this (your DKIM key + region will differ):

   | # | Type | Resend shows (Name / Host) | Value |
   |---|------|----------------------------|-------|
   | A | `MX`  | `send.arwignplanners.com` | `feedback-smtp.us-east-1.amazonses.com` (priority **10**) |
   | B | `TXT` | `send.arwignplanners.com` | `v=spf1 include:amazonses.com ~all` |
   | C | `TXT` | `resend._domainkey.send.arwignplanners.com` | `p=MIGfMA0GCSqGSIb3DQ…` (one long key) |

   ⚠️ Copy the **exact** values from YOUR Resend screen — especially the MX host
   (region-specific) and the full DKIM `p=…` key. Don't use the examples above verbatim.

---

## Step 2 — Add the records in HostPinnacle (cPanel → Zone Editor)

HostPinnacle is cPanel-based. Log in → **Zone Editor** → **Manage** next to
`arwignplanners.com`.

### ‼️ The one gotcha that breaks most setups: relative vs full names
cPanel's **Name** field is relative to `arwignplanners.com` and **auto-appends the
domain**. So you enter the name **without** the trailing `.arwignplanners.com`.
Resend shows the *full* name; you strip the domain suffix:

| Resend's full name | Enter in cPanel "Name" |
|---|---|
| `send.arwignplanners.com` | `send` |
| `resend._domainkey.send.arwignplanners.com` | `resend._domainkey.send` |

After saving each record, re-open it and confirm cPanel did **not** double the suffix
(you do NOT want `send.arwignplanners.com.arwignplanners.com`). If it did, delete and
re-add using the relative name.

### Record A — MX (bounce/complaint handling for the subdomain)
- **Add Record → Type: MX**
- **Name:** `send`
- **Priority:** `10`
- **Destination:** the feedback host from Resend, e.g. `feedback-smtp.us-east-1.amazonses.com`
- This MX sits on the **subdomain only** — it does **not** touch your root MX, so your
  HostPinnacle inboxes on `@arwignplanners.com` keep working untouched.

### Record B — TXT (SPF for the subdomain)
- **Add Record → Type: TXT**
- **Name:** `send`
- **Value:** `v=spf1 include:amazonses.com ~all`
- (This is the SPF for the *sending subdomain* — separate from your root SPF.)

### Record C — TXT (DKIM)
- **Add Record → Type: TXT**
- **Name:** `resend._domainkey.send`
- **Value:** the full `p=…` key from Resend (paste the whole string; if cPanel splits long
  TXT it's fine — it reassembles on lookup).

**TTL:** leave default (3600) on all three.

---

## Step 3 — Verify in Resend

1. Back in the Resend Domains tab, click **Verify DNS Records**.
2. HostPinnacle usually propagates in 15–60 min (can be up to a few hours).
   Re-click Verify until all three go **green / Verified**.
3. Optional self-check from any terminal:
   ```
   nslookup -type=TXT resend._domainkey.send.arwignplanners.com
   nslookup -type=MX  send.arwignplanners.com
   ```

---

## Step 4 — Ping me; I flip the app over (~2 min, no downtime)

Once Resend shows `send.arwignplanners.com` **Verified**, tell me. I will:

1. Update these Vercel production env vars to the subdomain:
   - `EMAIL_FROM_INFO`, `EMAIL_FROM_SALES`, `EMAIL_FROM_SUPPORT`, `FROM_EMAIL`, `EMAIL_FROM`
     → `Arwign Planners <hello@send.arwignplanners.com>`
2. Add a **`reply_to: hello@arwignplanners.com`** on the Resend send (code change in
   `lib/email/providers/resend.ts`) so customer **replies still land in your real root
   mailbox** — the subdomain has no inbox.
3. Redeploy and send a test from each category (welcome, receipt, invite) to confirm
   inbox delivery.

---

## Step 5 — DMARC (do this regardless — it's the spam fix)

DMARC is set at the **organizational domain**, so one record covers the root *and*
`send.*`. Add it now (HostPinnacle → Zone Editor), independent of the subdomain work:

- **Type:** TXT
- **Name:** `_dmarc`
- **Value:** `v=DMARC1; p=none; rua=mailto:dmarc@arwignplanners.com; fo=1`

`p=none` is monitor-only (safe). Because Resend DKIM already aligns, DMARC will **pass**
immediately and your mail moves from spam → inbox. Tighten to `p=quarantine` later once
the `rua=` reports look clean.

---

## Why this order is safe
- Steps 1–3 only *add* DNS + verify in Resend — the app still sends from the root domain
  (which is Verified and delivering) the whole time.
- The from-address only changes in Step 4, **after** the subdomain is green — so there's
  no window where Resend rejects a send.
- Step 5 (DMARC) helps immediately and can't hurt, subdomain or not.
