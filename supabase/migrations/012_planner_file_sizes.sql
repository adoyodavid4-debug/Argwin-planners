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
