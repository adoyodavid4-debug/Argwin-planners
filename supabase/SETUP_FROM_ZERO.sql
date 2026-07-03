-- ============================================================================
-- ARWIGN PLANNERS - COMPLETE DATABASE SETUP (RUN ALL AT ONCE)
-- ============================================================================
-- Paste this WHOLE file into the Supabase SQL Editor and click Run ONCE:
--   https://supabase.com/dashboard/project/zmmyfvtzjravvglngptv/sql/new
--
-- SAFE TO RE-RUN: Section 0 below first removes anything a previous partial
-- run created, then rebuilds everything from zero - tables, security
-- policies, functions, triggers, storage buckets and all seed data.
-- WARNING: Section 0 wipes existing app data in this database. That is what
-- you want on a fresh project; do NOT run this on a database with real
-- customer orders.
-- ============================================================================

-- ============================================================================
-- SECTION 0: CLEAN SLATE - remove leftovers from any earlier partial run
-- ============================================================================

-- Extensions (needed by everything below)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop trigger on auth.users (if a previous run created it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables (children first; CASCADE clears policies, triggers, indexes)
DROP TABLE IF EXISTS fulfillment_events        CASCADE;
DROP TABLE IF EXISTS physical_orders           CASCADE;
DROP TABLE IF EXISTS print_products            CASCADE;
DROP TABLE IF EXISTS freebie_deliveries        CASCADE;
DROP TABLE IF EXISTS email_events              CASCADE;
DROP TABLE IF EXISTS subscriber_sequence_state CASCADE;
DROP TABLE IF EXISTS subscribers               CASCADE;
DROP TABLE IF EXISTS lead_magnets              CASCADE;
DROP TABLE IF EXISTS email_sequence_steps      CASCADE;
DROP TABLE IF EXISTS email_sequences           CASCADE;
DROP TABLE IF EXISTS notebook_activity_log     CASCADE;
DROP TABLE IF EXISTS notebook_collaborators    CASCADE;
DROP TABLE IF EXISTS notebooks                 CASCADE;
DROP TABLE IF EXISTS notebook_requests         CASCADE;
DROP TABLE IF EXISTS planner_templates         CASCADE;
DROP TABLE IF EXISTS nav_links                 CASCADE;
DROP TABLE IF EXISTS testimonials              CASCADE;
DROP TABLE IF EXISTS site_settings             CASCADE;
DROP TABLE IF EXISTS analytics_events          CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers    CASCADE;
DROP TABLE IF EXISTS blog_posts                CASCADE;
DROP TABLE IF EXISTS coupons                   CASCADE;
DROP TABLE IF EXISTS order_items               CASCADE;
DROP TABLE IF EXISTS orders                    CASCADE;
DROP TABLE IF EXISTS reviews                   CASCADE;
DROP TABLE IF EXISTS product_faqs              CASCADE;
DROP TABLE IF EXISTS products                  CASCADE;
DROP TABLE IF EXISTS categories                CASCADE;
DROP TABLE IF EXISTS profiles                  CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS set_updated_at()                                CASCADE;
DROP FUNCTION IF EXISTS increment_view(UUID)                            CASCADE;
DROP FUNCTION IF EXISTS refresh_product_rating(UUID)                    CASCADE;
DROP FUNCTION IF EXISTS get_my_role()                                   CASCADE;
DROP FUNCTION IF EXISTS claim_due_sequence_rows(INT)                    CASCADE;
DROP FUNCTION IF EXISTS advance_fulfillment_status(UUID,TEXT,JSONB,TEXT) CASCADE;
DROP FUNCTION IF EXISTS next_product_display_order(UUID)                CASCADE;
DROP FUNCTION IF EXISTS update_notebooks_updated_at()                   CASCADE;
DROP FUNCTION IF EXISTS update_site_settings_updated_at()               CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                        CASCADE;
DROP FUNCTION IF EXISTS public.assign_invoice_number()                  CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS invoice_number_seq;

-- Drop enum types
DROP TYPE IF EXISTS product_status      CASCADE;
DROP TYPE IF EXISTS order_status        CASCADE;
DROP TYPE IF EXISTS user_role           CASCADE;
DROP TYPE IF EXISTS delivery_type       CASCADE;
DROP TYPE IF EXISTS review_status       CASCADE;
DROP TYPE IF EXISTS coupon_type         CASCADE;
DROP TYPE IF EXISTS blog_status         CASCADE;
DROP TYPE IF EXISTS notebook_type       CASCADE;
DROP TYPE IF EXISTS notebook_status     CASCADE;
DROP TYPE IF EXISTS notebook_visibility CASCADE;
DROP TYPE IF EXISTS collaborator_role   CASCADE;

-- Storage policy from a previous run (buckets themselves are kept).
-- Wrapped so a permissions quirk on storage.objects can never abort the run.
DO $cleanup$
BEGIN
  DROP POLICY IF EXISTS "public read public buckets" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped storage policy cleanup: %', SQLERRM;
END
$cleanup$;

-- ============================================================================
-- SECTION 1..13: FULL BUILD (all migrations, in order)
-- ============================================================================


-- ==================== 001_schema.sql ====================
-- ============================================================
--  Arwign Planners — Supabase Schema
--  Run in order via Supabase SQL editor or CLI
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- --- ENUMS --------------------------------------------------
CREATE TYPE product_status    AS ENUM ('draft', 'active', 'archived', 'scheduled');
CREATE TYPE order_status      AS ENUM ('pending', 'processing', 'completed', 'refunded', 'cancelled');
CREATE TYPE user_role         AS ENUM ('customer', 'admin', 'super_admin');
CREATE TYPE delivery_type     AS ENUM ('digital', 'printable', 'bundle');
CREATE TYPE review_status     AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE coupon_type       AS ENUM ('percentage', 'fixed');
CREATE TYPE blog_status       AS ENUM ('draft', 'published', 'archived');

-- --- PROFILES -----------------------------------------------
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

-- --- CATEGORIES ---------------------------------------------
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

-- --- PRODUCTS -----------------------------------------------
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
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
-- Tags get their own array index (array_to_string is not allowed in index expressions)
CREATE INDEX products_tags_idx ON products USING GIN (tags);

-- --- PRODUCT FAQs --------------------------------------------
CREATE TABLE product_faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  question_fr TEXT,
  answer      TEXT NOT NULL,
  answer_fr   TEXT,
  sort_order  INTEGER DEFAULT 0
);

-- --- REVIEWS ------------------------------------------------
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

-- --- ORDERS -------------------------------------------------
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

-- --- ORDER ITEMS --------------------------------------------
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  title       TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1
);

-- --- COUPONS ------------------------------------------------
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

-- --- BLOG POSTS ---------------------------------------------
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

-- --- NEWSLETTER ---------------------------------------------
CREATE TABLE newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  locale     TEXT DEFAULT 'en',
  source     TEXT,                          -- 'footer'|'hero'|'popup'
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- ANALYTICS EVENTS ---------------------------------------
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       TEXT NOT NULL,               -- 'product_view'|'add_to_cart'|'checkout'|'purchase'
  product_id  UUID REFERENCES products(id),
  user_id     UUID REFERENCES profiles(id),
  session_id  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- ROW LEVEL SECURITY -------------------------------------
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

-- --- FUNCTIONS -----------------------------------------------
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

-- --- SEED: Categories ----------------------------------------
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


-- ==================== 002_seed_products.sql ====================
-- ============================================================
--  Arwign Planners — Product Seed Data
--  Run AFTER 001_schema.sql in Supabase SQL editor
-- ============================================================

INSERT INTO products (
  title, slug, description,
  category_id, status, delivery_type,
  price, compare_price, currency,
  thumbnail, images, preview_pages, file_formats,
  page_count, file_size_mb,
  is_featured, is_bestseller, is_new, is_bundle,
  tags, download_count, rating_avg, rating_count,
  published_at
) VALUES

-- -- Digital Planners ----------------------------------------
(
  '2025 Ultimate Digital Planner',
  'ultimate-digital-planner-2025',
  'A comprehensive all-in-one digital planner for GoodNotes, Notability and iPad. Includes daily, weekly, monthly and yearly views, habit trackers, goal pages and budget spreads.',
  (SELECT id FROM categories WHERE slug = 'digital-planners'),
  'active', 'digital',
  14.99, 24.99, 'USD',
  'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  365, 18.5,
  TRUE, TRUE, FALSE, FALSE,
  ARRAY['2025', 'digital', 'goodnotes', 'ipad', 'all-in-one'],
  4823, 4.92, 312,
  NOW()
),
(
  'Minimalist Digital Planner — Undated',
  'minimalist-digital-planner-undated',
  'Clean, distraction-free digital planner. Start any day of the year. Features a daily dashboard, weekly spread, project tracker and reflection prompts.',
  (SELECT id FROM categories WHERE slug = 'digital-planners'),
  'active', 'digital',
  9.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes'],
  240, 9.2,
  FALSE, FALSE, TRUE, FALSE,
  ARRAY['undated', 'minimalist', 'digital', 'daily', 'weekly'],
  1203, 4.75, 89,
  NOW()
),
(
  'Dark Mode Digital Planner 2025',
  'dark-mode-digital-planner-2025',
  'Sleek dark-themed digital planner easy on the eyes during late-night planning sessions. Full hyperlinked tabs, daily to-do lists, habit tracker and notes pages.',
  (SELECT id FROM categories WHERE slug = 'digital-planners'),
  'active', 'digital',
  12.99, 19.99, 'USD',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability', 'Xodo'],
  300, 14.0,
  FALSE, TRUE, FALSE, FALSE,
  ARRAY['dark mode', 'digital', '2025', 'goodnotes', 'night'],
  2941, 4.88, 201,
  NOW()
),

