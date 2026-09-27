-- ============================================================
--  TEST RECEIPT EMAIL — creates one flagged test order so the
--  real production order-confirmation email can be triggered.
--
--  What it does:
--   1. Picks your most-downloaded ACTIVE product that has a real
--      file (so the Download button in the email actually works).
--   2. Inserts a completed test order for adoyodavid4@gmail.com
--      with a known id, flagged metadata.test_order = true.
--
--  Run the whole script in the Supabase SQL editor, then tell
--  Claude "done" — the return-page visit that actually fires the
--  email happens from the public site, not from here.
--
--  The final SELECT shows which product was used.
-- ============================================================

WITH prod AS (
  SELECT id, title, price
    FROM products
   WHERE status = 'active'
     AND file_url IS NOT NULL
   ORDER BY download_count DESC
   LIMIT 1
),
ins_order AS (
  INSERT INTO orders (
    id, email, status, payment_method,
    amount_subtotal, amount_discount, amount_total, currency, metadata
  )
  SELECT
    '61ffa8a4-75c4-4829-9e85-f46c6a006fe7',
    'adoyodavid4@gmail.com',
    'completed',
    'paystack',
    p.price, 0, p.price, 'usd',
    '{"test_order": true}'::jsonb
  FROM prod p
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, title, price, quantity)
SELECT '61ffa8a4-75c4-4829-9e85-f46c6a006fe7', p.id, p.title, p.price, 1
  FROM prod p
RETURNING title AS product_used, price;

-- ============================================================
--  CLEANUP (run later, once you're happy with the email):
--  deletes the test order + items. The download links in the
--  test email stop working after this — that's expected.
-- ============================================================
-- DELETE FROM order_items WHERE order_id = '61ffa8a4-75c4-4829-9e85-f46c6a006fe7';
-- DELETE FROM orders      WHERE id       = '61ffa8a4-75c4-4829-9e85-f46c6a006fe7';
