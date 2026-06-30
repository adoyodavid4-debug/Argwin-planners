-- ─── NOTEBOOK REQUESTS ───────────────────────────────────────
-- Customer-submitted ideas for personalized/custom notebooks
CREATE TABLE notebook_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       CITEXT NOT NULL,
  idea        TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'en',
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reviewing', 'accepted', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notebook_requests_status_idx  ON notebook_requests (status);
CREATE INDEX notebook_requests_created_idx ON notebook_requests (created_at);

ALTER TABLE notebook_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON notebook_requests
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE TRIGGER set_notebook_requests_updated_at
  BEFORE UPDATE ON notebook_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