-- -- Printable Planners ---------------------------------------
(
  'A5 Printable Weekly Planner Pack',
  'a5-printable-weekly-planner-pack',
  'Beautifully designed A5 printable weekly planner pages. Print at home, cut and bind. Includes 52 weekly spreads, monthly calendars and habit tracking pages.',
  (SELECT id FROM categories WHERE slug = 'printable-planners'),
  'active', 'printable',
  6.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF'],
  120, 4.5,
  FALSE, FALSE, FALSE, FALSE,
  ARRAY['printable', 'A5', 'weekly', 'print-at-home'],
  870, 4.60, 54,
  NOW()
),
(
  'Botanical Printable Planner Set',
  'botanical-printable-planner-set',
  'Gorgeous botanical-themed printable planner with watercolour floral accents. Includes daily pages, weekly spreads, mood tracker, gratitude log and vision board template.',
  (SELECT id FROM categories WHERE slug = 'printable-planners'),
  'active', 'printable',
  8.99, 12.99, 'USD',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF'],
  85, 6.2,
  TRUE, FALSE, TRUE, FALSE,
  ARRAY['printable', 'botanical', 'floral', 'mood tracker', 'gratitude'],
  640, 4.82, 47,
  NOW()
),

-- -- Budget Planners ------------------------------------------
(
  'Monthly Budget Planner & Finance Tracker',
  'monthly-budget-planner-finance-tracker',
  'Take control of your finances with this detailed budget planner. Tracks income, expenses, savings goals, debt payoff and net worth month by month.',
  (SELECT id FROM categories WHERE slug = 'budget-planners'),
  'active', 'digital',
  11.99, 17.99, 'USD',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes'],
  180, 8.0,
  TRUE, TRUE, FALSE, FALSE,
  ARRAY['budget', 'finance', 'savings', 'debt', 'money'],
  3102, 4.95, 278,
  NOW()
),
(
  'Printable Budget Binder — A4',
  'printable-budget-binder-a4',
  'Complete printable budget binder with expense trackers, bill payment checklists, savings challenges, subscription tracker and debt snowball worksheets.',
  (SELECT id FROM categories WHERE slug = 'budget-planners'),
  'active', 'printable',
  7.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF'],
  95, 5.1,
  FALSE, FALSE, FALSE, FALSE,
  ARRAY['printable', 'budget binder', 'A4', 'bills', 'savings'],
  541, 4.70, 39,
  NOW()
),

-- -- Student Planners -----------------------------------------
(
  'Academic Digital Planner 2025–2026',
  'academic-digital-planner-2025-2026',
  'Designed for students and educators. Runs August 2025 – July 2026. Features semester overview, assignment tracker, exam countdown, reading log and study schedule.',
  (SELECT id FROM categories WHERE slug = 'student-planners'),
  'active', 'digital',
  12.99, 18.99, 'USD',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  280, 11.0,
  FALSE, TRUE, TRUE, FALSE,
  ARRAY['student', 'academic', 'school', 'university', 'assignment tracker'],
  1876, 4.89, 143,
  NOW()
),
(
  'Study Session Planner — Printable',
  'study-session-planner-printable',
  'Maximise your study sessions with focused planning pages. Includes Pomodoro timer sheets, subject breakdown planner, revision calendar and exam prep checklists.',
  (SELECT id FROM categories WHERE slug = 'student-planners'),
  'active', 'printable',
  5.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF'],
  60, 3.8,
  FALSE, FALSE, FALSE, FALSE,
  ARRAY['study', 'pomodoro', 'revision', 'exam', 'printable'],
  428, 4.65, 31,
  NOW()
),

-- -- Wellness Planners ----------------------------------------
(
  'Self-Care & Wellness Journal',
  'self-care-wellness-journal',
  'Nurture your mental and physical wellbeing. Daily mood check-ins, gratitude prompts, water tracker, sleep log, affirmations and weekly reflection spreads.',
  (SELECT id FROM categories WHERE slug = 'wellness-planners'),
  'active', 'digital',
  10.99, 14.99, 'USD',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes'],
  200, 7.5,
  TRUE, FALSE, FALSE, FALSE,
  ARRAY['wellness', 'self-care', 'mental health', 'gratitude', 'mood'],
  2345, 4.91, 188,
  NOW()
),
(
  'Fitness & Nutrition Tracker',
  'fitness-nutrition-tracker',
  'Reach your health goals with this all-in-one fitness planner. Workout log, meal planner, calorie tracker, body measurements, progress photos log and water intake tracker.',
  (SELECT id FROM categories WHERE slug = 'wellness-planners'),
  'active', 'digital',
  9.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  150, 6.0,
  FALSE, FALSE, TRUE, FALSE,
  ARRAY['fitness', 'nutrition', 'workout', 'meal plan', 'health'],
  987, 4.78, 76,
  NOW()
),

-- -- Habit Trackers -------------------------------------------
(
  '66-Day Habit Tracker — Printable',
  '66-day-habit-tracker-printable',
  'Build lasting habits in 66 days. Research-backed tracker with daily check-ins, weekly reflections, habit stacking guide and progress charts. Print as many times as you need.',
  (SELECT id FROM categories WHERE slug = 'habit-trackers'),
  'active', 'printable',
  4.99, NULL, 'USD',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF'],
  40, 2.5,
  FALSE, TRUE, FALSE, FALSE,
  ARRAY['habit tracker', '66 days', 'printable', 'routine', 'goals'],
  5612, 4.97, 421,
  NOW()
),
(
  'Monthly Habit & Mood Tracker — Digital',
  'monthly-habit-mood-tracker-digital',
  'Track up to 20 habits and your daily mood in one beautiful spread. Undated monthly layout so you can use it any time. Compatible with GoodNotes and Notability.',
  (SELECT id FROM categories WHERE slug = 'habit-trackers'),
  'active', 'digital',
  6.99, 9.99, 'USD',
  'https://images.unsplash.com/photo-1590402494610-2c378a9114c6?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1590402494610-2c378a9114c6?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  24, 3.2,
  FALSE, FALSE, FALSE, FALSE,
  ARRAY['habit tracker', 'mood tracker', 'monthly', 'digital', 'undated'],
  1432, 4.83, 112,
  NOW()
),

-- -- Planner Bundles ------------------------------------------
(
  'The Complete Planner Bundle — 8 Planners',
  'complete-planner-bundle',
  'Get all our bestsellers in one value bundle. Includes Digital Planner 2025, Budget Tracker, Wellness Journal, Habit Tracker, Student Planner, Meal Planner, Fitness Tracker and Gratitude Journal. Over 60% off individual prices.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'),
  'active', 'bundle',
  39.99, 99.99, 'USD',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  NULL, 85.0,
  TRUE, TRUE, FALSE, TRUE,
  ARRAY['bundle', 'value', 'all-in-one', 'digital', 'best value'],
  2109, 4.96, 234,
  NOW()
),
(
  'Student Life Bundle — 3 Planners',
  'student-life-bundle',
  'Everything a student needs: Academic Digital Planner, Study Session Printable Pack and Habit Tracker. Save 45% vs buying separately.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'),
  'active', 'bundle',
  19.99, 36.99, 'USD',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'],
  ARRAY[]::TEXT[], ARRAY['PDF', 'GoodNotes', 'Notability'],
  NULL, 22.0,
  FALSE, FALSE, TRUE, TRUE,
  ARRAY['student bundle', 'academic', 'study', 'value', 'school'],
  678, 4.85, 58,
  NOW()
);


-- ==================== 003_fix_rls_and_seed_categories.sql ====================
-- ============================================================
--  Arwign Planners — Fix RLS infinite recursion + seed categories
--  Run this in the Supabase SQL editor
-- ============================================================

-- -- 1. Fix infinite recursion in RLS policies ----------------
-- The problem: policies on `profiles` queried `profiles` again
-- to check the admin role, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the recursive policies
DROP POLICY IF EXISTS "profiles: admin all"       ON profiles;
DROP POLICY IF EXISTS "products: public read"     ON products;
DROP POLICY IF EXISTS "products: admin write"     ON products;
DROP POLICY IF EXISTS "orders: admin"             ON orders;
DROP POLICY IF EXISTS "newsletter: admin read"    ON newsletter_subscribers;

-- Re-create them using the safe function (no recursion)
CREATE POLICY "profiles: admin all" ON profiles
  FOR ALL USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "products: public read" ON products
  FOR SELECT USING (status = 'active' OR get_my_role() IN ('admin','super_admin'));

CREATE POLICY "products: admin write" ON products
  FOR ALL USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "orders: admin" ON orders
  FOR ALL USING (get_my_role() IN ('admin','super_admin'));

CREATE POLICY "newsletter: admin read" ON newsletter_subscribers
  FOR SELECT USING (get_my_role() IN ('admin','super_admin'));


