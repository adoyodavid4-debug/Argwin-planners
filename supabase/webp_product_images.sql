-- ============================================================
--  Switch MADE TO LAST product images from PNG to WebP.
--  The .webp files ship in the same folders (69% smaller); the
--  original .png files stay hosted (email clients need them).
--  Run AFTER the deploy containing the .webp files is live.
--  Safe to re-run.
-- ============================================================

UPDATE products
   SET thumbnail  = replace(thumbnail, '.png', '.webp'),
       images     = (SELECT coalesce(array_agg(replace(u, '.png', '.webp')), '{}')
                       FROM unnest(images) AS u),
       updated_at = NOW()
 WHERE slug IN ('groundwork', 'the-long-year', 'the-count', 'made-to-last')
   AND thumbnail LIKE '/products/made-to-last/%.png';

-- Blog covers are Unsplash-hosted — unaffected.
SELECT slug, thumbnail FROM products
 WHERE slug IN ('groundwork', 'the-long-year', 'the-count', 'made-to-last');
