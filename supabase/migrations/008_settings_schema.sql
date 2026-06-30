-- ============================================================
--  Arwign Planners — Migration 008: Site Settings
--  Run in Supabase SQL editor after 007_notebooks_schema.sql
-- ============================================================

CREATE TABLE site_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults
INSERT INTO site_settings (key, value) VALUES
  ('store_name',            '"Arwign Planners"'),
  ('store_tagline',         '"Capture the chaos. Find the clarity."'),
  ('contact_email',         '""'),
  ('support_email',         '""'),
  ('default_currency',      '"USD"'),
  ('default_locale',        '"en"'),
  ('notify_new_order',      'true'),
  ('notify_new_subscriber', 'true'),
  ('return_policy',         '""'),
  ('shipping_info',         '""')
ON CONFLICT (key) DO NOTHING;

-- RLS: only admin/super_admin can read or write
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_admin_all" ON site_settings
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_site_settings_updated_at();