-- -- 2. Seed categories (empty because 001 INSERT was skipped) -

INSERT INTO categories (name, name_fr, slug, icon, sort_order, is_featured)
VALUES
  ('Digital Planners',   'Agendas Numériques',    'digital-planners',   'tablet',          1,  TRUE),
  ('Printable Planners', 'Agendas Imprimables',   'printable-planners', 'printer',         2,  TRUE),
  ('Budget Planners',    'Planificateurs Budget',  'budget-planners',    'wallet',          3,  TRUE),
  ('Student Planners',   'Agendas Étudiants',     'student-planners',   'book-open',       4,  TRUE),
  ('Wellness Planners',  'Agendas Bien-être',     'wellness-planners',  'heart-pulse',     5,  TRUE),
  ('Business Planners',  'Agendas Business',      'business-planners',  'briefcase',       6,  TRUE),
  ('Habit Trackers',     'Trackers d''Habitudes', 'habit-trackers',     'check-circle',    7,  TRUE),
  ('Meal Planners',      'Planificateurs Repas',  'meal-planners',      'utensils',        8,  FALSE),
  ('ADHD Planners',      'Agendas TDAH',          'adhd-planners',      'brain',           9,  FALSE),
  ('Goal Trackers',      'Trackers d''Objectifs', 'goal-trackers',      'target',          10, FALSE),
  ('Savings Challenges', 'Défis Épargne',         'savings-challenges', 'piggy-bank',      11, FALSE),
  ('Notion Templates',   'Templates Notion',      'notion-templates',   'layout-template', 12, FALSE),
  ('Planner Bundles',    'Bundles Agendas',       'planner-bundles',    'package',         13, TRUE)
ON CONFLICT (slug) DO NOTHING;


-- ==================== 004_funnel_schema.sql ====================
-- ============================================================
--  Arwign Planners — Funnel Schema (Pillar 1)
--  Lead-Magnet → Email → Sale
-- ============================================================

-- citext for case-insensitive email dedup
CREATE EXTENSION IF NOT EXISTS citext;

-- --- EMAIL SEQUENCES -----------------------------------------
CREATE TABLE email_sequences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL DEFAULT 'on_confirm',  -- on_confirm | on_tag
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id  UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order   INTEGER NOT NULL,
  delay_hours  INTEGER NOT NULL DEFAULT 0,
  template_key TEXT NOT NULL,
  subject_i18n JSONB NOT NULL DEFAULT '{}',  -- { "en": "...", "fr": "..." }
  body_i18n    JSONB NOT NULL DEFAULT '{}',
  cta_i18n     JSONB NOT NULL DEFAULT '{}',
  data_overrides JSONB DEFAULT '{}',         -- extra merge vars for this step
  UNIQUE(sequence_id, step_order)
);

-- --- LEAD MAGNETS --------------------------------------------
CREATE TABLE lead_magnets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT NOT NULL UNIQUE,
  title_i18n          JSONB NOT NULL DEFAULT '{}',         -- { "en": "...", "fr": "..." }
  description_i18n    JSONB NOT NULL DEFAULT '{}',
  asset_path          TEXT NOT NULL,                        -- Supabase Storage path (private bucket)
  preview_image       TEXT,
  og_image            TEXT,
  pin_image           TEXT,
  enroll_sequence_id  UUID REFERENCES email_sequences(id),
  is_active           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- SUBSCRIBERS ---------------------------------------------
-- Replaces the basic newsletter_subscribers table with full funnel tracking
CREATE TABLE subscribers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                CITEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','unsubscribed','bounced','complained')),
  locale               TEXT NOT NULL DEFAULT 'en',
  confirmed_at         TIMESTAMPTZ,
  unsubscribed_at      TIMESTAMPTZ,
  source_lead_magnet_id UUID REFERENCES lead_magnets(id),
  utm                  JSONB DEFAULT '{}',
  consent_at           TIMESTAMPTZ NOT NULL,
  consent_text         TEXT NOT NULL,
  tags                 TEXT[] DEFAULT '{}',
  optin_token          TEXT,
  optin_token_expires_at TIMESTAMPTZ,
  unsub_token          TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscribers_email_idx  ON subscribers (email);
CREATE INDEX subscribers_status_idx ON subscribers (status);
CREATE INDEX subscribers_token_idx  ON subscribers (optin_token);

-- --- SUBSCRIBER SEQUENCE STATE -------------------------------
CREATE TABLE subscriber_sequence_state (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  sequence_id  UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','completed','paused','exited')),
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, sequence_id)
);

CREATE INDEX sss_active_idx ON subscriber_sequence_state (status, next_send_at)
  WHERE status = 'active';

-- --- EMAIL EVENTS --------------------------------------------
CREATE TABLE email_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  type          TEXT NOT NULL
                  CHECK (type IN ('sent','delivered','opened','clicked','bounced','complaint','unsubscribed')),
  idempotency_key TEXT UNIQUE,              -- prevent double-send auditing
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_events_subscriber_idx ON email_events (subscriber_id);

-- --- FREEBIE DELIVERIES --------------------------------------
CREATE TABLE freebie_deliveries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id    UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  lead_magnet_id   UUID NOT NULL REFERENCES lead_magnets(id),
  signed_url_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- ROW LEVEL SECURITY --------------------------------------
ALTER TABLE email_sequences           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_sequence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE freebie_deliveries        ENABLE ROW LEVEL SECURITY;

-- All tables: admin only (reads). No public select on subscriber data.
CREATE POLICY "admin only" ON subscribers
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_sequences
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_sequence_steps
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Lead magnets: public can read active ones (needed for landing pages via service role)
CREATE POLICY "public read active" ON lead_magnets
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "admin write" ON lead_magnets
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON subscriber_sequence_state
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_events
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON freebie_deliveries
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- --- TRIGGERS ------------------------------------------------
CREATE TRIGGER set_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sss_updated_at
  BEFORE UPDATE ON subscriber_sequence_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- SEED: Default welcome sequence --------------------------
INSERT INTO email_sequences (slug, name, trigger, is_active) VALUES
  ('welcome-en', 'Welcome Sequence (EN)', 'on_confirm', FALSE),
  ('welcome-fr', 'Welcome Sequence (FR)', 'on_confirm', FALSE);


-- ==================== 005_nurture_rpc.sql ====================
-- ============================================================
--  Arwign Planners — Nurture Engine RPC
-- ============================================================

-- Claims up to `batch_size` due sequence rows atomically (SKIP LOCKED),
-- returning all data the cron worker needs to send each step.
CREATE OR REPLACE FUNCTION claim_due_sequence_rows(batch_size INT DEFAULT 50)
RETURNS TABLE (
  state_id          UUID,
  subscriber_id     UUID,
  sequence_id       UUID,
  current_step      INT,
  email             TEXT,
  locale            TEXT,
  subscriber_status TEXT,
  template_key      TEXT,
  data_overrides    JSONB,
  unsub_token       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT sss.id
    FROM subscriber_sequence_state sss
    WHERE sss.status = 'active'
      AND sss.next_send_at <= NOW()
    ORDER BY sss.next_send_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  SELECT
    sss.id              AS state_id,
    sss.subscriber_id,
    sss.sequence_id,
    sss.current_step,
    s.email::TEXT       AS email,
    s.locale,
    s.status            AS subscriber_status,
    ess.template_key,
    ess.data_overrides,
    s.unsub_token
  FROM subscriber_sequence_state sss
  JOIN claimed              c   ON c.id = sss.id
  JOIN subscribers          s   ON s.id = sss.subscriber_id
  JOIN email_sequence_steps ess ON ess.sequence_id = sss.sequence_id
                               AND ess.step_order   = sss.current_step;
END;
$$;


-- ==================== 006_pod_schema.sql ====================
-- ============================================================
--  Arwign Planners — Phase 1 + Phase 2 POD Schema
-- ============================================================

-- --- Phase 1: product_type + fulfillment_options -------------

-- Product type discriminator (planner | notebook)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'planner'
    CHECK (product_type IN ('planner','notebook'));

-- How this product can be fulfilled
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_options TEXT NOT NULL DEFAULT 'digital'
    CHECK (fulfillment_options IN ('digital','print','both'));

-- Index for filtering
CREATE INDEX IF NOT EXISTS products_type_idx ON products (product_type);

-- Seed the Digital Notebooks category
INSERT INTO categories (name, name_fr, slug, icon, sort_order, is_featured)
VALUES ('Digital Notebooks', 'Cahiers Numériques', 'digital-notebooks', 'notebook', 14, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- --- Phase 2: POD tables -------------------------------------

-- Print product spec (ties a product to a POD provider config)
CREATE TABLE IF NOT EXISTS print_products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL DEFAULT 'lulu',
  pod_package_id   TEXT NOT NULL,           -- e.g. '0600X0900BWSTDPB060UW444MXX'
  interior_pdf_url TEXT NOT NULL,           -- print-ready interior (NOT the digital download)
  cover_pdf_url    TEXT NOT NULL,
  base_cost        INTEGER NOT NULL,        -- provider base cost in minor units (e.g. cents)
  retail_price     INTEGER NOT NULL,        -- what we charge, minor units
  currency         TEXT NOT NULL DEFAULT 'USD',
  min_margin_pct   INTEGER NOT NULL DEFAULT 30, -- margin guard threshold %
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, provider)
);

