-- ============================================================
--  Arwign Planners — Supabase Schema
--  Run in order via Supabase SQL editor or CLI
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE product_status    AS ENUM ('draft', 'active', 'archived', 'scheduled');
CREATE TYPE order_status      AS ENUM ('pending', 'processing', 'completed', 'refunded', 'cancelled');
CREATE TYPE user_role         AS ENUM ('customer', 'admin', 'super_admin');
CREATE TYPE delivery_type     AS ENUM ('digital', 'printable', 'bundle');
CREATE TYPE review_status     AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE coupon_type       AS ENUM ('percentage', 'fixed');
CREATE TYPE blog_status       AS ENUM ('draft', 'published', 'archived');

-- ─── PROFILES ───────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  locale        TEXT NOT NULL DEFAULT 'en',
  wishlist      UUID[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATEGORIES ─────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  name_fr     TEXT,                          -- French localisation
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,                          -- lucide icon name
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  title_fr         TEXT,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  description_fr   TEXT,
  category_id      UUID REFERENCES categories(id),
  status           product_status NOT NULL DEFAULT 'draft',
  delivery_type    delivery_type NOT NULL DEFAULT 'digital',

  -- Pricing
  price            NUMERIC(10,2) NOT NULL,
  compare_price    NUMERIC(10,2),           -- original price for strike-through
  currency         TEXT NOT NULL DEFAULT 'USD',

  -- Media
  images           TEXT[] DEFAULT '{}',     -- Supabase Storage paths
  preview_pages    TEXT[] DEFAULT '{}',     -- watermarked preview images
  thumbnail        TEXT,

  -- Download
  file_url         TEXT,                    -- Supabase Storage path (private bucket)
  file_size_mb     NUMERIC(6,2),
  file_formats     TEXT[] DEFAULT '{}',     -- e.g. ['PDF', 'GoodNotes', 'Notability']
  page_count       INTEGER,

  -- SEO
  meta_title       TEXT,
  meta_description TEXT,
  meta_keywords    TEXT[],
  og_image         TEXT,

  -- Metrics
  download_count   INTEGER NOT NULL DEFAULT 0,
  view_count       INTEGER NOT NULL DEFAULT 0,
  rating_avg       NUMERIC(3,2) DEFAULT 0,
  rating_count     INTEGER DEFAULT 0,

  -- Flags
  is_featured      BOOLEAN DEFAULT FALSE,
  is_bestseller    BOOLEAN DEFAULT FALSE,
  is_new           BOOLEAN DEFAULT TRUE,
  is_bundle        BOOLEAN DEFAULT FALSE,
  bundle_items     UUID[],                  -- product IDs in bundle

  -- Tags
  tags             TEXT[] DEFAULT '{}',

  -- Launch scheduling
  published_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search index on products
CREATE INDEX products_fts ON products
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || array_to_string(tags,',')));

-- ─── PRODUCT FAQs ────────────────────────────────────────────
CREATE TABLE product_faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  question_fr TEXT,
  answer      TEXT NOT NULL,
  answer_fr   TEXT,
  sort_order  INTEGER DEFAULT 0
);

-- ─── REVIEWS ────────────────────────────────────────────────
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  verified    BOOLEAN DEFAULT FALSE,
  status      review_status NOT NULL DEFAULT 'pending',
  helpful_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email            TEXT NOT NULL,
  status           order_status NOT NULL DEFAULT 'pending',

  -- Payment
  stripe_payment_intent TEXT,
  paypal_order_id       TEXT,
  payment_method        TEXT,           -- 'stripe_card'|'paypal'|'apple_pay'|'google_pay'
  amount_subtotal  NUMERIC(10,2) NOT NULL,
  amount_discount  NUMERIC(10,2) DEFAULT 0,
  amount_total     NUMERIC(10,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  coupon_code      TEXT,

  -- Download access tokens (signed URLs generated on completion)
  download_tokens  JSONB,               -- { product_id: token, ... }
  downloads_expire TIMESTAMPTZ,

  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ORDER ITEMS ────────────────────────────────────────────
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  title       TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1
);

