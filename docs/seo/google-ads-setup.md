# Google Ads — Beginner Setup (US & UK)

Conversion tracking is already wired: the site now fires a GA4 **`purchase`** event on the
order-success page. You'll import that into Google Ads so campaigns optimise for real sales.

> ⚠️ Don't skip conversion import. Without it Google optimises for clicks, not buyers — money wasted.

## Step 1 — Create the account (use Expert mode!)
1. Go to **ads.google.com** → sign in with the **same Google account** as your Analytics/Search Console.
2. Google will push "Smart" setup. Look for **"Switch to Expert Mode"** (small link, bottom).
3. If it forces you to build a campaign, click **"Create an account without a campaign"**, then finish (country: choose your billing country, currency: **USD** or **GBP** — this can't be changed later, pick your main one), add your **payment method**.

## Step 2 — Link Analytics + import the purchase conversion
1. In Google Ads: **Tools → Data manager** (or **Linked accounts**) → link **Google Analytics (GA4)** property `Arwign Planners`.
2. **Tools → Conversions → + New conversion action → Import → Google Analytics 4 → Web**.
3. Select the **`purchase`** event → **Import**. Set it as your **Primary** conversion.
   *(If `purchase` isn't listed yet, make a test order on the site first, then check GA4 → Admin → Events; mark `purchase` as a conversion/key event.)*

## Step 3 — First Search campaign (US & UK)
**Campaign settings**
- **Objective:** Sales → **Search** campaign.
- **Networks:** turn **OFF** "Search partners" and **OFF** "Display network" (avoids low-quality clicks).
- **Locations:** **United States** + **United Kingdom**. Then click **Location options → Target = "Presence: people in your targeted locations"** (not "presence or interest").
- **Language:** English.
- **Budget:** start small — **$10–15/day** total (US/UK planner clicks run ~$0.40–$1.50).
- **Bidding:** start **"Maximize clicks"** with a **Max CPC limit of $0.60**. After ~15–30 conversions, switch to **"Maximize conversions"**.

**Ad groups & keywords** (tight groups convert better). Use `"phrase"` and `[exact]` match — avoid broad match at first.

| Ad group | Keywords |
|---|---|
| GoodNotes / Digital | `"digital planner"`, `"goodnotes planner"`, `"digital planner goodnotes"`, `[digital planner pdf]` |
| ADHD | `"adhd planner"`, `"adhd digital planner"`, `[adhd planner pdf]` |
| Budget | `"budget planner printable"`, `"digital budget planner"`, `[budget planner pdf]` |
| Student | `"student planner goodnotes"`, `"academic planner pdf"` |

**Negative keywords** (add at campaign level so you don't pay for the wrong clicks):
`free`, `freebie`, `canva`, `notion` (unless you sell Notion), `job`, `salary`, `template` (if you don't sell templates), `wallpaper`, `coloring`.

**Responsive Search Ad** — paste these (Google mixes them):
*Headlines (each ≤30 chars):*
- Digital & Printable Planners
- GoodNotes & Notability Ready
- Instant PDF Download
- ADHD, Budget & Wellness
- Undated — Use Any Year
- Beautiful Planner PDFs
- A4, A5 & US Letter
- Plan Calmly, Every Day
- 200+ Planner Designs
- Shop Arwign Planners

*Descriptions (each ≤90 chars):*
- Premium digital & printable planners for GoodNotes, Notability & print. Instant download.
- ADHD, budget, wellness, student & meal planners. Undated, hyperlinked, reusable.
- Beautiful, calm designs delivered to your inbox in seconds. Works on iPad & tablet.
- A4, A5 & US Letter included. Join thousands planning with Arwign.

*Final URL:* pick a strong landing page, e.g. `https://www.arwignplanners.com/shop/category/adhd-planners` for the ADHD group, or `/shop` for the general group.
*Sitelinks (add 4):* Best Sellers, ADHD Planners, Budget Planners, Digital Notebooks.

## Step 4 — First week
- Let it run 5–7 days before judging (learning phase).
- Check **Search terms report** → add junk terms as negatives.
- Pause keywords with lots of clicks but 0 sales.
- Once you have conversions, switch bidding to **Maximize conversions** and raise budget on what works.

## Sensible guardrails for a new advertiser
- Start with **one** campaign, 2–3 tight ad groups. Don't spread thin.
- Set an **account budget cap** if nervous (Billing → Settings).
- Ignore Google reps pushing broad match + higher budgets until you have data.