-- Physical orders (created after payment, before POD submission)
CREATE TABLE IF NOT EXISTS physical_orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shipping_address   JSONB NOT NULL,
  shipping_level     TEXT NOT NULL,
  shipping_cost      INTEGER NOT NULL,      -- minor units
  subtotal           INTEGER NOT NULL,      -- minor units
  total              INTEGER NOT NULL,      -- minor units
  currency           TEXT NOT NULL DEFAULT 'USD',
  provider           TEXT NOT NULL DEFAULT 'lulu',
  provider_job_id    TEXT,                  -- null until submitted
  fulfillment_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (fulfillment_status IN (
      'pending_review','submitted','accepted','in_production',
      'shipped','delivered','rejected','canceled','error'
    )),
  tracking_url       TEXT,
  tracking_number    TEXT,
  failure_reason     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS physical_orders_status_idx ON physical_orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS physical_orders_user_idx   ON physical_orders (user_id);

-- Append-only audit log for every status transition
CREATE TABLE IF NOT EXISTS fulfillment_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physical_order_id UUID NOT NULL REFERENCES physical_orders(id) ON DELETE CASCADE,
  status            TEXT NOT NULL,
  payload           JSONB DEFAULT '{}',
  source            TEXT NOT NULL DEFAULT 'webhook'
    CHECK (source IN ('webhook','admin','poll')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fulfillment_events_order_idx ON fulfillment_events (physical_order_id);

-- --- RLS -----------------------------------------------------

ALTER TABLE print_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_events ENABLE ROW LEVEL SECURITY;

-- print_products: cost fields admin-only; active records publicly readable
CREATE POLICY "print_products: public read active" ON print_products
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "print_products: admin all" ON print_products
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- physical_orders: customers see their own; admin sees all
CREATE POLICY "physical_orders: own" ON physical_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "physical_orders: admin" ON physical_orders
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- fulfillment_events: customers see events for their own orders; admin sees all
CREATE POLICY "fulfillment_events: own order" ON fulfillment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM physical_orders po
      WHERE po.id = physical_order_id AND po.user_id = auth.uid()
    )
  );
CREATE POLICY "fulfillment_events: admin" ON fulfillment_events
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- --- Triggers ------------------------------------------------

CREATE TRIGGER set_print_products_updated_at
  BEFORE UPDATE ON print_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_physical_orders_updated_at
  BEFORE UPDATE ON physical_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- Helper: advance fulfillment status with audit log -------

CREATE OR REPLACE FUNCTION advance_fulfillment_status(
  p_physical_order_id UUID,
  p_new_status        TEXT,
  p_payload           JSONB  DEFAULT '{}',
  p_source            TEXT   DEFAULT 'admin'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current TEXT;
  -- Valid forward transitions only
  valid BOOLEAN := FALSE;
BEGIN
  SELECT fulfillment_status INTO v_current
  FROM physical_orders WHERE id = p_physical_order_id FOR UPDATE;

  -- Allow any → rejected/canceled/error as side exits
  IF p_new_status IN ('rejected','canceled','error') THEN
    valid := TRUE;
  END IF;

  -- Forward-only state machine
  IF (v_current = 'pending_review' AND p_new_status = 'submitted')   THEN valid := TRUE; END IF;
  IF (v_current = 'submitted'      AND p_new_status = 'accepted')     THEN valid := TRUE; END IF;
  IF (v_current = 'accepted'       AND p_new_status = 'in_production') THEN valid := TRUE; END IF;
  IF (v_current = 'in_production'  AND p_new_status = 'shipped')      THEN valid := TRUE; END IF;
  IF (v_current = 'shipped'        AND p_new_status = 'delivered')     THEN valid := TRUE; END IF;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid fulfillment transition: % → %', v_current, p_new_status;
  END IF;

  UPDATE physical_orders
  SET fulfillment_status = p_new_status,
      tracking_url       = COALESCE((p_payload->>'tracking_url')::TEXT, tracking_url),
      tracking_number    = COALESCE((p_payload->>'tracking_number')::TEXT, tracking_number),
      failure_reason     = CASE WHEN p_new_status IN ('rejected','error') THEN (p_payload->>'reason')::TEXT ELSE failure_reason END
  WHERE id = p_physical_order_id;

  INSERT INTO fulfillment_events (physical_order_id, status, payload, source)
  VALUES (p_physical_order_id, p_new_status, p_payload, p_source);
END;
$$;


-- ==================== 007_notebooks_schema.sql ====================
-- ============================================================
--  Arwign Planners — Migration 007: Notebook Management
--  Run in Supabase SQL editor after 006_pod_schema.sql
-- ============================================================

-- --- ENUMS --------------------------------------------------
CREATE TYPE notebook_type       AS ENUM ('general', 'custom');
CREATE TYPE notebook_status     AS ENUM ('active', 'draft');
CREATE TYPE notebook_visibility AS ENUM ('private', 'shared', 'public');
CREATE TYPE collaborator_role   AS ENUM ('editor', 'viewer');

-- --- NOTEBOOKS ----------------------------------------------
CREATE TABLE notebooks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  type           notebook_type       NOT NULL DEFAULT 'general',
  description    TEXT,
  cover_color    TEXT        NOT NULL DEFAULT '#C9A84C',
  owner_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status         notebook_status     NOT NULL DEFAULT 'active',
  visibility     notebook_visibility NOT NULL DEFAULT 'private',
  last_edited_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- NOTEBOOK COLLABORATORS ---------------------------------
CREATE TABLE notebook_collaborators (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID        NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        collaborator_role NOT NULL DEFAULT 'viewer',
  invited_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (notebook_id, user_id)
);

-- --- NOTEBOOK ACTIVITY LOG ----------------------------------
CREATE TABLE notebook_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID        NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- INDEXES ------------------------------------------------
CREATE INDEX notebooks_owner_id_idx   ON notebooks (owner_id);
CREATE INDEX notebooks_status_idx     ON notebooks (status);
CREATE INDEX notebooks_visibility_idx ON notebooks (visibility);
CREATE INDEX nc_notebook_id_idx       ON notebook_collaborators (notebook_id);
CREATE INDEX nc_user_id_idx           ON notebook_collaborators (user_id);
CREATE INDEX nal_notebook_id_idx      ON notebook_activity_log (notebook_id);
CREATE INDEX nal_created_at_idx       ON notebook_activity_log (created_at DESC);

-- --- RLS ----------------------------------------------------
ALTER TABLE notebooks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_activity_log  ENABLE ROW LEVEL SECURITY;

-- notebooks: admin full access
CREATE POLICY "notebooks_admin_all" ON notebooks
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebooks: owner full access
CREATE POLICY "notebooks_owner_all" ON notebooks
  FOR ALL TO authenticated
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- notebooks: collaborators and public read
CREATE POLICY "notebooks_collab_read" ON notebooks
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM notebook_collaborators
      WHERE notebook_id = notebooks.id AND user_id = auth.uid()
    )
  );

-- notebook_collaborators: admin full access
CREATE POLICY "nc_admin_all" ON notebook_collaborators
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebook_collaborators: owner manages their notebook's collaborators
CREATE POLICY "nc_owner_manage" ON notebook_collaborators
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM notebooks WHERE id = notebook_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM notebooks WHERE id = notebook_id AND owner_id = auth.uid())
  );

-- notebook_collaborators: users see their own entries
CREATE POLICY "nc_self_read" ON notebook_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- notebook_activity_log: admin full access
CREATE POLICY "nal_admin_all" ON notebook_activity_log
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebook_activity_log: owners and collaborators can read
CREATE POLICY "nal_participant_read" ON notebook_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notebook_id
        AND (
          n.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM notebook_collaborators nc
            WHERE nc.notebook_id = n.id AND nc.user_id = auth.uid()
          )
        )
    )
  );

-- notebook_activity_log: participants can insert
CREATE POLICY "nal_participant_insert" ON notebook_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- --- TRIGGER: auto-update updated_at ------------------------
CREATE OR REPLACE FUNCTION update_notebooks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_notebooks_updated_at();


-- ==================== 008_settings_schema.sql ====================
-- ============================================================
--  Arwign Planners — Migration 008: Site Settings
--  Run in Supabase SQL editor after 007_notebooks_schema.sql
-- ============================================================

CREATE TABLE site_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults
INSERT INTO site_settings (key, value) VALUES
  ('store_name',            '"Arwign Planners"'),
  ('store_tagline',         '"Capture the chaos. Find the clarity."'),
  ('contact_email',         '""'),
  ('support_email',         '""'),
  ('default_currency',      '"USD"'),
  ('default_locale',        '"en"'),
  ('notify_new_order',      'true'),
  ('notify_new_subscriber', 'true'),
  ('return_policy',         '""'),
  ('shipping_info',         '""')
ON CONFLICT (key) DO NOTHING;

-- RLS: only admin/super_admin can read or write
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_admin_all" ON site_settings
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_site_settings_updated_at();


-- ==================== 009_notebook_requests.sql ====================
-- --- NOTEBOOK REQUESTS ---------------------------------------
-- Customer-submitted ideas for personalized/custom notebooks
CREATE TABLE notebook_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       CITEXT NOT NULL,
  idea        TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'en',
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reviewing', 'accepted', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notebook_requests_status_idx  ON notebook_requests (status);
CREATE INDEX notebook_requests_created_idx ON notebook_requests (created_at);

