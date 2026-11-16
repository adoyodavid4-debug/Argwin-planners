-- ─────────────────────────────────────────────────────────────────────────────
-- 034. GROWTH AGENTS — Stages 3-9 shared content tables
-- Content calendar items, email consent, knowledge base, testimonial
-- permissions, seasonal calendar (+seed), marketplace listings tracking,
-- bundle proposals, price tests.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ag_scheduled_items — the unified content calendar ────────────────────
create table if not exists ag_scheduled_items (
  id            bigserial primary key,
  agent_key     text not null references ag_agents(key),
  channel       text not null,                -- pinterest | email | instagram | tiktok | blog | ads
  item_type     text not null,                -- pin | campaign | reel | article | ad
  planner_id    uuid,
  title         text not null,
  payload       jsonb not null default '{}',  -- rendered copy, image path, board, segment…
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled'
                check (status in ('scheduled','published','failed','cancelled','ready_to_post')),
  approval_id   bigint references ag_approvals(id),
  published_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists ag_scheduled_due_idx on ag_scheduled_items(status, scheduled_at);
create index if not exists ag_scheduled_planner_idx on ag_scheduled_items(planner_id);

-- ─── contacts_consent — email marketing consent (double opt-in) ───────────
create table if not exists contacts_consent (
  id               bigserial primary key,
  email            text not null,
  kind             text not null default 'marketing',
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','revoked')),
  source           text not null,             -- lead_magnet | checkout | import
  collection       text,                      -- collection interest for segmentation
  market           text default 'us' check (market in ('us','uk','asia','other')),
  confirm_token    text,
  granted_at       timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique(email, kind)
);
create index if not exists contacts_consent_email_idx on contacts_consent(email);

-- ─── ag_kb — support knowledge base ───────────────────────────────────────
create table if not exists ag_kb (
  id         bigserial primary key,
  topic      text not null,                   -- goodnotes_import | notability_import | hyperlinks | sizes | licence | refunds
  question   text not null,
  answer     text not null,
  source     text not null default 'seed' check (source in ('seed','approved_answer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── ag_testimonial_permissions ───────────────────────────────────────────
create table if not exists ag_testimonial_permissions (
  id             bigserial primary key,
  customer_email text not null,
  quote          text not null,
  permission_evidence text not null,          -- where/when written permission was given
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz
);

-- ─── ag_calendar — seasonal marketing calendar ────────────────────────────
create table if not exists ag_calendar (
  id            bigserial primary key,
  name          text not null,
  market        text not null default 'all' check (market in ('us','uk','asia','all')),
  start_month   integer not null check (start_month between 1 and 12),
  end_month     integer not null check (end_month between 1 and 12),
  lead_time_days integer not null default 30,
  notes         text,
  created_at    timestamptz not null default now()
);

insert into ag_calendar (name, market, start_month, end_month, lead_time_days, notes) values
  ('New Year planning',        'all',  10, 1,  45, 'Peak digital planner demand Oct–Jan'),
  ('US tax season',            'us',   1,  4,  30, 'Budget and finance planners'),
  ('UK self-assessment',       'uk',   11, 1,  30, 'Deadline 31 January'),
  ('Back-to-school',           'all',  7,  9,  40, 'Student and academic planners'),
  ('Black Friday / Cyber Monday','all',11, 11, 35, 'Bundles and launch offers'),
  ('Mother''s Day (UK)',       'uk',   2,  3,  25, 'UK date is Mothering Sunday (March)'),
  ('Mother''s Day (US)',       'us',   4,  5,  25, 'Second Sunday of May'),
  ('Father''s Day',            'all',  5,  6,  25, 'Third Sunday of June US & UK'),
  ('Ramadan planning',         'asia', 1,  3,  40, 'Date shifts yearly — verify each year'),
  ('Lunar New Year',           'asia', 12, 2,  40, 'Date shifts yearly — verify each year')
on conflict do nothing;

-- ─── ag_listings — Etsy/Gumroad listing state + change tracking ───────────
create table if not exists ag_listings (
  id              bigserial primary key,
  platform        text not null check (platform in ('etsy','gumroad')),
  external_id     text not null,
  planner_id      uuid,
  title           text,
  tags            text[],
  description     text,
  last_synced_at  timestamptz,
  last_changed_at timestamptz,
  eval_until      timestamptz,                -- track performance for LISTING_EVAL_DAYS after change
  metrics         jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  unique(platform, external_id)
);

-- ─── ag_bundle_proposals ──────────────────────────────────────────────────
create table if not exists ag_bundle_proposals (
  id              bigserial primary key,
  name            text not null,
  planner_ids     uuid[] not null,
  suggested_price numeric(10,2),
  currency        text not null default 'USD',
  rationale       text,
  cover_brief     text,                       -- new motif brief — never copied from one planner
  status          text not null default 'proposed'
                  check (status in ('proposed','approved','rejected','built')),
  approval_id     bigint references ag_approvals(id),
  created_at      timestamptz not null default now()
);

-- ─── ag_price_tests ───────────────────────────────────────────────────────
create table if not exists ag_price_tests (
  id           bigserial primary key,
  planner_id   uuid not null,
  price_a      numeric(10,2) not null,
  price_b      numeric(10,2) not null,
  currency     text not null default 'USD',
  min_orders_per_arm integer not null default 50,
  status       text not null default 'proposed'
               check (status in ('proposed','running','completed','cancelled')),
  result       jsonb,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── Seed: knowledge base starters ────────────────────────────────────────
insert into ag_kb (topic, question, answer) values
  ('goodnotes_import', 'How do I import my planner into GoodNotes?',
   'On your iPad, open the email or download link in Safari, tap the Share icon, then choose "Open in GoodNotes". Pick "Import as New Document". Your planner''s hyperlinked tabs work in read-only mode — tap a tab once to navigate, and use the pen tool to write.'),
  ('notability_import', 'How do I import my planner into Notability?',
   'Open the download link in Safari on your iPad, tap the Share icon and choose "Open in Notability". To use the hyperlinked tabs, make sure you are not in editing mode — tap the page once to exit editing, then tap a tab to navigate.'),
  ('hyperlinks', 'The links/tabs in my planner are not working. What do I do?',
   'Hyperlinks only work when the app is in read (not editing) mode. In GoodNotes, tap the pen icon to toggle editing off, then tap a tab. In Notability, tap once on the page background to exit editing first. If links still do not respond, restart the app and reopen the planner.'),
  ('sizes', 'What is the difference between A4, US Letter and A5?',
   'Every planner comes in all three sizes. A4 (210×297 mm) and US Letter (8.5×11 in) are full-page sizes — choose the one matching your region if you ever print. A5 is a compact size that suits split-screen use on iPad. All three have identical content and hyperlinks.'),
  ('refunds', 'Can I get a refund?',
   'Because planners are digital downloads, refunds are handled case by case. Reply with your order email and a short description of the issue and our team will review it within one business day.')
on conflict do nothing;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table ag_scheduled_items          enable row level security;
alter table contacts_consent            enable row level security;
alter table ag_kb                       enable row level security;
alter table ag_testimonial_permissions  enable row level security;
alter table ag_calendar                 enable row level security;
alter table ag_listings                 enable row level security;
alter table ag_bundle_proposals         enable row level security;
alter table ag_price_tests              enable row level security;

create policy "admin_all_scheduled"     on ag_scheduled_items         for all to authenticated using (true);
create policy "admin_all_contacts"      on contacts_consent           for all to authenticated using (true);
create policy "admin_all_kb"            on ag_kb                      for all to authenticated using (true);
create policy "admin_all_testimonial"   on ag_testimonial_permissions for all to authenticated using (true);
create policy "admin_all_calendar"      on ag_calendar                for all to authenticated using (true);
create policy "admin_all_listings"      on ag_listings                for all to authenticated using (true);
create policy "admin_all_bundles"       on ag_bundle_proposals        for all to authenticated using (true);
create policy "admin_all_price_tests"   on ag_price_tests             for all to authenticated using (true);
