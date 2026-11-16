-- ─────────────────────────────────────────────────────────────────────────────
-- 032. GROWTH AGENTS — Agent OS core (Stage 1)
-- Creates all ag_* tables for the Agent Command Centre.
-- Run via Supabase Dashboard → SQL Editor, or `supabase db push`.
--
-- pg_cron setup (run separately as superuser in the Dashboard SQL editor):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule(
--     'agent-tick', '* * * * *',
--     format($$select net.http_post(
--       url := '%s/functions/v1/agent-tick',
--       headers := '{"Authorization":"Bearer %s","Content-Type":"application/json"}',
--       body := '{}'
--     )$$, current_setting('app.supabase_url'), current_setting('app.service_role_key'))
--   );
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Global config (global kill switch lives here) ───────────────────────
create table if not exists ag_global_config (
  id              integer primary key default 1 check (id = 1),
  all_agents_paused boolean not null default false,
  updated_at      timestamptz not null default now()
);
insert into ag_global_config (id) values (1) on conflict (id) do nothing;

-- ─── ag_agents ────────────────────────────────────────────────────────────
create table if not exists ag_agents (
  key                text primary key,
  name               text not null,
  description        text,
  phase              integer not null default 1,
  enabled            boolean not null default false,
  autonomy           jsonb not null default '{}',
  schedule           text,
  monthly_budget_usd numeric(10,2) not null default 0,
  budget_used_usd    numeric(10,2) not null default 0,
  model              text,
  last_run_at        timestamptz,
  last_run_status    text check (last_run_status in ('running','completed','failed','skipped')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── ag_runs ──────────────────────────────────────────────────────────────
create table if not exists ag_runs (
  id             bigserial primary key,
  agent_key      text not null references ag_agents(key) on delete cascade,
  trigger        text not null check (trigger in ('cron','event','manual')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running','completed','failed','skipped')),
  summary        text,
  tokens_in      integer not null default 0,
  tokens_out     integer not null default 0,
  cost_usd       numeric(10,6) not null default 0,
  error          text,
  prompt_version integer
);
create index if not exists ag_runs_agent_key_idx on ag_runs(agent_key);
create index if not exists ag_runs_started_at_idx on ag_runs(started_at desc);

-- ─── ag_events ────────────────────────────────────────────────────────────
create table if not exists ag_events (
  id           bigserial primary key,
  type         text not null,
  payload      jsonb not null default '{}',
  occurred_at  timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists ag_events_type_idx on ag_events(type);
create index if not exists ag_events_occurred_at_idx on ag_events(occurred_at desc);

-- ─── ag_approvals ─────────────────────────────────────────────────────────
create table if not exists ag_approvals (
  id           bigserial primary key,
  agent_key    text not null references ag_agents(key) on delete cascade,
  action_type  text not null check (action_type in (
    'publish_pin','update_listing','send_campaign','publish_post',
    'create_ad','change_budget','publish_article','change_price',
    'create_bundle','send_email','publish_reel','send_message'
  )),
  title        text not null,
  preview      jsonb not null default '{}',
  status       text not null default 'pending' check (status in ('pending','approved','rejected','edited','expired')),
  decided_by   uuid references auth.users(id),
  decided_at   timestamptz,
  feedback     text,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);
create index if not exists ag_approvals_status_idx on ag_approvals(status);
create index if not exists ag_approvals_agent_key_idx on ag_approvals(agent_key);

-- ─── ag_tasks ─────────────────────────────────────────────────────────────
create table if not exists ag_tasks (
  id              bigserial primary key,
  title           text not null,
  rationale       text,
  expected_impact text,
  owner_agent     text references ag_agents(key),
  status          text not null default 'proposed'
                  check (status in ('proposed','accepted','in_progress','done','dismissed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── ag_assets ────────────────────────────────────────────────────────────
create table if not exists ag_assets (
  id               bigserial primary key,
  type             text not null check (type in (
    'cover','mockup','tab_rail_video','pin','reel','ad_creative','blog_image'
  )),
  planner_id       text,
  storage_path     text not null,
  dimensions       text,
  alt_text         text,
  created_by_agent text references ag_agents(key),
  usage_rights     text not null default 'own',
  created_at       timestamptz not null default now()
);

-- ─── ag_brand_kit ─────────────────────────────────────────────────────────
create table if not exists ag_brand_kit (
  id               integer primary key default 1 check (id = 1),
  voice_rules      text not null default 'Write in a warm, knowledgeable voice. Address the reader directly. Be clear and practical. Never use corporate jargon. UK spelling throughout.',
  banned_phrases   text[] not null default '{"only 3 left","limited time","buy now before it''s gone","fake countdown","selling fast","100% guaranteed"}',
  palette_tokens   jsonb not null default '{"cream":"#F5F0E8","gold":"#C9A84C","clay":"#C9847C","sage":"#6E7E66","parchment":"#EDE8DC"}',
  font_names       jsonb not null default '{"heading":"Lora","ui":"Poppins"}',
  approved_claims  text[] not null default '{}',
  disclaimers      text not null default '',
  uk_spelling_note text not null default 'Use UK spelling throughout. US search terms are allowed in marketplace tags only; body copy stays UK.',
  updated_at       timestamptz not null default now()
);
insert into ag_brand_kit (id) values (1) on conflict (id) do nothing;

-- ─── ag_prompts ───────────────────────────────────────────────────────────
create table if not exists ag_prompts (
  id         bigserial primary key,
  agent_key  text not null references ag_agents(key) on delete cascade,
  version    integer not null,
  content    text not null,
  created_at timestamptz not null default now(),
  unique(agent_key, version)
);

-- ─── ag_kpi_snapshots ─────────────────────────────────────────────────────
create table if not exists ag_kpi_snapshots (
  id         bigserial primary key,
  date       date not null,
  channel    text not null,
  agent_key  text references ag_agents(key),
  planner_id text,
  metric     text not null,
  value      numeric not null default 0,
  created_at timestamptz not null default now()
);
-- Expressions aren't allowed in table UNIQUE constraints, so use a unique
-- index to treat NULL agent_key/planner_id as a single value.
create unique index if not exists ag_kpi_snapshots_uniq
  on ag_kpi_snapshots(date, channel, coalesce(agent_key,''), coalesce(planner_id,''), metric);
create index if not exists ag_kpi_date_idx on ag_kpi_snapshots(date desc);

-- ─── ag_integrations ──────────────────────────────────────────────────────
create table if not exists ag_integrations (
  platform         text primary key,
  status           text not null default 'disconnected'
                   check (status in ('connected','disconnected','error','expired')),
  token_expires_at timestamptz,
  last_success_at  timestamptz,
  scopes           text[] not null default '{}',
  error_msg        text,
  updated_at       timestamptz not null default now()
);

-- ─── ag_jobs (long-running media work) ────────────────────────────────────
create table if not exists ag_jobs (
  id          bigserial primary key,
  type        text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'queued'
              check (status in ('queued','running','completed','failed')),
  worker      text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  error       text
);

-- ─── ag_audit_log ─────────────────────────────────────────────────────────
create table if not exists ag_audit_log (
  id         bigserial primary key,
  agent_key  text,
  admin_id   uuid references auth.users(id),
  action     text not null,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists ag_audit_log_created_at_idx on ag_audit_log(created_at desc);

-- ─── Seed: 11 agents ──────────────────────────────────────────────────────
insert into ag_agents (key, name, description, phase, enabled, model) values
  ('sales',     'Sales Agent',               'WhatsApp, Instagram and Messenger conversations with opted-in leads; recommends planners; sends checkout links',   1, false, null),
  ('email',     'Email Agent',               'Welcome, abandoned-checkout, post-purchase, win-back and launch emails through Resend',                             1, false, null),
  ('pinterest', 'Pinterest Agent',           'Creates, schedules and optimises pins for every planner',                                                           1, false, null),
  ('listing',   'Marketplace Listing Agent', 'Etsy and Gumroad titles, tags, descriptions and rank tracking',                                                     2, false, null),
  ('video',     'Short Video Agent',         'Flip-through Reels and TikToks from existing assets',                                                               2, false, null),
  ('ads',       'Ads Manager Agent',         'Meta ad drafts, performance monitoring, budget suggestions',                                                        2, false, null),
  ('seo',       'SEO Blog Agent',            'Search-led articles that link to planners',                                                                         2, false, null),
  ('support',   'Support & Reviews Agent',   'Download and import help, refunds triage, genuine review requests',                                                 3, false, null),
  ('bundles',   'Bundles & Pricing Agent',   'Bundles, upsells, price tests',                                                                                     3, false, null),
  ('trends',    'Trend Research Agent',      'Demand signals and the seasonal calendar; proposes new titles',                                                      3, false, null),
  ('analyst',   'Growth Analyst Agent',      'Weekly report across all agents and channels; proposes next actions',                                               3, false, null)
on conflict (key) do nothing;

-- ─── Seed: integrations ───────────────────────────────────────────────────
insert into ag_integrations (platform) values
  ('whatsapp'), ('instagram'), ('messenger'), ('meta_ads'),
  ('pinterest'), ('etsy'), ('gumroad'), ('tiktok'),
  ('resend'), ('google_search_console'), ('stripe'), ('paystack')
on conflict (platform) do nothing;

-- ─── Seed: initial prompts ────────────────────────────────────────────────
insert into ag_prompts (agent_key, version, content) values
  ('sales', 1, 'You are Arwign''s sales assistant. You help people find the right digital planner for their needs. Always be warm and helpful. Ask at most two questions before recommending a planner. Recommend at most two planners with one clear call to action. Use UK spelling. Never invent prices, discounts or testimonials — use only the catalogue data provided. If the customer wants a refund, to place a bulk order, or is frustrated, hand off to a human immediately.'),
  ('email', 1, 'You are Arwign''s email copywriter. Write warm, practical emails in UK spelling using the Arwign brand voice. Never invent discounts, testimonials or fake scarcity. Every marketing email must include a one-click unsubscribe link and the business postal address. Keep subject lines under 50 characters.'),
  ('pinterest', 1, 'You create Pinterest pin copy for Arwign digital planners. Write keyword-rich titles (max 100 characters) and descriptions (max 500 characters) in UK spelling. Include the planner name, its key benefit and a call to action. Never invent reviews or fake claims. Use search terms that US and UK shoppers use.'),
  ('listing', 1, 'You optimise Etsy and Gumroad listings for Arwign digital planners. Write front-loaded titles, all 13 Etsy tags, and descriptions in UK spelling. Use search terms that US and UK buyers use in tags only. Never invent reviews, page counts, prices or compatibility claims — use only the catalogue data provided.'),
  ('seo', 1, 'You write SEO blog articles for arwignplanners.com. Articles are 1,200–2,000 words, in UK spelling, with practical and genuinely useful content. Include 2–4 contextual links to planners. Add FAQ schema suggestions. Never invent statistics or expert quotes. Author line: "Arwign Planners team". State clearly that product recommendations are Arwign products.'),
  ('support', 1, 'You are Arwign''s support assistant. Help customers with download issues, GoodNotes/Notability import questions, hyperlink troubleshooting and size explanations. For refund requests, provide a summary and recommendation for the human admin — never issue refunds yourself. Use the knowledge base. UK spelling.'),
  ('analyst', 1, 'You are Arwign''s growth analyst. Write weekly reports covering revenue, orders, AOV and conversion by channel, market and planner. Identify what each agent did, what it cost and what it returned. Surface 3–5 clear recommended actions as tasks. Document your attribution method in the report footer. UK spelling.')
on conflict (agent_key, version) do nothing;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table ag_global_config   enable row level security;
alter table ag_agents          enable row level security;
alter table ag_runs            enable row level security;
alter table ag_events          enable row level security;
alter table ag_approvals       enable row level security;
alter table ag_tasks           enable row level security;
alter table ag_assets          enable row level security;
alter table ag_brand_kit       enable row level security;
alter table ag_prompts         enable row level security;
alter table ag_kpi_snapshots   enable row level security;
alter table ag_integrations    enable row level security;
alter table ag_jobs            enable row level security;
alter table ag_audit_log       enable row level security;

-- Admins (role in profiles table) can read and write everything.
-- Service role bypasses RLS entirely (used by agent workers).
-- Note: for a tighter policy replace `true` with a subquery checking profiles.role.

create policy "admin_read_global_config"  on ag_global_config  for select to authenticated using (true);
create policy "admin_write_global_config" on ag_global_config  for update to authenticated using (true);

create policy "admin_read_agents"         on ag_agents         for select to authenticated using (true);
create policy "admin_write_agents"        on ag_agents         for update to authenticated using (true);

create policy "admin_read_runs"           on ag_runs           for select to authenticated using (true);
create policy "admin_read_events"         on ag_events         for select to authenticated using (true);

create policy "admin_all_approvals"       on ag_approvals      for all    to authenticated using (true);
create policy "admin_all_tasks"           on ag_tasks          for all    to authenticated using (true);
create policy "admin_all_assets"          on ag_assets         for all    to authenticated using (true);
create policy "admin_all_brand_kit"       on ag_brand_kit      for all    to authenticated using (true);
create policy "admin_all_prompts"         on ag_prompts        for all    to authenticated using (true);

create policy "admin_read_kpi"            on ag_kpi_snapshots  for select to authenticated using (true);
create policy "admin_all_integrations"    on ag_integrations   for all    to authenticated using (true);
create policy "admin_read_jobs"           on ag_jobs           for select to authenticated using (true);
create policy "admin_read_audit"          on ag_audit_log      for select to authenticated using (true);