ALTER TABLE notebook_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON notebook_requests
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE TRIGGER set_notebook_requests_updated_at
  BEFORE UPDATE ON notebook_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ==================== 010_bundle_collections.sql ====================
-- --- S1: Curated bundle collections -------------------------
-- Backfills bundle_items on the two original bundles, then adds
-- 8 themed bundle products (Calm Collection, New Mum Kit,
-- Neurodivergent Set + 5 more) assembled from the existing
-- catalog. Each references its component products by slug so
-- the product page can render a real "what's included" list and
-- ItemList schema.

-- -- Backfill existing bundles ---------------------------------
UPDATE products SET bundle_items = ARRAY[
  (SELECT id FROM products WHERE slug = 'academic-digital-planner-2025-2026'),
  (SELECT id FROM products WHERE slug = 'study-session-planner-printable'),
  (SELECT id FROM products WHERE slug = '66-day-habit-tracker-printable')
] WHERE slug = 'student-life-bundle';

UPDATE products SET bundle_items = ARRAY[
  (SELECT id FROM products WHERE slug = 'ultimate-digital-planner-2025'),
  (SELECT id FROM products WHERE slug = 'monthly-budget-planner-finance-tracker'),
  (SELECT id FROM products WHERE slug = 'self-care-wellness-journal'),
  (SELECT id FROM products WHERE slug = 'monthly-habit-mood-tracker-digital'),
  (SELECT id FROM products WHERE slug = 'academic-digital-planner-2025-2026'),
  (SELECT id FROM products WHERE slug = 'fitness-nutrition-tracker')
] WHERE slug = 'complete-planner-bundle';

-- -- New curated bundles ----------------------------------------
INSERT INTO products (
  title, slug, description, category_id, status, delivery_type,
  price, compare_price, currency, images, thumbnail,
  file_formats, file_size_mb, is_featured, is_bestseller, is_new, is_bundle,
  bundle_items, tags, published_at, product_type, fulfillment_options
) VALUES
(
  'Calm Collection — Wellness & Mindfulness Bundle', 'calm-collection',
  'A gentle trio for slowing down: a self-care & wellness journal, a daily mood tracker, and a botanical planner set for grounding rituals. Built for anyone navigating stress, anxiety, or burnout recovery who wants a calmer way to plan.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  17.99, 26.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'],
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability'], 16.90, TRUE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'self-care-wellness-journal'),
    (SELECT id FROM products WHERE slug = 'monthly-habit-mood-tracker-digital'),
    (SELECT id FROM products WHERE slug = 'botanical-printable-planner-set')
  ],
  ARRAY['bundle','calm','wellness','mindfulness','self-care','anxiety-friendly'],
  NOW(), 'planner', 'digital'
),
(
  'New Mum Kit — Postpartum Planning Bundle', 'new-mum-kit',
  'Built for the fourth trimester: a self-care journal for recovery, a budget planner for new baby costs, and a 66-day habit tracker for rebuilding routines around feeds and sleep. A thoughtful gift for any new or expecting mum.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  18.99, 27.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80'],
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80',
  ARRAY['PDF','GoodNotes'], 18.00, TRUE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'self-care-wellness-journal'),
    (SELECT id FROM products WHERE slug = 'monthly-budget-planner-finance-tracker'),
    (SELECT id FROM products WHERE slug = '66-day-habit-tracker-printable')
  ],
  ARRAY['bundle','new mum','postpartum','baby','self-care','gift'],
  NOW(), 'planner', 'digital'
),
(
  'Neurodivergent Set — ADHD-Friendly Planning Bundle', 'neurodivergent-set',
  'Low-clutter, undated layouts paired with simple daily habit and mood tracking — built for ADHD and neurodivergent brains that need flexible structure without overwhelm. Start any day, no pressure to catch up.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  14.99, 21.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'],
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability'], 14.90, TRUE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'minimalist-digital-planner-undated'),
    (SELECT id FROM products WHERE slug = 'monthly-habit-mood-tracker-digital'),
    (SELECT id FROM products WHERE slug = '66-day-habit-tracker-printable')
  ],
  ARRAY['bundle','adhd','neurodivergent','focus','low-clutter','undated'],
  NOW(), 'planner', 'digital'
),
(
  'Student Starter Pack — Academic Survival Bundle', 'student-starter-pack',
  'Everything to start the term strong: an academic planner spanning the full school year, a focused study-session tracker with Pomodoro sheets, and a printable weekly pack for quick daily planning.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  16.99, 25.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80'],
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability'], 19.30, FALSE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'academic-digital-planner-2025-2026'),
    (SELECT id FROM products WHERE slug = 'study-session-planner-printable'),
    (SELECT id FROM products WHERE slug = 'a5-printable-weekly-planner-pack')
  ],
  ARRAY['bundle','student','academic','study','school'],
  NOW(), 'planner', 'digital'
),
(
  'Budget Reset Kit — Finance Clarity Bundle', 'budget-reset-kit',
  'A no-nonsense reset for your finances: a monthly budget & net worth tracker plus a printable budget binder with bill checklists and debt snowball worksheets.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  13.99, 19.98, 'USD',
  ARRAY['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
  ARRAY['PDF','GoodNotes'], 13.10, FALSE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'monthly-budget-planner-finance-tracker'),
    (SELECT id FROM products WHERE slug = 'printable-budget-binder-a4')
  ],
  ARRAY['bundle','budget','finance','savings','debt-payoff'],
  NOW(), 'planner', 'digital'
),
(
  'Fitness & Wellness Pack', 'fitness-wellness-pack',
  'Train your body and tend your mind: a fitness & nutrition tracker, a self-care & wellness journal, and a daily habit & mood tracker to keep you consistent on both fronts.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  18.99, 27.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability'], 16.70, FALSE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'fitness-nutrition-tracker'),
    (SELECT id FROM products WHERE slug = 'self-care-wellness-journal'),
    (SELECT id FROM products WHERE slug = 'monthly-habit-mood-tracker-digital')
  ],
  ARRAY['bundle','fitness','wellness','health','habit-tracking'],
  NOW(), 'planner', 'digital'
),
(
  'Digital Planner Trio — 3 Styles, One Price', 'digital-planner-trio',
  'Can''t decide on a look? Get all three signature digital planner styles — the Ultimate, Minimalist, and Dark Mode — in one bundle and switch whenever your mood does.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  24.99, 37.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80'],
  'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability','Xodo'], 41.70, TRUE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'ultimate-digital-planner-2025'),
    (SELECT id FROM products WHERE slug = 'minimalist-digital-planner-undated'),
    (SELECT id FROM products WHERE slug = 'dark-mode-digital-planner-2025')
  ],
  ARRAY['bundle','digital','goodnotes','variety','best value'],
  NOW(), 'planner', 'digital'
),
(
  'Creative & Aesthetic Bundle', 'creative-aesthetic-bundle',
  'For the planner-as-self-expression crowd: a botanical printable set, an A5 printable weekly pack, and a moody Dark Mode digital planner — three distinct aesthetics, one bundle price.',
  (SELECT id FROM categories WHERE slug = 'planner-bundles'), 'active', 'bundle',
  18.99, 28.97, 'USD',
  ARRAY['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'],
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80',
  ARRAY['PDF','GoodNotes','Notability','Xodo'], 24.70, FALSE, FALSE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'botanical-printable-planner-set'),
    (SELECT id FROM products WHERE slug = 'a5-printable-weekly-planner-pack'),
    (SELECT id FROM products WHERE slug = 'dark-mode-digital-planner-2025')
  ],
  ARRAY['bundle','aesthetic','creative','printable','digital'],
  NOW(), 'planner', 'digital'
);


-- ==================== 011_display_order.sql ====================
-- ============================================================
--  Arwign Planners — Migration 011: Product display_order for card numbering
--  Run in Supabase SQL editor after 010_bundle_collections.sql
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Index for ordering within a category
CREATE INDEX IF NOT EXISTS products_category_order_idx
  ON products (category_id, display_order);

