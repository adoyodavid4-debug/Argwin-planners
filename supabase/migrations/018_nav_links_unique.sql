-- ────────────────────────────────────────────────────────────────────────────
-- 018. NAV_LINKS DEDUPE GUARD
--
-- Root cause of the "duplicated header links" bug: nav_links had NO unique
-- constraint, so the `ON CONFLICT DO NOTHING` in the seed (migration 013 /
-- SETUP_FROM_ZERO.sql) silently did nothing when the setup was run twice —
-- every header + footer link got inserted a second time.
--
-- This migration (1) removes any remaining duplicate rows, then (2) adds a
-- unique index so a repeated seed can never duplicate links again.
-- Safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Remove duplicates, keeping the earliest row of each logical link.
--    parent_id is NULL for top-level items, so COALESCE it to a sentinel UUID
--    to make (location, parent, label, href) a complete grouping key.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY location,
                        COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
                        label, href
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM nav_links
)
DELETE FROM nav_links
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Prevent recurrence. A partial-free expression index treats NULL parents
--    as the sentinel so top-level links are also covered by the uniqueness rule.
CREATE UNIQUE INDEX IF NOT EXISTS nav_links_unique_link
  ON nav_links (
    location,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    label,
    href
  );
