-- ─── CONTACT MESSAGES ────────────────────────────────────────
-- Submissions from the public /contact page
CREATE TABLE contact_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       CITEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'read', 'replied')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contact_messages_status_idx  ON contact_messages (status);
CREATE INDEX contact_messages_created_idx ON contact_messages (created_at);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON contact_messages
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE TRIGGER set_contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