-- Helper: return next available display_order for a given category.
-- Returns 1 when the category has no products yet.
CREATE OR REPLACE FUNCTION next_product_display_order(p_category_id UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(MAX(display_order), 0) + 1
  FROM products
  WHERE category_id = p_category_id
    AND display_order IS NOT NULL;
$$;


-- ==================== 012_planner_file_sizes.sql ====================
-- ============================================================
--  Arwign Planners — Migration 012: Per-size planner files (A4 / A5 / US Letter)
--  Run in Supabase SQL editor after 011_display_order.sql
-- ============================================================

-- Each product can now carry up to three planner files, one per paper size.
-- Stored as a single JSONB object keyed by size, e.g.
--   {
--     "a4":        { "url": "slug/planner-a4.pdf",        "size_mb": 2.31, "name": "planner-a4.pdf" },
--     "a5":        { "url": "slug/planner-a5.pdf",        "size_mb": 1.92, "name": "planner-a5.pdf" },
--     "us_letter": { "url": "slug/planner-us-letter.pdf", "size_mb": 2.40, "name": "planner-us-letter.pdf" }
--   }
-- The legacy `file_url` / `file_size_mb` columns remain populated (from A4,
-- falling back to the first available size) for backward compatibility.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS planner_files JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ==================== 013_complete_platform.sql ====================
-- ============================================================================
-- 013_complete_platform.sql
-- Completes the platform: auth/admin bootstrap, RLS for previously-open
-- tables, editable site content (settings/nav/testimonials/blog seeds),
-- planner generator templates, invoice numbers, and storage buckets.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTH BOOTSTRAP — auto-create a profile for every new auth user,
--    and make the store owner an admin automatically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN lower(NEW.email) IN ('adoyodavid4@gmail.com', 'admin@arwignplanners.com')
         THEN 'admin'::user_role ELSE 'customer'::user_role END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote the owner if the account already exists
UPDATE public.profiles SET role = 'admin'
WHERE lower(email) IN ('adoyodavid4@gmail.com', 'admin@arwignplanners.com');

-- ----------------------------------------------------------------------------
-- 2. RLS for tables that previously had none
-- ----------------------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories public read"  ON categories;
DROP POLICY IF EXISTS "categories admin write"  ON categories;
CREATE POLICY "categories public read" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories admin write" ON categories FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog public read published" ON blog_posts;
DROP POLICY IF EXISTS "blog admin all"             ON blog_posts;
CREATE POLICY "blog public read published" ON blog_posts FOR SELECT
  USING (status = 'published' OR get_my_role() IN ('admin','super_admin'));
CREATE POLICY "blog admin all" ON blog_posts FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons public read active" ON coupons;
DROP POLICY IF EXISTS "coupons admin all"          ON coupons;
CREATE POLICY "coupons public read active" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "coupons admin all" ON coupons FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

ALTER TABLE product_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faqs public read" ON product_faqs;
DROP POLICY IF EXISTS "faqs admin all"   ON product_faqs;
CREATE POLICY "faqs public read" ON product_faqs FOR SELECT USING (TRUE);
CREATE POLICY "faqs admin all" ON product_faqs FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics public insert" ON analytics_events;
DROP POLICY IF EXISTS "analytics admin read"    ON analytics_events;
CREATE POLICY "analytics public insert" ON analytics_events FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "analytics admin read" ON analytics_events FOR SELECT
  USING (get_my_role() IN ('admin','super_admin'));

-- site_settings must be publicly readable so the storefront can render
-- store name, announcement bar, hero copy etc. (writes stay admin-only).
DROP POLICY IF EXISTS "settings public read" ON site_settings;
CREATE POLICY "settings public read" ON site_settings FOR SELECT USING (TRUE);

-- ----------------------------------------------------------------------------
-- 3. ORDERS — invoice number for receipts
-- ----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'ARW-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_invoice_number ON orders;
CREATE TRIGGER orders_invoice_number
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ----------------------------------------------------------------------------
-- 4. TESTIMONIALS — editable from the admin panel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  role          TEXT DEFAULT '',
  quote         TEXT NOT NULL,
  rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  product_label TEXT,
  gradient      TEXT DEFAULT 'linear-gradient(135deg,#C9A84C,#E2C97E)',
  is_featured   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
DROP TRIGGER IF EXISTS testimonials_updated_at ON testimonials;
CREATE TRIGGER testimonials_updated_at BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials public read" ON testimonials;
DROP POLICY IF EXISTS "testimonials admin all"   ON testimonials;
CREATE POLICY "testimonials public read" ON testimonials FOR SELECT USING (is_active = TRUE);
CREATE POLICY "testimonials admin all" ON testimonials FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

INSERT INTO testimonials (name, role, quote, rating, product_label, gradient, is_featured, sort_order) VALUES
  ('Amara N.',  'Verified buyer · London',          'Genuinely the most beautiful planner I have ever used. The hyperlinks make it so fast to navigate that I have finally stuck to a routine — and it looks gorgeous on my iPad every single morning.', 5, 'Ultimate Digital Planner', 'linear-gradient(135deg,#B8A9D4,#7B6FAE)', TRUE, 0),
  ('Daniel K.', 'Verified buyer · GoodNotes user',  'Downloaded it in seconds and had it set up before my coffee was ready. Worth every penny.', 5, 'Budget Planner', 'linear-gradient(135deg,#C9A84C,#E2C97E)', FALSE, 1),
  ('Priya S.',  'Verified buyer · Manchester',      'I have bought planners I never opened. This one I actually look forward to — the design just makes you want to plan.', 5, 'Wellness Journal', 'linear-gradient(135deg,#E8C5C0,#C9847C)', FALSE, 2),
  ('Tomas R.',  'Verified buyer · Notability user', 'The layouts are gorgeous and the tabs just work. Easily my favourite purchase this year.', 5, 'Academic Planner', 'linear-gradient(135deg,#A8B5A0,#6E7E66)', FALSE, 3),
  ('Lena M.',   'Verified buyer · Berlin',          'A game-changer for my study system — everything finally lives in one tidy, hyperlinked notebook.', 5, '66-Day Habit Tracker', 'linear-gradient(135deg,#C97B5A,#AE6244)', FALSE, 4),
  ('Sophie L.', 'Verified buyer · Etsy',            'Changed how I plan my entire week. I keep recommending it to everyone at work.', 5, 'Student Planner', 'linear-gradient(135deg,#B8A9D4,#7B6FAE)', FALSE, 5),
  ('Nadia B.',  'Verified buyer · Gumroad',         'Beautiful, calm and genuinely useful. Printed the A5 size too and it looks just as lovely on paper.', 5, 'Digital Notebook', 'linear-gradient(135deg,#C9A84C,#C28E1C)', FALSE, 6)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. NAVIGATION LINKS — header + footer, editable from the admin panel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL,
  href       TEXT NOT NULL DEFAULT '#',
  location   TEXT NOT NULL DEFAULT 'header'
             CHECK (location IN ('header','footer_shop','footer_company','footer_support')),
  parent_id  UUID REFERENCES nav_links(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
DROP TRIGGER IF EXISTS nav_links_updated_at ON nav_links;
CREATE TRIGGER nav_links_updated_at BEFORE UPDATE ON nav_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE nav_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nav public read" ON nav_links;
DROP POLICY IF EXISTS "nav admin all"   ON nav_links;
CREATE POLICY "nav public read" ON nav_links FOR SELECT USING (is_active = TRUE);
CREATE POLICY "nav admin all" ON nav_links FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

-- Header top-level
INSERT INTO nav_links (label, href, location, sort_order) VALUES
  ('Shop',              '/shop',          'header', 1),
  ('Categories',        '/shop/category', 'header', 2),
  ('Digital Notebooks', '/notebooks',     'header', 3),
  ('Best Sellers',      '/best-sellers',  'header', 4),
  ('New Arrivals',      '/new-arrivals',  'header', 5),
  ('Blog',              '/blog',          'header', 6),
  ('About',             '/about',         'header', 7)
ON CONFLICT DO NOTHING;

-- Categories dropdown children
INSERT INTO nav_links (label, href, location, parent_id, sort_order)
SELECT v.label, v.href, 'header', p.id, v.ord
FROM (VALUES
  ('Digital Planners',   '/shop/category/digital-planners',   1),
  ('Printable Planners', '/shop/category/printable-planners', 2),
  ('Budget Planners',    '/shop/category/budget-planners',    3),
  ('Student Planners',   '/shop/category/student-planners',   4),
  ('Wellness Planners',  '/shop/category/wellness-planners',  5),
  ('Business Planners',  '/shop/category/business-planners',  6),
  ('Habit Trackers',     '/shop/category/habit-trackers',     7),
  ('ADHD Planners',      '/shop/category/adhd-planners',      8),
  ('Planner Bundles',    '/shop/category/planner-bundles',    9),
  ('Digital Notebooks',  '/notebooks',                       10)
) AS v(label, href, ord)
JOIN nav_links p ON p.label = 'Categories' AND p.location = 'header' AND p.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM nav_links c WHERE c.parent_id = p.id AND c.label = v.label
);

-- Digital Notebooks dropdown children
INSERT INTO nav_links (label, href, location, parent_id, sort_order)
SELECT v.label, v.href, 'header', p.id, v.ord
FROM (VALUES
  ('Ready-Made vs Personalised', '/site#digital-notebooks',  1),
  ('Personalised Notebooks',     '/notebooks/personalized',  2),
  ('General Notebooks',          '/notebooks/general',       3)
) AS v(label, href, ord)
JOIN nav_links p ON p.label = 'Digital Notebooks' AND p.location = 'header' AND p.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM nav_links c WHERE c.parent_id = p.id AND c.label = v.label
);

-- Footer columns
INSERT INTO nav_links (label, href, location, sort_order) VALUES
  ('Digital Planners',   '/shop/category/digital-planners',   'footer_shop', 1),
  ('Printable Planners', '/shop/category/printable-planners', 'footer_shop', 2),
  ('Budget Planners',    '/shop/category/budget-planners',    'footer_shop', 3),
  ('Student Planners',   '/shop/category/student-planners',   'footer_shop', 4),
  ('Wellness Planners',  '/shop/category/wellness-planners',  'footer_shop', 5),
  ('Habit Trackers',     '/shop/category/habit-trackers',     'footer_shop', 6),
  ('Planner Bundles',    '/shop/category/planner-bundles',    'footer_shop', 7),
  ('Digital Notebooks',  '/notebooks',                        'footer_shop', 8),
  ('About Us',      '/about',        'footer_company', 1),
  ('Blog',          '/blog',         'footer_company', 2),
  ('Best Sellers',  '/best-sellers', 'footer_company', 3),
  ('New Arrivals',  '/new-arrivals', 'footer_company', 4),
  ('Contact',       '/contact',      'footer_company', 5),
  ('FAQ',           '/faq',          'footer_support', 1),
  ('Privacy Policy','/privacy',      'footer_support', 2),
  ('Terms of Service','/terms',      'footer_support', 3),
  ('Refund Policy', '/refund',       'footer_support', 4)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SITE CONTENT — editable copy consumed by the storefront
