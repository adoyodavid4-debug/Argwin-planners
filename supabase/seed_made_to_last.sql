-- ============================================================
--  MADE TO LAST.  —  three linked planners + the set
--  GROUNDWORK. · THE LONG YEAR. · THE COUNT. · MADE TO LAST. (set)
--
--  Built from the marketing listings in
--    New Designs/Made to Last/**/Listings.md
--  Product images are served from /public (committed with the app):
--    /products/made-to-last/<book>/...
--
--  Run once in the Supabase SQL editor (production).
--  Re-runnable: it deletes the four slugs first, then re-inserts.
--
--  Products are created as DRAFT. Before publishing each one:
--    1. Admin -> Products -> edit -> upload the A4 PDF (A4 slot).
--       (The PDFs live in the PRIVATE product-files bucket and are
--        served via signed download links — they can't come from
--        /public.)
--    2. Flip status to "Active".
--  The set delivers the three books' files, so it goes live once
--  GROUNDWORK., THE LONG YEAR. and THE COUNT. each have a PDF.
--
--  NOTE: GROUNDWORK.'s own 8 marketing images were not in the
--  source folder, so it currently uses the single cover taken from
--  the set marketing. Drop its real images into
--  /public/products/made-to-last/groundwork/ and add them to the
--  images array to complete its gallery.
-- ============================================================