-- ─── COUPONS ────────────────────────────────────────────────
CREATE TABLE coupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT NOT NULL UNIQUE,
  type           coupon_type NOT NULL DEFAULT 'percentage',
  value          NUMERIC(10,2) NOT NULL,
  min_order      NUMERIC(10,2) DEFAULT 0,
  max_uses       INTEGER,
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BLOG POSTS ─────────────────────────────────────────────
CREATE TABLE blog_posts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  title_fr         TEXT,
  slug             TEXT NOT NULL UNIQUE,
  excerpt          TEXT,
  excerpt_fr       TEXT,
  body             TEXT,
  body_fr          TEXT,
  cover_image      TEXT,
  author_id        UUID REFERENCES profiles(id),
  status           blog_status NOT NULL DEFAULT 'draft',
  tags             TEXT[] DEFAULT '{}',
  category         TEXT,

  -- SEO
  meta_title       TEXT,
  meta_description TEXT,
  og_image         TEXT,
  read_time_mins   INTEGER,

  -- Related products
  related_products UUID[],

  view_count       INTEGER DEFAULT 0,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NEWSLETTER ─────────────────────────────────────────────
CREATE TABLE newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  locale     TEXT DEFAULT 'en',
  source     TEXT,                          -- 'footer'|'hero'|'popup'
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ANALYTICS EVENTS ───────────────────────────────────────
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       TEXT NOT NULL,               -- 'product_view'|'add_to_cart'|'checkout'|'purchase'
  product_id  UUID REFERENCES products(id),
  user_id     UUID REFERENCES profiles(id),
  session_id  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers  ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own
CREATE POLICY "profiles: own row" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles: admin all" ON profiles
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Products: public read of active products
CREATE POLICY "products: public read" ON products
  FOR SELECT USING (status = 'active' OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));
CREATE POLICY "products: admin write" ON products
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Orders: users see their own
CREATE POLICY "orders: own" ON orders
  FOR SELECT USING (auth.uid() = user_id OR email = auth.email());
CREATE POLICY "orders: admin" ON orders
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Reviews: public read approved, write authenticated
CREATE POLICY "reviews: public read approved" ON reviews
  FOR SELECT USING (status = 'approved');
CREATE POLICY "reviews: authenticated write" ON reviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Newsletter: insert only (public)
CREATE POLICY "newsletter: insert" ON newsletter_subscribers
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "newsletter: admin read" ON newsletter_subscribers
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- ─── FUNCTIONS ───────────────────────────────────────────────
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_orders_updated_at    BEFORE UPDATE ON orders    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Increment product view count (called from API route)
CREATE OR REPLACE FUNCTION increment_view(product_id UUID)
RETURNS VOID AS $$
  UPDATE products SET view_count = view_count + 1 WHERE id = product_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Recalculate product rating
CREATE OR REPLACE FUNCTION refresh_product_rating(pid UUID)
RETURNS VOID AS $$
  UPDATE products SET
    rating_avg   = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE product_id = pid AND status = 'approved'),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = pid AND status = 'approved')
  WHERE id = pid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ─── SEED: Categories ────────────────────────────────────────
INSERT INTO categories (name, name_fr, slug, icon, sort_order, is_featured) VALUES
  ('Digital Planners',     'Agendas Numériques',    'digital-planners',    'tablet',           1,  TRUE),
  ('Printable Planners',   'Agendas Imprimables',   'printable-planners',  'printer',          2,  TRUE),
  ('Budget Planners',      'Planificateurs Budget',  'budget-planners',     'wallet',           3,  TRUE),
  ('Student Planners',     'Agendas Étudiants',     'student-planners',    'book-open',        4,  TRUE),
  ('Wellness Planners',    'Agendas Bien-être',     'wellness-planners',   'heart-pulse',      5,  TRUE),
  ('Business Planners',    'Agendas Business',      'business-planners',   'briefcase',        6,  TRUE),
  ('Habit Trackers',       'Trackers d''Habitudes', 'habit-trackers',      'check-circle',     7,  TRUE),
  ('Meal Planners',        'Planificateurs Repas',  'meal-planners',       'utensils',         8,  FALSE),
  ('ADHD Planners',        'Agendas TDAH',          'adhd-planners',       'brain',            9,  FALSE),
  ('Goal Trackers',        'Trackers d''Objectifs', 'goal-trackers',       'target',           10, FALSE),
  ('Savings Challenges',   'Défis Épargne',         'savings-challenges',  'piggy-bank',       11, FALSE),
  ('Notion Templates',     'Templates Notion',      'notion-templates',    'layout-template',  12, FALSE),
  ('Planner Bundles',      'Bundles Agendas',       'planner-bundles',     'package',          13, TRUE);
