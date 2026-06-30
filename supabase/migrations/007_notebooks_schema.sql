-- ============================================================
--  Arwign Planners — Migration 007: Notebook Management
--  Run in Supabase SQL editor after 006_pod_schema.sql
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE notebook_type       AS ENUM ('general', 'custom');
CREATE TYPE notebook_status     AS ENUM ('active', 'draft');
CREATE TYPE notebook_visibility AS ENUM ('private', 'shared', 'public');
CREATE TYPE collaborator_role   AS ENUM ('editor', 'viewer');

-- ─── NOTEBOOKS ──────────────────────────────────────────────
CREATE TABLE notebooks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  type           notebook_type       NOT NULL DEFAULT 'general',
  description    TEXT,
  cover_color    TEXT        NOT NULL DEFAULT '#C9A84C',
  owner_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status         notebook_status     NOT NULL DEFAULT 'active',
  visibility     notebook_visibility NOT NULL DEFAULT 'private',
  last_edited_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTEBOOK COLLABORATORS ─────────────────────────────────
CREATE TABLE notebook_collaborators (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID        NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        collaborator_role NOT NULL DEFAULT 'viewer',
  invited_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (notebook_id, user_id)
);

-- ─── NOTEBOOK ACTIVITY LOG ──────────────────────────────────
CREATE TABLE notebook_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID        NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX notebooks_owner_id_idx   ON notebooks (owner_id);
CREATE INDEX notebooks_status_idx     ON notebooks (status);
CREATE INDEX notebooks_visibility_idx ON notebooks (visibility);
CREATE INDEX nc_notebook_id_idx       ON notebook_collaborators (notebook_id);
CREATE INDEX nc_user_id_idx           ON notebook_collaborators (user_id);
CREATE INDEX nal_notebook_id_idx      ON notebook_activity_log (notebook_id);
CREATE INDEX nal_created_at_idx       ON notebook_activity_log (created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE notebooks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_activity_log  ENABLE ROW LEVEL SECURITY;

-- notebooks: admin full access
CREATE POLICY "notebooks_admin_all" ON notebooks
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebooks: owner full access
CREATE POLICY "notebooks_owner_all" ON notebooks
  FOR ALL TO authenticated
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- notebooks: collaborators and public read
CREATE POLICY "notebooks_collab_read" ON notebooks
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM notebook_collaborators
      WHERE notebook_id = notebooks.id AND user_id = auth.uid()
    )
  );

-- notebook_collaborators: admin full access
CREATE POLICY "nc_admin_all" ON notebook_collaborators
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebook_collaborators: owner manages their notebook's collaborators
CREATE POLICY "nc_owner_manage" ON notebook_collaborators
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM notebooks WHERE id = notebook_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM notebooks WHERE id = notebook_id AND owner_id = auth.uid())
  );

-- notebook_collaborators: users see their own entries
CREATE POLICY "nc_self_read" ON notebook_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- notebook_activity_log: admin full access
CREATE POLICY "nal_admin_all" ON notebook_activity_log
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- notebook_activity_log: owners and collaborators can read
CREATE POLICY "nal_participant_read" ON notebook_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notebook_id
        AND (
          n.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM notebook_collaborators nc
            WHERE nc.notebook_id = n.id AND nc.user_id = auth.uid()
          )
        )
    )
  );

-- notebook_activity_log: participants can insert
CREATE POLICY "nal_participant_insert" ON notebook_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── TRIGGER: auto-update updated_at ────────────────────────
CREATE OR REPLACE FUNCTION update_notebooks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_notebooks_updated_at();
