-- 026_error_events.sql — production error capture (see lib/error-tracking.ts).
-- Written by the service role from API routes / crons; read only by admins.

CREATE TABLE IF NOT EXISTS error_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source     TEXT NOT NULL,                       -- e.g. 'api/paypal/capture'
  message    TEXT NOT NULL,
  stack      TEXT,
  context    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_events_created_idx ON error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS error_events_source_idx  ON error_events (source);

ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: the service role bypasses RLS for inserts,
-- and only admins should read these. Expose via an admin-only view/RPC later
-- if a dashboard is built; for now rows are write-by-service, read-by-DBA.
