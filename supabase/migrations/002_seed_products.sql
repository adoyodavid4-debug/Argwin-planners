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

-- ── Digital Planners ────────────────────────────────────────
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

-- ── Printable Planners ───────────────────────────────────────
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

-- ── Budget Planners ──────────────────────────────────────────
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

-- ── Student Planners ─────────────────────────────────────────
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

-- ── Wellness Planners ────────────────────────────────────────
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

-- ── Habit Trackers ───────────────────────────────────────────
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

-- ── Planner Bundles ──────────────────────────────────────────
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
