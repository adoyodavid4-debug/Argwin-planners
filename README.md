# Arwign Planners — Full-Stack eCommerce

Premium digital & printable planner & notebook shop built with **Next.js 14**, **Supabase**, **Stripe**, **Tailwind CSS**, and **Framer Motion**.

---

## ✦ Tech Stack

| Layer            | Technology                              |
|------------------|-----------------------------------------|
| Framework        | Next.js 14 (App Router + RSC)           |
| Database         | Supabase (PostgreSQL + RLS)             |
| Auth             | Supabase Auth (email + OAuth)           |
| Storage          | Supabase Storage (products + files)     |
| Payments         | Stripe (cards, Apple Pay, Google Pay)   |
| PayPal           | PayPal JS SDK                           |
| Styling          | Tailwind CSS + CSS Variables            |
| Animations       | Framer Motion                           |
| State            | Zustand (cart, wishlist, UI)            |
| Forms            | React Hook Form + Zod validation        |
| Fonts            | Cormorant Garamond + Jost + DM Serif    |
| i18n             | English + French                        |
| SEO              | next-seo + JSON-LD schema markup        |
| Security         | CSP headers, RLS, CSRF, rate limiting   |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-org/arwign-planners.git
cd arwign-planners
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
# Fill in all values — see sections below
```

### 3. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run `supabase/migrations/001_schema.sql`
3. Create Storage buckets:
   - `product-images` — **Public**
   - `product-files`  — **Private** (download files)
   - `blog-images`    — **Public**
4. Copy your Project URL and anon key into `.env.local`

### 4. Stripe Setup
1. Create account at [stripe.com](https://stripe.com)
2. Enable **Apple Pay** and **Google Pay** in Stripe Dashboard → Settings → Payment methods
3. Copy publishable + secret keys into `.env.local`
4. Set up webhook:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`

### 5. Run Development Server
```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
arwign-planners/
├── app/
│   ├── layout.tsx              # Root layout + SEO metadata
│   ├── globals.css             # Design system, CSS variables
│   ├── site/                   # Public storefront
│   │   ├── page.tsx            # Homepage
│   │   ├── shop/               # Shop + product pages
│   │   ├── blog/               # Blog + article pages
│   │   ├── about/              # About page
│   │   ├── contact/            # Contact page
│   │   └── faq/                # FAQ page
│   ├── admin/                  # Admin dashboard (role-protected)
│   │   ├── dashboard/          # Analytics overview
│   │   ├── products/           # Product CRUD
│   │   ├── orders/             # Order management
│   │   ├── blog/               # Blog post editor
│   │   └── settings/           # Store settings
│   ├── auth/                   # Auth pages
│   ├── customer/               # Customer dashboard
│   └── api/
│       ├── checkout/           # Stripe checkout session
│       ├── webhooks/stripe/    # Stripe webhook handler
│       ├── newsletter/         # Newsletter subscription
│       └── download/           # Secure file download
├── components/
│   ├── layout/                 # Navbar, Footer, CartDrawer
│   ├── home/                   # Hero, Categories, Testimonials…
│   ├── shop/                   # ProductCard, ShopClient…
│   ├── admin/                  # Admin components
│   └── ui/                     # Reusable UI primitives
├── lib/
│   ├── supabase/               # Browser + server clients
│   ├── stripe.ts               # Stripe helpers
│   └── store.ts                # Zustand global state
├── middleware.ts               # Auth guards + CSRF protection
├── supabase/migrations/        # SQL schema
├── types/database.ts           # TypeScript database types
└── tailwind.config.ts          # Design tokens
```

---

## 🔐 Security Architecture

### Network Firewall (next.config.js headers)
- **X-Frame-Options: DENY** — Prevents clickjacking
- **Strict-Transport-Security** — Forces HTTPS for 1 year
- **Content-Security-Policy** — Allowlists scripts, styles, frames
- **Permissions-Policy** — Restricts camera, microphone, geolocation
- **X-Content-Type-Options: nosniff** — Prevents MIME sniffing

### Application Layer (middleware.ts)
- Route-level authentication guards for `/admin` and `/customer`
- Role-based access control (customer / admin / super_admin)
- CSRF origin validation on all API routes
- Session refresh on every request

### Database Layer (Supabase RLS)
- Row Level Security enabled on all tables
- Users can only read/write their own data
- Admin role required for write operations on products/orders
- Public read only on active products and approved reviews

### Payment Security
- Server-side price validation (never trust client prices)
- Stripe webhook signature verification
- Signed download URLs expire after 365 days

---

## 🌍 i18n (English + French)

Add `?lang=fr` or use browser locale detection. Translation keys are in:
- `lib/i18n/en.json`
- `lib/i18n/fr.json`

Product titles and descriptions have `_fr` fields in the database.

---

## 📊 SEO Features

- ✅ JSON-LD schema markup (Organization, Product, Article, Review)
- ✅ Open Graph + Twitter Card metadata on every page
- ✅ Semantic HTML with proper heading hierarchy (H1 → H3)
- ✅ ALT text on all images (product + blog)
- ✅ Canonical URLs for all pages
- ✅ Sitemap auto-generation (`/sitemap.xml`)
- ✅ robots.txt
- ✅ SEO-friendly URL structure (`/shop/[slug]`, `/blog/[slug]`)
- ✅ Rich snippets support (product rating, price, availability)
- ✅ Internal linking between products and blog posts
- ✅ Blog optimized for long-tail planner keywords

---

## 💳 Payment Methods

| Method       | Integration      | Status         |
|--------------|------------------|----------------|
| Credit/Debit | Stripe Elements  | ✅ Ready        |
| Apple Pay    | Stripe (auto)    | ✅ Ready        |
| Google Pay   | Stripe (auto)    | ✅ Ready        |
| PayPal       | PayPal JS SDK    | 🔧 Configure    |

---

## 🛠️ Admin Dashboard Features

- 📊 Revenue charts + KPI cards
- 📦 Product CRUD with image upload + file upload
- 🏷️ SEO metadata editor per product
- 📝 Blog post editor
- 🎟️ Coupon / discount management
- 📬 Newsletter subscriber management
- 🚀 Scheduled product launches
- ⭐ Feature products on homepage
- 📋 Order management + download tracking

---

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# → Settings → Environment Variables
```

**Important:** Set `STRIPE_WEBHOOK_SECRET` to the production webhook URL:
```
https://arwignplanners.com/api/webhooks/stripe
```

---

## 📧 Contact

Built for **Arwign Planners** — hello@arwignplanners.com
