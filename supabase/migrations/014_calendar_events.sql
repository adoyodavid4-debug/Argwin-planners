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
