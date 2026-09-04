-- 016_calendar_full.sql — Arwign Calendar · full product schema
-- Extends the Phase-1 events + booking tables into the finished product:
-- recurrence & exceptions, tags/types/visibility, per-event reminders,
-- per-user settings, meeting polls, web-push subscriptions, an integrations
-- scaffold (Google/Outlook/Apple/AI/SMS), a notification log, and paid-booking
-- fields. RLS ships in the SAME migration for every table (masterplan §10).

create extension if not exists pgcrypto;

-- ════════════════════════════════════════════════════════════════
--  1. calendar_events — recurrence, tags, reminders, visibility
-- ════════════════════════════════════════════════════════════════
alter table calendar_events add column if not exists rrule                text;
alter table calendar_events add column if not exists exdates              timestamptz[] not null default '{}';
alter table calendar_events add column if not exists recurrence_parent_id uuid references calendar_events(id) on delete cascade;
alter table calendar_events add column if not exists recurrence_date      timestamptz;      -- original occurrence this row overrides
alter table calendar_events add column if not exists tags                 text[] not null default '{}';
alter table calendar_events add column if not exists event_type           text;
alter table calendar_events add column if not exists visibility           text not null default 'default';
alter table calendar_events add column if not exists status               text not null default 'confirmed';
alter table calendar_events add column if not exists conferencing         text;
alter table calendar_events add column if not exists reminders            jsonb  not null default '[]'::jsonb;

