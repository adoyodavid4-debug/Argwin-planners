-- ─── S1: Curated bundle collections ─────────────────────────
-- Backfills bundle_items on the two original bundles, then adds
-- 8 themed bundle products (Calm Collection, New Mum Kit,
-- Neurodivergent Set + 5 more) assembled from the existing
-- catalog. Each references its component products by slug so
-- the product page can render a real "what's included" list and
-- ItemList schema.

-- ── Backfill existing bundles ─────────────────────────────────
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

-- ── New curated bundles ────────────────────────────────────────
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
