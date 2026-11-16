-- ─────────────────────────────────────────────────────────────────────────────
-- 033. SALES AGENT — Stage 2 schema (masterplan §5)
-- Leads, identities, consents, suppressions, window state machine,
-- conversations, messages, outbound queue, sequences, templates, settings,
-- attribution. All sa_* tables. RLS: authenticated (admin UI) read/write;
-- service role (agent workers, webhooks) bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── sa_leads ─────────────────────────────────────────────────────────────
create table if not exists sa_leads (
  id              uuid primary key default gen_random_uuid(),
  name            text,
  market          text not null default 'other' check (market in ('us','uk','asia','other')),
  source          text,                       -- ctwa_ad | ctm_ad | ig_comment | website_button | checkout_optin | inbound_dm
  planner_interest uuid,                      -- products.id
  status          text not null default 'new' check (status in ('new','active','won','dormant','lost')),
  customer_email  text,
  tz_offset       integer not null default -5, -- recipient UTC offset (US Eastern default)
  notes           text,
  created_at      timestamptz not null default now(),
  last_contact_at timestamptz
);
create index if not exists sa_leads_status_idx on sa_leads(status);

-- ─── sa_identities — one lead, many channel identities ───────────────────
create table if not exists sa_identities (
  id          bigserial primary key,
  lead_id     uuid not null references sa_leads(id) on delete cascade,
  channel     text not null check (channel in ('whatsapp','instagram','messenger','email')),
  external_id text not null,                  -- E.164 phone / IG-scoped id / PSID / email
  is_us_number boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(channel, external_id)
);
create index if not exists sa_identities_lead_idx on sa_identities(lead_id);

-- ─── sa_consents — timestamped opt-ins per channel ────────────────────────
create table if not exists sa_consents (
  id              bigserial primary key,
  lead_id         uuid not null references sa_leads(id) on delete cascade,
  channel         text not null check (channel in ('whatsapp','instagram','messenger','email')),
  kind            text not null default 'marketing' check (kind in ('marketing','transactional')),
  granted_at      timestamptz not null default now(),
  source          text not null,              -- website_button | checkout | inbound_message
  wording_version text,
  ip_hash         text,
  page            text,
  revoked_at      timestamptz
);
create index if not exists sa_consents_lead_channel_idx on sa_consents(lead_id, channel);

-- ─── sa_suppressions — STOP / unsubscribe, checked at send time ───────────
create table if not exists sa_suppressions (
  id         bigserial primary key,
  lead_id    uuid references sa_leads(id) on delete cascade,
  channel    text not null check (channel in ('whatsapp','instagram','messenger','email','all')),
  external_id text,                           -- also store raw id so suppression works without a lead
  reason     text not null default 'stop_request',
  created_at timestamptz not null default now(),
  unique(lead_id, channel)
);
create index if not exists sa_suppressions_external_idx on sa_suppressions(channel, external_id);