do $$ begin
  alter table calendar_events add constraint calendar_events_visibility_chk
    check (visibility in ('default','private','busy'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table calendar_events add constraint calendar_events_status_chk
    check (status in ('confirmed','tentative','cancelled'));
exception when duplicate_object then null; end $$;

create index if not exists calendar_events_parent_idx on calendar_events (recurrence_parent_id);
create index if not exists calendar_events_type_idx   on calendar_events (user_id, event_type);

-- ════════════════════════════════════════════════════════════════
--  2. calendar_settings — one row per user
-- ════════════════════════════════════════════════════════════════
create table if not exists calendar_settings (
  user_id           uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  timezone          text    not null default 'Africa/Nairobi',
  week_start        smallint not null default 1 check (week_start between 0 and 6),
  working_hours     jsonb   not null default '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}'::jsonb,
  theme             text    not null default 'warm'   check (theme in ('light','dark','warm','system')),
  density           text    not null default 'comfortable' check (density in ('comfortable','compact')),
  default_view      text    not null default 'month'  check (default_view in ('day','week','month','agenda','year')),
  world_clocks      text[]  not null default '{}',
  reminder_defaults jsonb   not null default '[{"minutes":30,"channel":"push"}]'::jsonb,
  briefing_email    boolean not null default true,
  briefing_sms      boolean not null default false,
  briefing_hour     smallint not null default 7 check (briefing_hour between 0 and 23),
  evening_preview   boolean not null default false,
  quiet_start       smallint check (quiet_start between 0 and 23),
  quiet_end         smallint check (quiet_end between 0 and 23),
  no_meeting_days   smallint[] not null default '{}',
  focus_protect     boolean not null default false,
  last_briefing_on  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table calendar_settings enable row level security;
drop policy if exists "calendar_settings_owner_all" on calendar_settings;
create policy "calendar_settings_owner_all" on calendar_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists calendar_settings_set_updated_at on calendar_settings;
create trigger calendar_settings_set_updated_at
  before update on calendar_settings
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════
--  3. event_types — user-defined event types with defaults
-- ════════════════════════════════════════════════════════════════
create table if not exists event_types (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null,
  colour           text not null default 'brass',
  default_duration_min integer not null default 60 check (default_duration_min between 5 and 1440),
  default_reminders    jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists event_types_user_idx on event_types (user_id);
alter table event_types enable row level security;
drop policy if exists "event_types_owner_all" on event_types;
create policy "event_types_owner_all" on event_types
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  4. meeting_polls (Doodle-style) + options + votes
-- ════════════════════════════════════════════════════════════════
create table if not exists meeting_polls (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug           text not null unique,
  title          text not null,
  description    text,
  location       text,
  duration_min   integer not null default 30 check (duration_min between 5 and 480),
  timezone       text not null default 'Africa/Nairobi',
  status         text not null default 'open' check (status in ('open','closed')),
  final_start_at timestamptz,
  event_id       uuid references calendar_events(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists meeting_polls_owner_idx on meeting_polls (owner_id);
alter table meeting_polls enable row level security;
drop policy if exists "meeting_polls_owner_all" on meeting_polls;
create policy "meeting_polls_owner_all" on meeting_polls
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "meeting_polls_public_read" on meeting_polls;
create policy "meeting_polls_public_read" on meeting_polls
  for select using (true);
drop trigger if exists meeting_polls_set_updated_at on meeting_polls;
create trigger meeting_polls_set_updated_at
  before update on meeting_polls
  for each row execute function set_updated_at();

create table if not exists poll_options (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references meeting_polls(id) on delete cascade,
  start_at  timestamptz not null,
  end_at    timestamptz not null,
  created_at timestamptz not null default now(),
  constraint poll_options_time_order check (end_at > start_at)
);
create index if not exists poll_options_poll_idx on poll_options (poll_id);
alter table poll_options enable row level security;
drop policy if exists "poll_options_owner_all" on poll_options;
create policy "poll_options_owner_all" on poll_options
  for all using (exists (select 1 from meeting_polls p where p.id = poll_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from meeting_polls p where p.id = poll_id and p.owner_id = auth.uid()));
drop policy if exists "poll_options_public_read" on poll_options;
create policy "poll_options_public_read" on poll_options
  for select using (true);

create table if not exists poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references meeting_polls(id) on delete cascade,
  option_id   uuid not null references poll_options(id) on delete cascade,
  voter_name  text not null,
  voter_email text,
  created_at  timestamptz not null default now()
);
create index if not exists poll_votes_poll_idx on poll_votes (poll_id);
alter table poll_votes enable row level security;
-- Public voting is written server-side via the service role; owners can read.
drop policy if exists "poll_votes_owner_read" on poll_votes;
create policy "poll_votes_owner_read" on poll_votes
  for select using (exists (select 1 from meeting_polls p where p.id = poll_id and p.owner_id = auth.uid()));
drop policy if exists "poll_votes_public_read" on poll_votes;
create policy "poll_votes_public_read" on poll_votes
  for select using (true);

-- ════════════════════════════════════════════════════════════════
--  5. push_subscriptions — Web Push (VAPID)
-- ════════════════════════════════════════════════════════════════
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_owner_all" on push_subscriptions;
create policy "push_subscriptions_owner_all" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  6. calendar_integrations — external accounts (scaffold)
--  Tokens must be encrypted at rest in production (masterplan §10);
--  columns exist so the Connect flow lights up when creds are provisioned.
-- ════════════════════════════════════════════════════════════════
create table if not exists calendar_integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('google','microsoft','apple','anthropic','sms')),
  status        text not null default 'disconnected' check (status in ('disconnected','connected','error')),
  account_email text,
  access_token  text,
  refresh_token text,
  scopes        text[] not null default '{}',
  sync_token    text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);
alter table calendar_integrations enable row level security;
drop policy if exists "calendar_integrations_owner_all" on calendar_integrations;
create policy "calendar_integrations_owner_all" on calendar_integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists calendar_integrations_set_updated_at on calendar_integrations;
create trigger calendar_integrations_set_updated_at
  before update on calendar_integrations
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════
--  7. notification_log — reminders & briefings (idempotent sends)
-- ════════════════════════════════════════════════════════════════
create table if not exists notification_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('reminder','briefing','booking','poll')),
  channel         text not null check (channel in ('email','push','sms','inapp')),
  event_id        uuid references calendar_events(id) on delete set null,
  idempotency_key text unique,
  status          text not null default 'sent' check (status in ('sent','failed')),
  meta            jsonb not null default '{}'::jsonb,
  sent_at         timestamptz not null default now()
);
create index if not exists notification_log_user_idx on notification_log (user_id, sent_at);
alter table notification_log enable row level security;
drop policy if exists "notification_log_owner_read" on notification_log;
create policy "notification_log_owner_read" on notification_log
  for select using (auth.uid() = user_id);
-- Writes happen via the service role in cron jobs (no owner insert policy needed).

-- ════════════════════════════════════════════════════════════════
--  8. Booking — paid bookings, custom questions, page types
-- ════════════════════════════════════════════════════════════════
alter table booking_pages add column if not exists page_type        text    not null default 'one_off';
alter table booking_pages add column if not exists price_cents      integer not null default 0 check (price_cents >= 0);
alter table booking_pages add column if not exists currency         text    not null default 'USD';
alter table booking_pages add column if not exists requires_payment boolean not null default false;
alter table booking_pages add column if not exists questions        jsonb   not null default '[]'::jsonb;
alter table booking_pages add column if not exists max_per_day      integer;

do $$ begin
  alter table booking_pages add constraint booking_pages_type_chk
    check (page_type in ('one_off','round_robin','collective','group'));
exception when duplicate_object then null; end $$;

alter table bookings add column if not exists answers          jsonb   not null default '{}'::jsonb;
alter table bookings add column if not exists amount_cents     integer not null default 0;
alter table bookings add column if not exists currency         text    not null default 'USD';
alter table bookings add column if not exists payment_provider text;
alter table bookings add column if not exists payment_ref      text;
alter table bookings add column if not exists payment_status   text not null default 'none';

do $$ begin
  alter table bookings add constraint bookings_payment_status_chk
    check (payment_status in ('none','pending','paid','refunded'));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════════
--  Done. Apply in the Supabase SQL editor (or `supabase db push`).
-- ════════════════════════════════════════════════════════════════
