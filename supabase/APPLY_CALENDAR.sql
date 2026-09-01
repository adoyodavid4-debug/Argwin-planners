-- APPLY_CALENDAR.sql — run once in the Supabase SQL editor to enable the
-- Arwign Calendar (personal events) + booking pages. Safe to re-run.

-- ========== 014: calendar_events ==========
-- 014_calendar_events.sql — Arwign Calendar · Phase 1 core (events)
-- Single-user personal events with row-level security. Times are stored as UTC
-- (timestamptz) plus the originating IANA zone, for correct cross-tz display.
-- Recurrence, attendees, reminders and external-sync fields are deferred to
-- later phases (masterplan §6/§7).

create extension if not exists pgcrypto;

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  location    text,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  all_day     boolean not null default false,
  start_tz    text not null default 'Africa/Nairobi',
  colour      text not null default 'brass',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint calendar_events_time_order check (end_at >= start_at)
);

create index if not exists calendar_events_user_start_idx
  on calendar_events (user_id, start_at);

alter table calendar_events enable row level security;

-- Owners have full control over their own events; nobody else can see them.
drop policy if exists "calendar_events_owner_all" on calendar_events;
create policy "calendar_events_owner_all" on calendar_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh (set_updated_at() is defined in 001_schema.sql).
drop trigger if exists calendar_events_set_updated_at on calendar_events;
create trigger calendar_events_set_updated_at
  before update on calendar_events
  for each row execute function set_updated_at();

-- ========== 015: booking pages ==========
-- 015_booking.sql — Arwign Calendar · Booking pages (Calendly-class)
-- Public scheduling links owned by a user; external visitors book a free slot,
-- which creates a confirmed booking + a calendar_event on the owner's calendar.
-- RLS ships in the same migration (masterplan §10). Public booking creation is
-- performed server-side with the service role, so no anon write policy is needed.

create extension if not exists pgcrypto;

-- ── Booking pages ────────────────────────────────────────────
create table if not exists booking_pages (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug             text not null unique,
  title            text not null,
  description      text,
  duration_min     integer not null default 30 check (duration_min between 5 and 480),
  buffer_min       integer not null default 0  check (buffer_min between 0 and 240),
  min_notice_hours integer not null default 4  check (min_notice_hours between 0 and 720),
  advance_days     integer not null default 30 check (advance_days between 1 and 365),
  timezone         text    not null default 'Africa/Nairobi',
  -- Weekly availability windows keyed by ISO weekday (1=Mon … 7=Sun),
  -- each an array of [start,end] wall-clock strings, e.g. {"1":[["09:00","17:00"]]}.
  working_hours    jsonb   not null default '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}'::jsonb,
  location         text,                       -- e.g. "Google Meet" or a physical address
  colour           text not null default 'sage',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists booking_pages_owner_idx on booking_pages (owner_id);

alter table booking_pages enable row level security;

-- Owners fully control their own pages.
drop policy if exists "booking_pages_owner_all" on booking_pages;
create policy "booking_pages_owner_all" on booking_pages
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Anyone may read an active page (the public booking screen).
drop policy if exists "booking_pages_public_read" on booking_pages;
create policy "booking_pages_public_read" on booking_pages
  for select using (is_active = true);

drop trigger if exists booking_pages_set_updated_at on booking_pages;
create trigger booking_pages_set_updated_at
  before update on booking_pages
  for each row execute function set_updated_at();

-- ── Bookings ─────────────────────────────────────────────────
create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  booking_page_id uuid not null references booking_pages(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade, -- denormalised for RLS
  event_id        uuid references calendar_events(id) on delete set null,
  name            text not null,
  email           text not null,
  notes           text,
  guest_tz        text,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  status          text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bookings_time_order check (end_at > start_at)
);

create index if not exists bookings_owner_start_idx on bookings (owner_id, start_at);
create index if not exists bookings_page_start_idx  on bookings (booking_page_id, start_at);
-- Prevent the same slot being double-booked on a page.
create unique index if not exists bookings_page_slot_uniq
  on bookings (booking_page_id, start_at) where (status = 'confirmed');

alter table bookings enable row level security;

-- Owners see and manage bookings made against their pages. Public creation is
-- done via the service role in /api/calendar/bookings (no anon policy).
drop policy if exists "bookings_owner_all" on bookings;
create policy "bookings_owner_all" on bookings
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();