-- ── Make sure the two categories exist ──────────────────────
INSERT INTO categories (name, slug, icon, sort_order, is_featured) VALUES
  ('Business Planners', 'business-planners', 'briefcase', 6,  TRUE),
  ('Planner Bundles',   'planner-bundles',   'package',   13, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ── Clean slate for these four products ─────────────────────
DELETE FROM products
 WHERE slug IN ('groundwork', 'the-long-year', 'the-count', 'made-to-last');

-- ============================================================
--  BOOK ONE — GROUNDWORK.
-- ============================================================
INSERT INTO products (
  title, slug, description,
  category_id, status, delivery_type,
  price, compare_price, currency,
  thumbnail, images, file_formats, page_count,
  meta_title, meta_description, meta_keywords, tags,
  is_featured, is_new, published_at
) VALUES (
  'GROUNDWORK. — Business Planner for Makers',
  'groundwork',
  $html$<p><strong>Your craft deserves a business built to last.</strong></p>
<p>GROUNDWORK. is the foundations planner for the solo creative turning craft into income. It's for makers, digital product sellers, commission artists and people who teach their craft. Work through it once a year, in depth, and come back to it whenever you need to remember what you're building and why.</p>
<p>It's 160 fully hyperlinked A4 pages for GoodNotes, Notability and other PDF annotation apps. It's undated and currency-neutral, so you can start any month and write your figures in your own currency.</p>
<h2>What's inside — 12 tabbed sections</h2>
<h3>01 · Where You Stand (11 pages)</h3>
<p>Business snapshot, craft and skills inventory, skills gap, a one-week time audit, energy map, income sources, customer feedback recap, SWOT and your starting line.</p>
<h3>02 · Why & Direction (9 pages)</h3>
<p>Why you make, core values, a letter from three years ahead, a vision board, a one-year picture, your "enough" number, non-negotiables, and a direction statement with a decision filter.</p>
<h3>03 · The Craft & Offer (25 pages)</h3>
<p>Product line map, offer ladder, signature offer, 10 product development sheets, 2 collection planners, services and commissions menu, workshop design, digital product ideas, idea bank, quality standards, a materials library, and a keep, improve or retire review.</p>
<h3>04 · The Customer (13 pages)</h3>
<p>3 customer profiles, where your customers spend time, a customer journey map, buying triggers and objections, a voice-of-customer log, FAQ bank, customer promise and a testimonial plan.</p>
<h3>05 · Brand & Story (11 pages)</h3>
<p>Brand foundations with personality sliders, origin story, your story in three lengths, visual identity, voice and tone, a word list, photography plan, shot list, About page draft and a bio kit.</p>
<h3>06 · Pricing Foundations (11 pages)</h3>
<p>Pricing principles, a price positioning map, and pricing models for made goods, digital products, commissions and workshops. Plus price tiers, discount policy, a competitor price scan and your pricing rules.</p>
<h3>07 · Channels & Selling (13 pages)</h3>
<p>Channel map and scorecard, marketplace or own shop, website plan, social media plan, email list plan, markets and fairs kit list, wholesale readiness and terms, stockists and collaborations.</p>
<h3>08 · Systems & Operations (21 pages)</h3>
<p>Ideal week, weekly Make / Sell / Admin rhythm, order and commission workflow maps, 8 SOP templates, tools and software, accounts register, supplier directory, studio set-up, packing and shipping standards, and a batch-making plan.</p>
<h3>09 · Admin & Protection (13 pages)</h3>
<p>Business set-up checklist, key documents, returns and shipping policy builders, commission terms, agreements checklist, designs and IP register, licensing, risk review, renewals and professional contacts.</p>
<h3>10 · Capacity & Wellbeing (7 pages)</h3>
<p>Capacity planner, boundaries, early warning signs, a rest plan, busy and slow season planning, and your support network.</p>
<h3>11 · Growth Map (9 pages)</h3>
<p>Milestones, skills to build, an experiments backlog, 2 experiment cards, twelve-month priorities, and handover pages to THE LONG YEAR. and THE COUNT.</p>
<h3>12 · Notes (12 pages)</h3>
<p>Lined, dot-grid and blank pages.</p>
<h2>How it's linked</h2>
<ul>
<li>Side tabs on every page jump to any section.</li>
<li>Contents and a full page-by-page index, every line linked.</li>
<li>Each section opener lists and links all of its pages.</li>
<li>The product line map links to all 10 product sheets, and the procedures index to all 8 SOPs.</li>
<li>The Arwign Planners mark on every page takes you back to contents.</li>
<li>More than 2,700 internal links in total.</li>
</ul>
<h2>Good to know</h2>
<ul>
<li>A4 only (210 × 297 mm). There is no US Letter or A5 version in this listing.</li>
<li>Undated. Start any month, any year, and use it again next year.</li>
<li>Currency-neutral. No currency symbols are printed.</li>
<li>Works in GoodNotes, Notability, Noteshelf, Xodo and other apps that support PDF hyperlinks.</li>
<li>Duplicate any page you need more of inside your app.</li>
<li>Instant digital download. Nothing physical will be posted.</li>
<li>General guidance only. It is not legal, tax or financial advice.</li>
</ul>
<h2>Part of MADE TO LAST.</h2>
<p>GROUNDWORK. is book one of three linked planners:</p>
<ul>
<li><strong>GROUNDWORK.</strong> — the foundations (this book).</li>
<li><strong>THE LONG YEAR.</strong> — the undated operating year, with quarters, months and Make / Sell / Admin weeks.</li>
<li><strong>THE COUNT.</strong> — the money: costing, ledgers, profit and loss, and tax set-asides.</li>
</ul>
<p>Each book works on its own. Printed cross-references show which page of the next book to turn to. Buy all three together as the MADE TO LAST. set and save.</p>
<h2>How to start</h2>
<ol>
<li>Download the PDF after purchase.</li>
<li>Import it into your note-taking app.</li>
<li>Tap "Open the book" on the cover and begin.</li>
</ol>
<p>For personal use only. Please don't share, resell or redistribute the file.</p>$html$,
  (SELECT id FROM categories WHERE slug = 'business-planners'),
  'draft', 'digital',
  18.00, NULL, 'USD',
  '/products/made-to-last/groundwork/GROUNDWORK_cover.png',
  ARRAY[]::TEXT[],
  ARRAY['PDF', 'GoodNotes', 'Notability', 'Xodo'],
  160,
  'GROUNDWORK. — Craft Business Planner for Makers (A4)',
  'The foundations planner for the solo creative turning craft into income. 160 hyperlinked, undated A4 pages for GoodNotes & Notability. Part of MADE TO LAST.',
  ARRAY['craft business', 'small business plan', 'business planner', 'maker planner', 'handmade business', 'creative business', 'etsy seller planner', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner', 'pricing worksheet', 'product planner'],
  ARRAY['craft business', 'small business plan', 'business planner', 'maker planner', 'handmade business', 'creative business', 'etsy seller planner', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner', 'pricing worksheet', 'product planner'],
  TRUE, TRUE, NULL
);

-- ============================================================
--  BOOK TWO — THE LONG YEAR.
-- ============================================================
INSERT INTO products (
  title, slug, description,
  category_id, status, delivery_type,
  price, compare_price, currency,
  thumbnail, images, file_formats, page_count,
  meta_title, meta_description, meta_keywords, tags,
  is_featured, is_new, published_at
) VALUES (
  'THE LONG YEAR. — Undated Weekly Business Planner',
  'the-long-year',
  $html$<p><strong>A year of steady weeks builds a business that lasts.</strong></p>
<p>THE LONG YEAR. is the undated operating year for the solo creative turning craft into income. It works for makers, digital product sellers, commission artists and people who teach their craft. Every week is split into three lanes (Make, Sell and Admin), so no part of the business gets quietly neglected. Every month and every quarter ends with an honest review.</p>
<p>It's 420 fully hyperlinked A4 pages for GoodNotes, Notability and other PDF annotation apps. It's undated, so you can start in any month of any year.</p>
<h2>What's inside</h2>
<h3>Opening & The Year (16 pages)</h3>
<p>Contents and a year navigator that links every quarter, month and week. Then: before-the-year checklist, decisions carried forward from GROUNDWORK., annual intentions, goals by lane, annual targets, year at a glance, selling-season calendar, launch map, content pillars, key dates and a 53-week rhythm tracker.</p>
<h3>Four quarters (291 pages in total)</h3>
<p>Each quarter includes:</p>
<ul>
<li>A quarter opener, quarterly goals by lane, a 90-day plan, and a marketing & campaigns plan.</li>
<li>Three months, each with a month opener, an undated month calendar, a day-by-day agenda, a month plan by lane, a 31-day content calendar, a launches, markets & stock page, a numbers snapshot and a two-page month review.</li>
<li>13 or 14 weeks, each with a three-page spread: a week plan (focus, top three, Make / Sell / Admin task lanes, daily notes, money hour), hour-by-hour time blocks, and a Friday close-out (wins, numbers, what moved, energy check, next week's focus).</li>
<li>A two-page quarterly review: numbers and reflection.</li>
</ul>
<h3>Plans & Projects (75 pages)</h3>
<p>10 two-page project planners, 6 three-page launch planners (plan, countdown, results), 6 two-page market & event planners, a commission pipeline, 2 commission briefs, wholesale orders, stockist re-orders, collaborations, product and content idea banks, an improvements list and a 10-page order log.</p>
<h3>Year-end Review (6 pages)</h3>
<p>The year in numbers, wins and proudest moments, product and channel review, what the year taught me, and a letter to next year.</p>
<h3>Notes (32 pages)</h3>
<p>12 lined, 12 dot-grid and 6 blank pages.</p>
<h2>How it's linked</h2>
<ul>
<li>21 side tabs on every page: the year, each quarter, each month, plans, review and notes.</li>
<li>A year navigator linking all 53 weeks.</li>
<li>Plan · Time · Close-out links at the top of every week page, plus previous and next week.</li>
<li>Month openers list and link every page in the month.</li>
<li>The Arwign Planners mark on every page takes you back to contents.</li>
<li>More than 10,800 internal links in total.</li>
</ul>
<h2>Good to know</h2>
<ul>
<li>A4 only (210 × 297 mm).</li>
<li>Undated. Months are numbered 01–12 and weeks 01–53, so you write the dates in yourself.</li>
<li>Each quarter holds 13 weeks, split 4-4-5 across its months (the last quarter is 4-5-5, making 53 weeks).</li>
<li>Weeks start on Monday.</li>
<li>Works in GoodNotes, Notability and other apps that support PDF hyperlinks.</li>
<li>Instant digital download. Nothing physical will be posted.</li>
</ul>
<h2>Part of MADE TO LAST.</h2>
<ul>
<li><strong>GROUNDWORK.</strong> — the foundations.</li>
<li><strong>THE LONG YEAR.</strong> — the operating year (this book).</li>
<li><strong>THE COUNT.</strong> — the money.</li>
</ul>
<p>Each book works on its own. Cross-references show where the next step lives, and months 01–12 match THE COUNT. Buy all three together as the MADE TO LAST. set and save.</p>
<p>For personal use only. Please don't share, resell or redistribute the file.</p>$html$,
  (SELECT id FROM categories WHERE slug = 'business-planners'),
  'draft', 'digital',
  24.00, NULL, 'USD',
  '/products/made-to-last/the-long-year/THE_LONG_YEAR_01_hero.png',
  ARRAY[
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_02_inside.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_03_navigation.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_04_weeks.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_05_months.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_06_quarters.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_07_plans.png',
    '/products/made-to-last/the-long-year/THE_LONG_YEAR_08_details.png'
  ],
  ARRAY['PDF', 'GoodNotes', 'Notability'],
  420,
  'THE LONG YEAR. — Undated Weekly Business Planner (A4)',
  'An undated operating year for makers — 53 Make/Sell/Admin weeks, monthly plans and quarterly reviews across 420 hyperlinked A4 pages. Part of MADE TO LAST.',
  ARRAY['undated planner', 'weekly planner', 'business planner', 'maker planner', 'small business plan', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner', '90 day planner', 'content calendar', 'craft business', 'creative business'],
  ARRAY['undated planner', 'weekly planner', 'business planner', 'maker planner', 'small business plan', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner', '90 day planner', 'content calendar', 'craft business', 'creative business'],
  FALSE, TRUE, NULL
);

-- ============================================================
--  BOOK THREE — THE COUNT.
-- ============================================================
INSERT INTO products (
  title, slug, description,
  category_id, status, delivery_type,
  price, compare_price, currency,
  thumbnail, images, file_formats, page_count,
  meta_title, meta_description, meta_keywords, tags,
  is_featured, is_new, published_at
) VALUES (
  'THE COUNT. — Bookkeeping & Pricing Planner for Makers',
  'the-count',
  $html$<p><strong>Know what every piece costs, what every month earns and what's set aside for tax.</strong></p>
<p>THE COUNT. is the money book for the solo creative turning craft into income. It works for makers, digital product sellers, commission artists and people who teach their craft. It takes you from your minimum hourly rate to the year-end pack for your accountant, in calm, clear steps.</p>
<p>It's 220 fully hyperlinked A4 pages for GoodNotes, Notability and other PDF annotation apps. It's undated and currency-neutral: no currency symbols are printed anywhere.</p>
<h2>What's inside — 12 tabbed sections</h2>
<h3>01 · Money Foundations (6 pages, plus 5 opening pages)</h3>
<p>Money principles, separating business and personal money, a pay-yourself plan, the money rhythm (weekly, monthly, quarterly, yearly) and your income & expense categories.</p>
<h3>02 · Pricing & Costing (31 pages)</h3>
<p>Minimum hourly rate calculator, overheads calculator, 10 product costing sheets, 2 digital product pricing sheets, 6 commission quote builders, 2 workshop pricing sheets, wholesale & bundle pricing, a discount impact calculator, margin trackers, a current price list and a price-change log.</p>
<h3>03 · Ledgers (50 pages)</h3>
<p>A ledger guide, then income and expense ledgers for months 01–12, with two pages of each per month.</p>
<h3>04 · Monthly P&L (13 pages)</h3>
<p>A one-page profit and loss for every month: income, cost of sales, expenses, gross and net profit, tax set-aside and your pay.</p>
<h3>05 · Quarterly P&L & Cashflow (13 pages)</h3>
<p>4 quarterly P&Ls, 4 three-month cashflow forecasts (forecast vs actual), the annual P&L, a break-even calculator and a cash buffer tracker.</p>
<h3>06 · Tax Set-Aside (23 pages)</h3>
<p>How set-asides work and your set-aside %, monthly and quarterly trackers, a tax payments log, deductibles by category for each quarter, a home-studio calculator, a mileage & travel log, records checklists, a tax deadline calendar, questions for your accountant, a 4-page accountant handover pack and a year-end tax summary.</p>
<h3>07 · Invoices & Payments (15 pages)</h3>
<p>2 invoice templates, an invoice register, deposits & balances, a late-payment routine with ready-written chasing wording, client payment history and a refunds log.</p>
<h3>08 · Stock & Materials (19 pages)</h3>
<p>Materials inventory, finished stock, a supplier price tracker, reorder list, stock take, wastage log and a digital asset inventory.</p>
<h3>09 · Profitability (11 pages)</h3>
<p>Profit by product and by channel, including profit per hour. Plus a platform fees tracker, the 80/20 review, customer value and profit actions.</p>
<h3>10 · Funds & Assets (12 pages)</h3>
<p>Funds overview, slow-season, equipment and tax-buffer funds, 2 custom funds, loans & finance, an asset register and a subscriptions tracker.</p>
<h3>11 · Year-end (8 pages)</h3>
<p>The annual money review in three parts, next year's budget for income and costs, a year-end checklist, and a note to next year.</p>
<h3>12 · Notes (14 pages)</h3>
<p>6 lined and 6 ledger-grid pages, plus the closing pages.</p>
<h2>How it's linked</h2>
<ul>
<li>Side tabs on every page for all 12 sections.</li>
<li>Contents and a full page-by-page index, every line linked.</li>
<li>Each section opener lists and links all of its pages.</li>
<li>The Arwign Planners mark on every page takes you back to contents.</li>
<li>More than 3,500 internal links in total.</li>
</ul>
<h2>Good to know</h2>
<ul>
<li>A4 only (210 × 297 mm).</li>
<li>Currency-neutral. Write figures in your own currency.</li>
<li>Undated. Months 01–12 match THE LONG YEAR.</li>
<li>Guidance only. This isn't tax, legal or financial advice. Tax rules differ by country, so check with a qualified accountant.</li>
<li>Works in GoodNotes, Notability and other apps that support PDF hyperlinks.</li>
<li>Instant digital download. Nothing physical will be posted.</li>
</ul>
<h2>Part of MADE TO LAST.</h2>
<ul>
<li><strong>GROUNDWORK.</strong> — the foundations.</li>
<li><strong>THE LONG YEAR.</strong> — the operating year.</li>
<li><strong>THE COUNT.</strong> — the money (this book).</li>
</ul>
<p>Product costing sheets 01–10 match the product sheets in GROUNDWORK. Buy all three together as the MADE TO LAST. set and save.</p>
<p>For personal use only. Please don't share, resell or redistribute the file.</p>$html$,
  (SELECT id FROM categories WHERE slug = 'business-planners'),
  'draft', 'digital',
  20.00, NULL, 'USD',
  '/products/made-to-last/the-count/THE_COUNT_01_hero.png',
  ARRAY[
    '/products/made-to-last/the-count/THE_COUNT_02_inside.png',
    '/products/made-to-last/the-count/THE_COUNT_03_pricing.png',
    '/products/made-to-last/the-count/THE_COUNT_04_ledgers.png',
    '/products/made-to-last/the-count/THE_COUNT_05_tax.png',
    '/products/made-to-last/the-count/THE_COUNT_06_invoices.png',
    '/products/made-to-last/the-count/THE_COUNT_07_profit.png',
    '/products/made-to-last/the-count/THE_COUNT_08_details.png'
  ],
  ARRAY['PDF', 'GoodNotes', 'Notability'],
  220,
  'THE COUNT. — Bookkeeping & Pricing Planner for Makers (A4)',
  'The money book for makers — costing, ledgers, monthly P&L, cashflow, tax set-asides and invoices. 220 hyperlinked, currency-neutral A4 pages. Part of MADE TO LAST.',
  ARRAY['bookkeeping planner', 'small business', 'business planner', 'income tracker', 'expense tracker', 'pricing worksheet', 'profit and loss', 'tax planner', 'goodnotes planner', 'notability planner', 'craft business', 'maker planner', 'a4 digital planner'],
  ARRAY['bookkeeping planner', 'small business', 'business planner', 'income tracker', 'expense tracker', 'pricing worksheet', 'profit and loss', 'tax planner', 'goodnotes planner', 'notability planner', 'craft business', 'maker planner', 'a4 digital planner'],
  FALSE, TRUE, NULL
);

-- ============================================================
--  THE SET — MADE TO LAST.  (bundle of the three books)
--  bundle_items references the three books inserted above.
-- ============================================================
INSERT INTO products (
  title, slug, description,
  category_id, status, delivery_type,
  price, compare_price, currency,
  thumbnail, images, file_formats, page_count,
  meta_title, meta_description, meta_keywords, tags,
  is_featured, is_new, is_bundle, bundle_items, published_at
) VALUES (
  'MADE TO LAST. — The Complete Business Planner Set (3 books)',
  'made-to-last',
  $html$<p><strong>Three books. One business. A structure designed to last.</strong></p>
<p>MADE TO LAST. is a set of three linked digital planners for the solo creative turning craft into income. It works for makers, digital product sellers, commission artists and people who teach their craft. Each book does one job well, and together they hold the whole business.</p>
<h3>GROUNDWORK. — the foundations (160 pages)</h3>
<p>Where you stand, why you make, your offer ladder and 10 product sheets, 3 customer profiles, brand and story, pricing models, channels, 8 SOP templates, admin and protection, capacity and a 12-month growth map.</p>
<h3>THE LONG YEAR. — the operating year (420 pages)</h3>
<p>An undated year in four quarters and twelve months, with 53 Make / Sell / Admin weekly spreads (plan, time blocks, Friday close-out). Plus quarterly goals, 90-day plans, monthly plans and reviews, 10 project planners, 6 launch planners, 6 market planners and an order log.</p>
<h3>THE COUNT. — the money (220 pages)</h3>
<p>Minimum hourly rate, 10 product costing sheets, commission quotes, income and expense ledgers, 12 monthly P&Ls, cashflow forecasts, tax set-asides with an accountant handover pack, invoices, stock and profitability.</p>
<h2>How the books connect</h2>
<ul>
<li>Handover pages carry decisions from GROUNDWORK. into THE LONG YEAR. and THE COUNT.</li>
<li>Product sheets 01–10 in GROUNDWORK. match costing sheets 01–10 in THE COUNT.</li>
<li>Months 01–12 match across THE LONG YEAR. and THE COUNT.</li>
<li>Printed cross-references name the book and section where the next step lives.</li>
</ul>
<h2>A rhythm that lasts</h2>
<p>Yearly: GROUNDWORK. · Quarterly: THE LONG YEAR. · Monthly: close the books in THE COUNT. · Weekly: plan on Monday, close out on Friday, and keep one money hour.</p>
<h2>Good to know</h2>
<ul>
<li>You receive three separate A4 PDFs (210 × 297 mm). They aren't combined into one file.</li>
<li>Links work within each book. Cross-references between books are printed, because note-taking apps don't reliably follow links from one PDF to another.</li>
<li>Undated and currency-neutral throughout.</li>
<li>Works in GoodNotes, Notability and other apps that support PDF hyperlinks.</li>
<li>Instant digital download. Nothing physical will be posted.</li>
<li>General guidance only. It isn't legal, tax or financial advice.</li>
</ul>
<p><strong>Buy the set and save 17 against buying the books separately.</strong></p>
<p>For personal use only. Please don't share, resell or redistribute the files.</p>$html$,
  (SELECT id FROM categories WHERE slug = 'planner-bundles'),
  'draft', 'bundle',
  45.00, 62.00, 'USD',
  '/products/made-to-last/set/MADE_TO_LAST_01_hero.png',
  ARRAY[
    '/products/made-to-last/set/MADE_TO_LAST_02_books.png',
    '/products/made-to-last/set/MADE_TO_LAST_03_groundwork.png',
    '/products/made-to-last/set/MADE_TO_LAST_04_long_year.png',
    '/products/made-to-last/set/MADE_TO_LAST_05_count.png',
    '/products/made-to-last/set/MADE_TO_LAST_06_linked.png',
    '/products/made-to-last/set/MADE_TO_LAST_07_rhythm.png',
    '/products/made-to-last/set/MADE_TO_LAST_08_details.png'
  ],
  ARRAY['PDF', 'GoodNotes', 'Notability'],
  NULL,
  'MADE TO LAST. — Business Planner Set for Makers (3 books)',
  'Three linked digital planners for makers: GROUNDWORK., THE LONG YEAR. and THE COUNT. 800 hyperlinked A4 pages. Save 17 vs buying separately.',
  ARRAY['business planner', 'planner bundle', 'small business plan', 'maker planner', 'craft business', 'creative business', 'bookkeeping planner', 'weekly planner', 'undated planner', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner'],
  ARRAY['business planner', 'planner bundle', 'small business plan', 'maker planner', 'craft business', 'creative business', 'bookkeeping planner', 'weekly planner', 'undated planner', 'goodnotes planner', 'notability planner', 'digital planner', 'a4 digital planner'],
  TRUE, TRUE, TRUE,
  ARRAY[
    (SELECT id FROM products WHERE slug = 'groundwork'),
    (SELECT id FROM products WHERE slug = 'the-long-year'),
    (SELECT id FROM products WHERE slug = 'the-count')
  ]::UUID[],
  NULL
);

-- ============================================================
--  PRODUCT FAQs — built from each listing's "Good to know".
--  Re-runnable: clears these products' FAQs first, then re-inserts.
--  (Answers are dollar-quoted so apostrophes need no escaping, and
--   contain no semicolons, so they survive naive statement splitters.)
-- ============================================================
DELETE FROM product_faqs
 WHERE product_id IN (
   SELECT id FROM products
    WHERE slug IN ('groundwork', 'the-long-year', 'the-count', 'made-to-last')
 );

-- GROUNDWORK.
INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'What paper size is it?', $a$A4 only (210 × 297 mm). There is no US Letter or A5 version in this listing.$a$, 1),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'Is it dated or undated?', $a$Undated. Start any month, any year, and use it again next year.$a$, 2),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'Which currency does it use?', $a$None — it's currency-neutral. No currency symbols are printed, so you can write your figures in your own currency.$a$, 3),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'Which apps does it work in?', $a$GoodNotes, Notability, Noteshelf, Xodo and other apps that support PDF hyperlinks.$a$, 4),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'Can I add more of a page?', $a$Yes — duplicate any page you need more of inside your app.$a$, 5),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'How is it delivered?', $a$It's an instant digital download. Nothing physical will be posted.$a$, 6),
  ((SELECT id FROM products WHERE slug = 'groundwork'), 'Is this professional advice?', $a$No. It's general guidance only and is not legal, tax or financial advice.$a$, 7);

-- THE LONG YEAR.
INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'What paper size is it?', $a$A4 only (210 × 297 mm).$a$, 1),
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'Is it dated or undated?', $a$Undated. Months are numbered 01–12 and weeks 01–53, so you write the dates in yourself.$a$, 2),
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'How are the weeks arranged?', $a$Each quarter holds 13 weeks, split 4-4-5 across its months (the last quarter is 4-5-5, making 53 weeks in total). Weeks start on Monday.$a$, 3),
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'How many pages is it?', $a$420 fully hyperlinked A4 pages, with more than 10,800 internal links.$a$, 4),
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'Which apps does it work in?', $a$GoodNotes, Notability and other apps that support PDF hyperlinks.$a$, 5),
  ((SELECT id FROM products WHERE slug = 'the-long-year'), 'How is it delivered?', $a$It's an instant digital download. Nothing physical will be posted.$a$, 6);

-- THE COUNT.
INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'the-count'), 'What paper size is it?', $a$A4 only (210 × 297 mm).$a$, 1),
  ((SELECT id FROM products WHERE slug = 'the-count'), 'Which currency does it use?', $a$None — it's currency-neutral. Write your figures in your own currency.$a$, 2),
  ((SELECT id FROM products WHERE slug = 'the-count'), 'Is it dated or undated?', $a$Undated. Months are numbered 01–12 and line up with THE LONG YEAR.$a$, 3),
  ((SELECT id FROM products WHERE slug = 'the-count'), 'Is this tax advice?', $a$No. It's guidance only, not tax, legal or financial advice. Tax rules differ by country, so check with a qualified accountant.$a$, 4),
  ((SELECT id FROM products WHERE slug = 'the-count'), 'Which apps does it work in?', $a$GoodNotes, Notability and other apps that support PDF hyperlinks.$a$, 5),
  ((SELECT id FROM products WHERE slug = 'the-count'), 'How is it delivered?', $a$It's an instant digital download. Nothing physical will be posted.$a$, 6);

-- MADE TO LAST. (the set)
INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'What exactly do I get?', $a$Three separate A4 PDFs — GROUNDWORK. (160 pages), THE LONG YEAR. (420 pages) and THE COUNT. (220 pages). They aren't combined into one file.$a$, 1),
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'Do the links work between the books?', $a$Links work within each book. Cross-references between books are printed, because note-taking apps don't reliably follow links from one PDF to another.$a$, 2),
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'Are they dated, and which currency?', $a$Undated and currency-neutral throughout, so you can start any month of any year and use your own currency.$a$, 3),
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'How much does the set save?', $a$The set is 45 instead of 62 bought separately — a saving of 17 (about 27%).$a$, 4),
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'Which apps does it work in?', $a$GoodNotes, Notability and other apps that support PDF hyperlinks.$a$, 5),
  ((SELECT id FROM products WHERE slug = 'made-to-last'), 'How is it delivered?', $a$It's an instant digital download. Nothing physical will be posted.$a$, 6);
