# Growth Agents — Setup Guide

Everything the code cannot do for you. Work through this top-to-bottom before
turning off dry-run. The agents are safe to enable at any point: with
`AGENTS_DRY_RUN=true` (the default assumption) nothing leaves the building.

## 1. Database migrations

Run in the Supabase SQL editor, in order:

1. `supabase/migrations/032_growth_agents.sql` — Agent OS core (done 2026-11-16)
2. `supabase/migrations/033_sales_agent.sql` — sales agent schema
3. `supabase/migrations/034_growth_content.sql` — content calendar, consent, KB, seasonal calendar

## 2. Environment variables (Vercel → Settings → Environment Variables)

### Required before enabling ANY agent
```
ANTHROPIC_API_KEY=            # console.anthropic.com
ANTHROPIC_MODEL_HIGH=claude-sonnet-4-6
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
AGENTS_DRY_RUN=true           # keep true until go-live sign-off
US_MARKETING_TEMPLATES_BLOCKED=true
CRON_SECRET=                  # already set (reused by /api/agents/*)
ADMIN_EMAIL=                  # already set (weekly report + alerts go here)
BUSINESS_POSTAL_ADDRESS=      # required in every marketing email footer
AGENTS_EMAIL_FROM=Arwign Planners <hello@arwignplanners.com>
```

### Sales agent (Meta)
```
META_APP_ID=                  META_APP_SECRET=
META_SYSTEM_USER_TOKEN=       META_WEBHOOK_VERIFY_TOKEN=   # any random string; also paste into the Meta app webhook config
WHATSAPP_PHONE_NUMBER_ID=     WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_DISPLAY_NUMBER=      # digits only, e.g. 14155550123 — used for wa.me links/QRs
FB_PAGE_ID=                   IG_BUSINESS_ACCOUNT_ID=
```

### Ads agent (Meta Marketing)
```
META_AD_ACCOUNT_ID=           META_PIXEL_ID=               META_CAPI_TOKEN=
ADS_DAILY_CAP_USD=            ADS_MONTHLY_CAP_USD=
```

### Other channels
```
PINTEREST_APP_ID=             PINTEREST_APP_SECRET=        PINTEREST_REFRESH_TOKEN=
PINTEREST_DEFAULT_BOARD_ID=
ETSY_KEYSTRING=               ETSY_SHARED_SECRET=          ETSY_SHOP_ID=    ETSY_REFRESH_TOKEN=
GUMROAD_ACCESS_TOKEN=
TIKTOK_CLIENT_KEY=            TIKTOK_CLIENT_SECRET=        # optional — needs TikTok audit
GSC_SERVICE_ACCOUNT_JSON=     GSC_PROPERTY=https://www.arwignplanners.com
REVENUE_DROP_ALERT=0.4        # analyst same-day alert threshold
```

`RESEND_API_KEY` is already configured for the storefront and is reused.

## 3. Platform prerequisites (cannot be automated)

| Platform | What you must do |
|---|---|
| **Meta Business Manager** | Complete **business verification** (Settings → Business Info). Required for WhatsApp + App Review. |
| **WhatsApp Cloud API** | Register a dedicated number (not your personal one) in the WhatsApp section of the Meta app. Note the Phone Number ID and WABA ID. |
| **Meta App Review** | Request: `whatsapp_business_messaging`, `whatsapp_business_management`, `pages_messaging`, `instagram_manage_messages`, `instagram_manage_comments`, `ads_management`, `instagram_content_publish`. Each needs a screencast of the feature in use. |
| **Meta webhook** | In the app dashboard → WhatsApp → Configuration, set the callback URL to `https://www.arwignplanners.com/api/webhooks/meta` with your `META_WEBHOOK_VERIFY_TOKEN`; subscribe to `messages`. Repeat under Messenger/Instagram for `messages` + `messaging_referrals`. |
| **Pinterest** | Create an app at developers.pinterest.com, request standard access, OAuth once to get the refresh token, create one board per collection and set `PINTEREST_DEFAULT_BOARD_ID`. |
| **Etsy** | Request an app at etsy.com/developers (personal → production access), OAuth once for the refresh token, note the shop ID. |
| **TikTok (optional)** | Content Posting API requires an app audit; until it passes, reels stay "ready to post" for manual upload. |
| **Resend** | Domain is already verified. Confirm SPF, DKIM and DMARC still pass (Resend dashboard → Domains). |
| **Google Search Console** | Create a service account in Google Cloud, enable the Search Console API, add the service-account email as a user on the GSC property, paste the JSON key into `GSC_SERVICE_ACCOUNT_JSON`. |
| **Postal address** | A real business postal address in `BUSINESS_POSTAL_ADDRESS` — legally required in marketing email footers (CAN-SPAM/PECR). |

## 4. Scheduling

Two agent crons are registered in `vercel.json`:

- `/api/agents/cron` — daily agent runs (plan → act → report per enabled agent)
- `/api/agents/tick` — message dispatch, pin publishing, event processing

**Important — Vercel Hobby plan only allows daily crons.** The tick route is
designed to run **every minute** (the pacing engine sends ≤1 message per
channel per tick). Until the project is on Vercel Pro (where you can change
the tick schedule to `* * * * *`), either:

1. Upgrade to Pro and set `"schedule": "* * * * *"` for `/api/agents/tick`, or
2. Use a free external pinger (e.g. cron-job.org) calling
   `https://www.arwignplanners.com/api/agents/tick` every minute with header
   `Authorization: Bearer <CRON_SECRET>`.

This replaces the masterplan's pg_cron → Edge Functions design: the repo
already standardises on Vercel crons + Next API routes (see
`/api/cron/daily-briefing`), so the agents follow the same pattern rather
than introducing a second scheduler stack.

## 5. Go-live order (masterplan §18)

1. Migrations applied; env vars set; agents stay **disabled**, dry-run **on**.
2. Enable **one agent** in the Command Centre (`/admin/agents`) — start with Pinterest (lowest risk).
3. Press **Run now** on its page; check the run summary, Approvals and the audit log.
4. Approve/reject its drafts; confirm the feedback loop works.
5. Repeat for the email agent, then connect Meta and test the sales agent with your own WhatsApp.
6. Only after reviewing live drafts for a week: set `AGENTS_DRY_RUN=false` and redeploy.
7. The **global kill switch** on the Command Centre stops everything within one tick at any time.

## 6. Tests

```
npx tsx scripts/test-guards.ts    # 50 guard tests — all must pass before go-live
```
