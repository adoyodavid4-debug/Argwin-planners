-- 017_calendar_sync.sql — external calendar sync (Google / Microsoft)
-- Adds the identity + provenance columns the sync engine needs for loop-safe
-- two-way sync (masterplan §7): every synced event carries its external id +
-- etag, and `source` marks who created it so an inbound change for our own
-- write is never pushed back out. RLS is already enforced by the owner policy
-- on calendar_events (migration 014).

alter table calendar_events add column if not exists external_id       text;
alter table calendar_events add column if not exists external_provider text;   -- 'google' | 'microsoft'
alter table calendar_events add column if not exists etag              text;
alter table calendar_events add column if not exists source            text not null default 'native'; -- 'native' | 'google' | 'microsoft'

-- One row per external event per user (idempotent upserts on pull).
create unique index if not exists calendar_events_external_uniq
  on calendar_events (user_id, external_provider, external_id)
  where external_id is not null;

-- Fast lookup of un-pushed native events during an outbound sync pass.
create index if not exists calendar_events_source_idx
  on calendar_events (user_id, source);
