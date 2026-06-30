-- ============================================================
--  Arwign Planners — Fix RLS infinite recursion + seed categories
--  Run this in the Supabase SQL editor
-- ============================================================

-- ── 1. Fix infinite recursion in RLS policies ────────────────
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


-- ── 2. Seed categories (empty because 001 INSERT was skipped) ─

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
