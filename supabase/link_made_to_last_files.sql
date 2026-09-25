-- ============================================================
--  Link the MADE TO LAST. PDFs to their products.
--
--  WHY THIS EXISTS
--  The admin uploader POSTs files through a Vercel function, which
--  caps the request body at 4.5 MB. THE_LONG_YEAR_A4.pdf is ~7.9 MB,
--  so that upload fails with a 413 ("Request Entity Too Large").
--
--  FIX: upload the PDFs straight to Supabase Storage (no Vercel in
--  the path, no size cap), then run this to point the rows at them.
--
--  STEP 1 — Supabase Dashboard -> Storage -> bucket "product-files".
--    Upload each PDF into a folder named after its slug:
--       groundwork/GROUNDWORK_A4.pdf
--       the-long-year/THE_LONG_YEAR_A4.pdf
--       the-count/THE_COUNT_A4.pdf
--    (Create the folder, then "Upload file" into it. Keep the exact
--     paths/filenames below, or edit them here to match.)
--
--  STEP 2 — run this script in the SQL editor.
--
--  STEP 3 — set each product's status to Active (admin or SQL).
--
--  The MADE TO LAST. set has no file of its own: on purchase it
--  expands into the three books' downloads (lib/orders.ts), so it
--  needs nothing here beyond the three books being linked.
-- ============================================================

UPDATE products SET
  file_url      = 'groundwork/GROUNDWORK_A4.pdf',
  file_size_mb  = 3.5,
  planner_files = '{"a4":{"url":"groundwork/GROUNDWORK_A4.pdf","size_mb":3.5,"name":"GROUNDWORK_A4.pdf"}}'::jsonb,
  updated_at    = NOW()
WHERE slug = 'groundwork';

UPDATE products SET
  file_url      = 'the-long-year/THE_LONG_YEAR_A4.pdf',
  file_size_mb  = 7.9,
  planner_files = '{"a4":{"url":"the-long-year/THE_LONG_YEAR_A4.pdf","size_mb":7.9,"name":"THE_LONG_YEAR_A4.pdf"}}'::jsonb,
  updated_at    = NOW()
WHERE slug = 'the-long-year';

UPDATE products SET
  file_url      = 'the-count/THE_COUNT_A4.pdf',
  file_size_mb  = 2.1,
  planner_files = '{"a4":{"url":"the-count/THE_COUNT_A4.pdf","size_mb":2.1,"name":"THE_COUNT_A4.pdf"}}'::jsonb,
  updated_at    = NOW()
WHERE slug = 'the-count';

-- Optional: publish all four at once (uncomment to run).
-- UPDATE products SET status = 'active', published_at = NOW()
--  WHERE slug IN ('groundwork', 'the-long-year', 'the-count', 'made-to-last');
