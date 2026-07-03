-- ============================================================================
-- 013_complete_platform.sql
-- Completes the platform: auth/admin bootstrap, RLS for previously-open
-- tables, editable site content (settings/nav/testimonials/blog seeds),
-- planner generator templates, invoice numbers, and storage buckets.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. AUTH BOOTSTRAP — auto-create a profile for every new auth user,
--    and make the store owner an admin automatically.
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RLS for tables that previously had none
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3. ORDERS — invoice number for receipts
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 4. TESTIMONIALS — editable from the admin panel
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 5. NAVIGATION LINKS — header + footer, editable from the admin panel
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 6. SITE CONTENT — editable copy consumed by the storefront
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 7. BLOG — seed the 8 existing articles into the CMS
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 8. PLANNER GENERATOR — templates the admin can fire with one click
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 9. STORAGE BUCKETS
-- ────────────────────────────────────────────────────────────────────────────
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