-- ─── sa_windows — messaging window state machine per (lead, channel) ─────
create table if not exists sa_windows (
  id         bigserial primary key,
  lead_id    uuid not null references sa_leads(id) on delete cascade,
  channel    text not null check (channel in ('whatsapp','instagram','messenger')),
  kind       text not null check (kind in ('service_24h','free_entry_72h','ad_window')),
  opened_at  timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sa_windows_lead_channel_idx on sa_windows(lead_id, channel, expires_at desc);

-- ─── sa_conversations ─────────────────────────────────────────────────────
create table if not exists sa_conversations (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references sa_leads(id) on delete cascade,
  channel         text not null check (channel in ('whatsapp','instagram','messenger')),
  status          text not null default 'open' check (status in ('open','human','closed')),
  human_takeover  boolean not null default false,
  disclosure_sent boolean not null default false,
  failed_answers  integer not null default 0,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique(lead_id, channel)
);
create index if not exists sa_conversations_status_idx on sa_conversations(status, last_message_at desc);

-- ─── sa_messages ──────────────────────────────────────────────────────────
create table if not exists sa_messages (
  id              bigserial primary key,
  conversation_id uuid not null references sa_conversations(id) on delete cascade,
  direction       text not null check (direction in ('in','out')),
  body            text not null,
  template_key    text,
  sent_by         text not null default 'agent' check (sent_by in ('agent','human','lead')),
  status          text not null default 'received'
                  check (status in ('received','queued','sent','delivered','read','failed')),
  error_code      text,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists sa_messages_conversation_idx on sa_messages(conversation_id, created_at desc);

-- ─── sa_outbound_queue — everything outbound goes through the pacer ───────
create table if not exists sa_outbound_queue (
  id              bigserial primary key,
  lead_id         uuid not null references sa_leads(id) on delete cascade,
  conversation_id uuid references sa_conversations(id) on delete cascade,
  channel         text not null check (channel in ('whatsapp','instagram','messenger')),
  kind            text not null default 'reply' check (kind in ('reply','followup','template')),
  body            text not null,
  template_key    text,
  not_before      timestamptz not null default now(),
  attempts        integer not null default 0,
  status          text not null default 'queued'
                  check (status in ('queued','sent','cancelled','failed')),
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index if not exists sa_outbound_due_idx on sa_outbound_queue(status, channel, not_before);

-- ─── sa_sequences — follow-up drip per planner ────────────────────────────
create table if not exists sa_sequences (
  id          bigserial primary key,
  name        text not null,
  planner_id  uuid,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists sa_sequence_steps (
  id           bigserial primary key,
  sequence_id  bigint not null references sa_sequences(id) on delete cascade,
  step_order   integer not null,
  delay_hours  integer not null,
  body         text not null,
  unique(sequence_id, step_order)
);

-- ─── sa_templates — WhatsApp templates (Meta submission tracked) ──────────
create table if not exists sa_templates (
  id          bigserial primary key,
  name        text not null unique,
  channel     text not null default 'whatsapp',
  category    text not null check (category in ('marketing','utility','authentication')),
  language    text not null default 'en',
  body        text not null,
  meta_status text not null default 'draft'
              check (meta_status in ('draft','submitted','approved','rejected','paused')),
  meta_id     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── sa_settings — single row ─────────────────────────────────────────────
create table if not exists sa_settings (
  id                     integer primary key default 1 check (id = 1),
  pace_per_minute        integer not null default 1,
  max_proactive_per_week integer not null default 2,
  max_sequence_steps     integer not null default 3,
  quiet_start_hour       integer not null default 21,
  quiet_end_hour         integer not null default 9,
  min_seconds_between    integer not null default 60,
  disclosure_text        text not null default 'Hi! This is Arwign''s automated assistant. Ask for a human at any time and we''ll take over.',
  updated_at             timestamptz not null default now()
);
insert into sa_settings (id) values (1) on conflict (id) do nothing;

-- ─── sa_attribution — purchases linked back to leads ──────────────────────
create table if not exists sa_attribution (
  id         bigserial primary key,
  lead_id    uuid references sa_leads(id) on delete set null,
  order_id   uuid,
  channel    text,
  utm        jsonb not null default '{}',
  amount     numeric(10,2),
  currency   text default 'USD',
  created_at timestamptz not null default now()
);
create index if not exists sa_attribution_lead_idx on sa_attribution(lead_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table sa_leads           enable row level security;
alter table sa_identities      enable row level security;
alter table sa_consents        enable row level security;
alter table sa_suppressions    enable row level security;
alter table sa_windows         enable row level security;
alter table sa_conversations   enable row level security;
alter table sa_messages        enable row level security;
alter table sa_outbound_queue  enable row level security;
alter table sa_sequences       enable row level security;
alter table sa_sequence_steps  enable row level security;
alter table sa_templates       enable row level security;
alter table sa_settings        enable row level security;
alter table sa_attribution     enable row level security;

-- Personal data: only authenticated admins (UI) may read; service role bypasses.
create policy "admin_all_sa_leads"          on sa_leads          for all to authenticated using (true);
create policy "admin_all_sa_identities"     on sa_identities     for all to authenticated using (true);
create policy "admin_all_sa_consents"       on sa_consents       for all to authenticated using (true);
create policy "admin_all_sa_suppressions"   on sa_suppressions   for all to authenticated using (true);
create policy "admin_all_sa_windows"        on sa_windows        for all to authenticated using (true);
create policy "admin_all_sa_conversations"  on sa_conversations  for all to authenticated using (true);
create policy "admin_all_sa_messages"       on sa_messages       for all to authenticated using (true);
create policy "admin_all_sa_outbound"       on sa_outbound_queue for all to authenticated using (true);
create policy "admin_all_sa_sequences"      on sa_sequences      for all to authenticated using (true);
create policy "admin_all_sa_seq_steps"      on sa_sequence_steps for all to authenticated using (true);
create policy "admin_all_sa_templates"      on sa_templates      for all to authenticated using (true);
create policy "admin_all_sa_settings"       on sa_settings       for all to authenticated using (true);
create policy "admin_all_sa_attribution"    on sa_attribution    for all to authenticated using (true);
