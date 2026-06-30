-- ============================================================
--  Arwign Planners — Funnel Schema (Pillar 1)
--  Lead-Magnet → Email → Sale
-- ============================================================

-- citext for case-insensitive email dedup
CREATE EXTENSION IF NOT EXISTS citext;

-- ─── EMAIL SEQUENCES ─────────────────────────────────────────
CREATE TABLE email_sequences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL DEFAULT 'on_confirm',  -- on_confirm | on_tag
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id  UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order   INTEGER NOT NULL,
  delay_hours  INTEGER NOT NULL DEFAULT 0,
  template_key TEXT NOT NULL,
  subject_i18n JSONB NOT NULL DEFAULT '{}',  -- { "en": "...", "fr": "..." }
  body_i18n    JSONB NOT NULL DEFAULT '{}',
  cta_i18n     JSONB NOT NULL DEFAULT '{}',
  data_overrides JSONB DEFAULT '{}',         -- extra merge vars for this step
  UNIQUE(sequence_id, step_order)
);

-- ─── LEAD MAGNETS ────────────────────────────────────────────
CREATE TABLE lead_magnets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT NOT NULL UNIQUE,
  title_i18n          JSONB NOT NULL DEFAULT '{}',         -- { "en": "...", "fr": "..." }
  description_i18n    JSONB NOT NULL DEFAULT '{}',
  asset_path          TEXT NOT NULL,                        -- Supabase Storage path (private bucket)
  preview_image       TEXT,
  og_image            TEXT,
  pin_image           TEXT,
  enroll_sequence_id  UUID REFERENCES email_sequences(id),
  is_active           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBSCRIBERS ─────────────────────────────────────────────
-- Replaces the basic newsletter_subscribers table with full funnel tracking
CREATE TABLE subscribers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                CITEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','unsubscribed','bounced','complained')),
  locale               TEXT NOT NULL DEFAULT 'en',
  confirmed_at         TIMESTAMPTZ,
  unsubscribed_at      TIMESTAMPTZ,
  source_lead_magnet_id UUID REFERENCES lead_magnets(id),
  utm                  JSONB DEFAULT '{}',
  consent_at           TIMESTAMPTZ NOT NULL,
  consent_text         TEXT NOT NULL,
  tags                 TEXT[] DEFAULT '{}',
  optin_token          TEXT,
  optin_token_expires_at TIMESTAMPTZ,
  unsub_token          TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscribers_email_idx  ON subscribers (email);
CREATE INDEX subscribers_status_idx ON subscribers (status);
CREATE INDEX subscribers_token_idx  ON subscribers (optin_token);

-- ─── SUBSCRIBER SEQUENCE STATE ───────────────────────────────
CREATE TABLE subscriber_sequence_state (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  sequence_id  UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','completed','paused','exited')),
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, sequence_id)
);

CREATE INDEX sss_active_idx ON subscriber_sequence_state (status, next_send_at)
  WHERE status = 'active';

-- ─── EMAIL EVENTS ────────────────────────────────────────────
CREATE TABLE email_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  type          TEXT NOT NULL
                  CHECK (type IN ('sent','delivered','opened','clicked','bounced','complaint','unsubscribed')),
  idempotency_key TEXT UNIQUE,              -- prevent double-send auditing
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_events_subscriber_idx ON email_events (subscriber_id);

-- ─── FREEBIE DELIVERIES ──────────────────────────────────────
CREATE TABLE freebie_deliveries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id    UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  lead_magnet_id   UUID NOT NULL REFERENCES lead_magnets(id),
  signed_url_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE email_sequences           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_sequence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE freebie_deliveries        ENABLE ROW LEVEL SECURITY;

-- All tables: admin only (reads). No public select on subscriber data.
CREATE POLICY "admin only" ON subscribers
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_sequences
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_sequence_steps
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Lead magnets: public can read active ones (needed for landing pages via service role)
CREATE POLICY "public read active" ON lead_magnets
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "admin write" ON lead_magnets
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON subscriber_sequence_state
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON email_events
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin only" ON freebie_deliveries
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- ─── TRIGGERS ────────────────────────────────────────────────
CREATE TRIGGER set_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sss_updated_at
  BEFORE UPDATE ON subscriber_sequence_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SEED: Default welcome sequence ──────────────────────────
INSERT INTO email_sequences (slug, name, trigger, is_active) VALUES
  ('welcome-en', 'Welcome Sequence (EN)', 'on_confirm', FALSE),
  ('welcome-fr', 'Welcome Sequence (FR)', 'on_confirm', FALSE);
