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
