# Real catalog seeding

Replaces the placeholder planners/notebooks with the real products from the two
local source folders:

- **Planners** — `…/Planners and Notebooks/Planners/Planners/*` (162 planners)
- **General Notebook** — `…/Planners and Notebooks/Arwign-General-Notebook` (1 notebook, Marble cover + multi-theme gallery)

All products are seeded **active at $17.99 USD**.

## Files

| File | Purpose |
|------|---------|
| `catalog-source.mjs` | Offline parser. Walks the source folders, resolves A4/A5/US-Letter PDFs, gallery images, titles, descriptions and tags (from each product's `Listings.md`). No network. |
| `seed-catalog.mjs` | Uploads PDFs (`product-files`, private) + images (`product-images`, public) to Supabase Storage using the same path convention as the admin editor, upserts product rows on `slug`, then deletes leftover placeholder products. |

Source-folder paths are hard-coded at the top of `catalog-source.mjs` — edit there
if the folders move.

## Run

From the `arwign-planners` directory:

```bash
# 1. Preview only — parses everything, prints a per-category report, no network:
node scripts/seed-catalog.mjs --dry

# 2. Live — needs a REACHABLE Supabase project in .env.local
#    (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
node scripts/seed-catalog.mjs
```

### First-time / fresh Supabase project

1. Run `supabase/SETUP_FROM_ZERO.sql` in the Supabase SQL editor (creates all
   tables, columns and the 8 categories this seeder maps to).
2. Point `.env.local` at the new project URL + service-role key.
3. `node scripts/seed-catalog.mjs`

The script is idempotent: storage uploads upsert, product rows upsert on `slug`,
and re-running removes any product whose slug is no longer in the source folders.

## Category mapping

| Source folder | Site category |
|---------------|---------------|
| ADHD | adhd-planners |
| Budget | budget-planners |
| Content | business-planners |
| Habit Tracker | habit-trackers |
| Meal Planners | meal-planners |
| Students | student-planners |
| Wellness | wellness-planners |
| Arwign-General-Notebook | digital-notebooks |

Excluded, non-product folders (marketing kits, design briefs, bulk re-export
`Redone/`, "To be Uploaded", etc.) are skipped automatically.