-- ----------------------------------------------------------------------------
INSERT INTO site_settings (key, value) VALUES
  ('announcement_text',    to_jsonb('✦ Free instant download on all digital planners · Shop Now ✦'::text)),
  ('hero_headline',        to_jsonb('Plan your best life,'::text)),
  ('hero_headline_accent', to_jsonb('beautifully.'::text)),
  ('hero_subcopy',         to_jsonb('Hyperlinked planners & notebooks designed to make organising a joy — instant download, ready for GoodNotes, Notability or print.'::text)),
  ('hero_eyebrow',         to_jsonb('Premium digital & printable planners'::text)),
  ('stats_rating',         to_jsonb('4.9'::text)),
  ('stats_reviews',        to_jsonb('2,400+'::text)),
  ('stats_customers',      to_jsonb('50,000+'::text)),
  ('social_instagram',     to_jsonb('https://instagram.com/arwignplanners'::text)),
  ('social_youtube',       to_jsonb('https://youtube.com/@arwignplanners'::text)),
  ('social_pinterest',     to_jsonb('https://pinterest.com/arwignplanners'::text)),
  ('social_tiktok',        to_jsonb('https://tiktok.com/@arwignplanners'::text)),
  ('footer_blurb',         to_jsonb('Premium digital & printable planners designed to make organising a joy. Instant download, lifetime access.'::text))
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. BLOG — seed the 8 existing articles into the CMS
-- ----------------------------------------------------------------------------
INSERT INTO blog_posts (title, slug, excerpt, body, cover_image, category, tags, read_time_mins, view_count, status, published_at)
VALUES
(
  'How a Digital Planner Changed My Morning Routine Forever',
  'digital-planner-morning-routine',
  'We all know the theory: start your morning with intention and the rest of the day follows. But knowing and doing are very different things. Here''s how switching to a digital planner on my iPad turned chaotic mornings into calm, purposeful ones — and the exact template I use every single day.',
  E'We all know the theory: start your morning with intention and the rest of the day follows. But knowing and doing are very different things.\n\n## The problem with paper\n\nFor years my mornings started with a frantic search — for my notebook, for a working pen, for the page where yesterday''s list lived. By the time I found everything, the calm I was chasing had already evaporated.\n\n## The switch\n\nMoving my planning to an iPad changed the physics of the habit. My planner is always in the same place, always open to today, and the hyperlinked tabs mean the monthly view, habit tracker and gratitude log are one tap apart.\n\n## My 15-minute morning template\n\n1. **Three priorities** — not ten. Three things that would make today a win.\n2. **Time-block the first two hours** — the rest of the day can flex.\n3. **One line of gratitude** — it takes twenty seconds and reframes everything.\n\n## The result\n\nSix months in, I haven''t missed a morning. Not because I became more disciplined — because the friction disappeared. That''s the real secret of any routine: make the right thing the easy thing.',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80',
  'Lifestyle', ARRAY['morning routine','digital planning','productivity'], 6, 4821, 'published', '2025-05-15T08:00:00Z'
),
(
  'GoodNotes vs Notability: Which App Pairs Best With Your Planner?',
  'goodnotes-vs-notability-planner',
  'Both apps are excellent. Both have passionate loyalists. And both work beautifully with Arwign planner templates — but in different ways. After testing every major feature side by side, here''s our honest breakdown to help you pick the right app for how you actually plan.',
  E'Both apps are excellent. Both have passionate loyalists. And both work beautifully with Arwign planner templates — but in different ways.\n\n## Where GoodNotes wins\n\n- **Hyperlink handling** — tabs in a hyperlinked planner feel instant.\n- **Folder organisation** — nested folders keep multiple planners tidy.\n- **Templates & stickers** — the elements sidebar is perfect for digital stickers.\n\n## Where Notability wins\n\n- **Audio recording** — brilliant for students annotating lectures.\n- **Continuous scroll** — some people simply prefer a vertical flow.\n- **Quick notes** — faster capture when you just need to jot.\n\n## Our verdict\n\nIf your planner is the centre of your system, choose **GoodNotes** — hyperlinks and tabs feel native. If you take heavy notes around your planning, **Notability** may suit you better. Every Arwign planner ships as a standard PDF, so it works perfectly in both — and you can switch apps without repurchasing.',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
  'Digital Tools', ARRAY['GoodNotes','Notability','iPad','apps'], 8, 7340, 'published', '2025-05-02T09:00:00Z'
),
(
  'The Science Behind the 66-Day Habit Loop (And How to Use It)',
  'science-66-day-habit-loop',
  'You''ve probably heard that habits take 21 days to form. That number is a myth. Research from University College London puts the actual average at 66 days — and the range is 18 to 254 days depending on the person and habit. Here''s what that means for how you use your habit tracker.',
  E'You''ve probably heard that habits take 21 days to form. That number is a myth.\n\n## Where 66 days comes from\n\nIn a University College London study, researchers followed 96 people building new habits. On average, behaviours became automatic after **66 days** — with a range from 18 to 254 days depending on the habit''s complexity and the person.\n\n## What this means for your tracker\n\n- **Don''t quit at day 21.** You''re barely a third of the way to automaticity.\n- **Missing one day doesn''t matter.** The study found single lapses had no measurable effect on habit formation.\n- **Simple habits stick faster.** Drinking water after breakfast beats "exercise more".\n\n## How to run a 66-day cycle\n\n1. Pick **one** habit and anchor it to an existing routine.\n2. Track it daily — a single tick, nothing elaborate.\n3. Review weekly: streaks tell you what''s working; gaps tell you where friction lives.\n\nOur 66-Day Habit Tracker is built around exactly this research — one habit, one page, sixty-six honest ticks.',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
  'Productivity', ARRAY['habits','habit tracker','science','routine'], 7, 5902, 'published', '2025-04-20T10:00:00Z'
),
(
  'Budget Planning 101: How to Use a Monthly Tracker to Save More',
  'budget-planning-monthly-tracker-guide',
  'Most people who buy a budget planner use it for exactly two weeks. Not because they''re lazy — because nobody showed them a simple system. This guide walks through the exact method we built our budget planner around, step by step, month by month.',
  E'Most people who buy a budget planner use it for exactly two weeks. Not because they''re lazy — because nobody showed them a simple system.\n\n## Step 1: Know your real numbers\n\nBefore any budgeting method works, spend one month simply recording. No judgement, no targets — just an honest picture of where money actually goes.\n\n## Step 2: The 50/30/20 starting point\n\n- **50%** needs — rent, food, transport, bills\n- **30%** wants — the things that make life enjoyable\n- **20%** savings and debt repayment\n\nTreat these as a starting point, not a rule. The point is having *any* deliberate split.\n\n## Step 3: The weekly ten-minute review\n\nEvery Sunday, ten minutes: update the tracker, compare against your split, and choose one adjustment for the week ahead. This tiny ritual is the entire difference between people who budget and people who own budget planners.\n\n## Step 4: Pay yourself first\n\nMove savings the day you''re paid — not at the end of the month. What''s left is what you can spend, and the tracker keeps that honest.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  'Finance', ARRAY['budget','savings','money','finance tracker'], 9, 6455, 'published', '2025-04-08T08:00:00Z'
),
(
  'Why Undated Planners Are Actually the Smarter Choice',
  'why-undated-planners-are-better',
  'Dated planners give you one chance per year. Miss a week in March and you''re looking at a stack of wasted pages every time you open the cover. Undated planners meet you where you are — every month, every year, on your terms. Here''s why we design every Arwign planner undated by default.',
  E'Dated planners give you one chance per year. Miss a week in March and you''re looking at a stack of wasted pages every time you open the cover.\n\n## The guilt problem\n\nEmpty dated pages are a small, silent accusation. Research on habit formation shows that perceived failure is one of the strongest predictors of abandoning a routine — and a dated planner manufactures that feeling on schedule.\n\n## Undated means unlimited\n\n- **Start any day.** January 1st is not a prerequisite for organising your life.\n- **Skip without waste.** A chaotic fortnight costs you nothing.\n- **Reuse forever.** A digital undated planner can be duplicated for every new year, free.\n\n## The one discipline it asks of you\n\nWrite the date yourself. That five-second act is genuinely useful — it makes opening the planner a deliberate choice rather than an obligation.\n\nThat''s why every Arwign planner is undated by default: your planner should fit your life, never the other way round.',
  'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80',
  'Planning', ARRAY['undated planner','planning tips','flexibility'], 5, 3187, 'published', '2025-03-25T09:00:00Z'
),
(
  'The Student Planner Guide: Ace Your Academic Year From Day One',
  'student-planner-guide-academic-year',
  'University schedules are chaotic. Deadlines, lectures, reading lists, part-time jobs, and a social life — all competing for the same 168 hours every week. This guide shows you how to use your academic planner to stay on top of it all without burning out.',
  E'University schedules are chaotic. Deadlines, lectures, reading lists, part-time jobs, and a social life — all competing for the same 168 hours every week.\n\n## Set up in week zero\n\nBefore term starts, spend one evening loading the fixed landscape into your planner: lecture times, seminar slots, assessment deadlines, exam windows. Everything else gets planned *around* these.\n\n## The weekly spread is your command centre\n\n- **Sunday evening:** map the week — deadlines first, then study blocks, then everything else.\n- **Colour-code by module.** Your eye learns to scan a week in seconds.\n- **Leave white space.** A plan with no slack breaks the first time anything runs over.\n\n## Beat the deadline pile-up\n\nFor every assignment, work backwards: submission date, then draft date, then research-complete date. Three small deadlines are manageable; one big one is a crisis.\n\n## Protect the rest\n\nSchedule the fun properly — societies, gym, nights out. A planner that only contains work is a planner you''ll stop opening by November.',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80',
  'Student Life', ARRAY['student','academic planner','university','study tips'], 10, 8901, 'published', '2025-03-10T08:00:00Z'
),
(
  'Self-Care Isn''t Selfish: Building a Wellness Routine That Sticks',
  'self-care-wellness-routine-that-sticks',
  'The problem with most wellness routines isn''t motivation — it''s design. They''re either too rigid, too vague, or built around someone else''s life. Here''s how to design a personal wellness system using your planner that actually fits the life you have, not the one you wish you had.',
  E'The problem with most wellness routines isn''t motivation — it''s design. They''re either too rigid, too vague, or built around someone else''s life.\n\n## Start from your energy, not your aspirations\n\nA wellness routine designed for the person you wish you were will last a week. Design for your actual energy: if mornings are chaos, an elaborate 6am ritual is a plan to fail.\n\n## The three-layer system\n\n1. **Daily non-negotiables** — tiny, two-minute anchors: water, a stretch, one line in a mood log.\n2. **Weekly commitments** — the bigger blocks: a proper walk, a screen-free evening, meal prep.\n3. **Monthly check-ins** — one page reviewing what nourished you and what drained you.\n\n## Track feelings, not just actions\n\nA tick says you did the thing. A mood score says whether it''s working. Over a month, the pattern between the two tells you which habits actually deserve your time.\n\n## Let it evolve\n\nYour routine should look different in exam season, in winter, in hard weeks. A planner isn''t a contract — it''s a conversation with yourself.',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
  'Wellness', ARRAY['self-care','wellness','mental health','routine'], 6, 4213, 'published', '2025-02-18T08:00:00Z'
),
(
  '10 Digital Planning Tips Every iPad Beginner Should Know',
  'digital-planning-tips-ipad-beginners',
  'Switching from paper to digital planning feels overwhelming at first. Which stylus? Which app? How do hyperlinks work? Does it feel as satisfying as pen on paper? We answer all of it — plus share 10 tips we wish we''d known in our first month of digital planning.',
  E'Switching from paper to digital planning feels overwhelming at first. Here are the ten tips we wish we''d known in month one.\n\n1. **Import the planner properly.** Open the PDF *in* your planning app (GoodNotes: Import; Notability: share into the app) — don''t just view it in the Files app.\n2. **Trust the hyperlinks.** Tap the tabs. A hyperlinked planner is navigated, not scrolled.\n3. **Use a matte screen protector.** It adds just enough friction to make writing feel like paper.\n4. **Zoom in to write.** Pinch to zoom, write comfortably large, zoom out — your handwriting will thank you.\n5. **Duplicate before you start.** Keep a clean master copy so next year''s planner is one tap away.\n6. **Learn the lasso tool.** Moving a task to tomorrow beats rewriting it.\n7. **Build a sticker library.** Screenshot anything you reuse — headers, icons, meal plans.\n8. **Turn off notifications while planning.** Ten calm minutes beats thirty distracted ones.\n9. **Back up to the cloud.** Enable iCloud/Drive sync on day one, not after a scare.\n10. **Give it three weeks.** The paper nostalgia fades exactly around the time the convenience becomes irreplaceable.',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
  'Digital Tools', ARRAY['iPad','digital planning','beginners','tips'], 7, 9412, 'published', '2025-02-03T09:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. PLANNER GENERATOR — templates the admin can fire with one click
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  description       TEXT DEFAULT '',
  template_key      TEXT NOT NULL,            -- generator engine key (daily/weekly/budget/habit/gratitude/meal/fitness/study)
  accent_hex        TEXT DEFAULT '#C9A84C',
  price             NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  compare_price     NUMERIC(10,2),
  category_slug     TEXT NOT NULL DEFAULT 'digital-planners',
  page_count        INTEGER DEFAULT 30,
  is_active         BOOLEAN DEFAULT TRUE,
  sort_order        INTEGER DEFAULT 0,
  last_generated_at TIMESTAMPTZ,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
DROP TRIGGER IF EXISTS planner_templates_updated_at ON planner_templates;
CREATE TRIGGER planner_templates_updated_at BEFORE UPDATE ON planner_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE planner_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "templates admin all" ON planner_templates;
CREATE POLICY "templates admin all" ON planner_templates FOR ALL
  USING (get_my_role() IN ('admin','super_admin'))
  WITH CHECK (get_my_role() IN ('admin','super_admin'));

INSERT INTO planner_templates (name, slug, description, template_key, accent_hex, price, compare_price, category_slug, page_count, sort_order) VALUES
  ('Daily Focus Planner',        'daily-focus-planner',        'Undated daily pages with top-3 priorities, time-blocked schedule, gratitude line and notes.',              'daily',     '#C9A84C', 9.99,  14.99, 'digital-planners',   35, 1),
  ('Weekly Overview Planner',    'weekly-overview-planner',    'Undated weekly spreads with goals, habit row, priorities and a Sunday review page.',                     'weekly',    '#7B6FAE', 9.99,  14.99, 'digital-planners',   30, 2),
  ('Monthly Budget Planner',     'monthly-budget-planner-auto','Income, expense and savings trackers with monthly summaries and a 50/30/20 worksheet.',                  'budget',    '#6E7E66', 11.99, 17.99, 'budget-planners',    28, 3),
  ('66-Day Habit Tracker',       '66-day-habit-tracker-auto',  'Science-based 66-day habit loop tracker with weekly reflections and streak pages.',                      'habit',     '#C97B5A', 7.99,  11.99, 'habit-trackers',     22, 4),
  ('Gratitude Journal',          'gratitude-journal-auto',     'Daily gratitude prompts, weekly reflections and monthly highlights pages.',                              'gratitude', '#C9847C', 8.99,  12.99, 'wellness-planners',  32, 5),
  ('Weekly Meal Planner',        'weekly-meal-planner-auto',   'Weekly meal grids, grocery lists, pantry inventory and favourite-recipes pages.',                        'meal',      '#83AE73', 8.99,  12.99, 'meal-planners',      26, 6),
  ('Fitness & Workout Log',      'fitness-workout-log-auto',   'Workout logs, measurement trackers, weekly cardio/strength splits and progress reviews.',                'fitness',   '#B8860B', 9.99,  13.99, 'wellness-planners',  30, 7),
  ('Study Session Planner',      'study-session-planner-auto', 'Exam countdowns, revision timetables, Pomodoro logs and assignment trackers for students.',              'study',     '#5B7B9A', 8.99,  12.99, 'student-planners',   28, 8)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKETS
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', TRUE),
  ('blog-images',    'blog-images',    TRUE),
  ('site-assets',    'site-assets',    TRUE),
  ('product-files',  'product-files',  FALSE),
  ('freebies',       'freebies',       FALSE)
ON CONFLICT (id) DO NOTHING;

-- Public read for the public buckets (uploads happen server-side with the
-- service role key, which bypasses RLS — no write policies needed here).
-- Wrapped so a permissions quirk on storage.objects can never abort the run;
-- public buckets are served via their public URLs regardless.
DO $storagepolicy$
BEGIN
  DROP POLICY IF EXISTS "public read public buckets" ON storage.objects;
  CREATE POLICY "public read public buckets" ON storage.objects FOR SELECT
    USING (bucket_id IN ('product-images', 'blog-images', 'site-assets'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped storage policy creation: %', SQLERRM;
END
$storagepolicy$;

-- ============================================================================
-- DONE. After running this script:
--  1. Sign up on the site with adoyodavid4@gmail.com — the account is
--     automatically an admin (or it is promoted if it already exists).
--  2. Storage buckets are created; no dashboard steps needed.
-- ============================================================================


-- ============================================================================
-- FINAL: backfill profiles for any auth accounts that already exist
-- (Section 0 wiped the profiles table; this restores a profile row for every
--  existing signed-up user and re-promotes the store owner to admin.)
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  CASE WHEN lower(u.email) IN ('adoyodavid4@gmail.com', 'admin@arwignplanners.com')
       THEN 'admin'::user_role ELSE 'customer'::user_role END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ALL DONE. Next: sign in (or sign up) on the site with
-- adoyodavid4@gmail.com - that account is the admin.
-- ============================================================================