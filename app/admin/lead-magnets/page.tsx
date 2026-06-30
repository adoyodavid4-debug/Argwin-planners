import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import MigrationSetup from '@/components/admin/MigrationSetup'

export const metadata: Metadata = {
  title: 'Lead Magnets — Admin',
  robots: { index: false, follow: false },
}

const FUNNEL_SQL = `-- ============================================================
--  Arwign Planners — Funnel Schema (Pillar 1)
--  Lead-Magnet → Email → Sale
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- ─── EMAIL SEQUENCES ─────────────────────────────────────────
CREATE TABLE email_sequences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL DEFAULT 'on_confirm',
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
  subject_i18n JSONB NOT NULL DEFAULT '{}',
  body_i18n    JSONB NOT NULL DEFAULT '{}',
  cta_i18n     JSONB NOT NULL DEFAULT '{}',
  data_overrides JSONB DEFAULT '{}',
  UNIQUE(sequence_id, step_order)
);

-- ─── LEAD MAGNETS ────────────────────────────────────────────
CREATE TABLE lead_magnets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT NOT NULL UNIQUE,
  title_i18n          JSONB NOT NULL DEFAULT '{}',
  description_i18n    JSONB NOT NULL DEFAULT '{}',
  asset_path          TEXT NOT NULL,
  preview_image       TEXT,
  og_image            TEXT,
  pin_image           TEXT,
  enroll_sequence_id  UUID REFERENCES email_sequences(id),
  is_active           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBSCRIBERS ─────────────────────────────────────────────
CREATE TABLE subscribers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 CITEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','unsubscribed','bounced','complained')),
  locale                TEXT NOT NULL DEFAULT 'en',
  confirmed_at          TIMESTAMPTZ,
  unsubscribed_at       TIMESTAMPTZ,
  source_lead_magnet_id UUID REFERENCES lead_magnets(id),
  utm                   JSONB DEFAULT '{}',
  consent_at            TIMESTAMPTZ NOT NULL,
  consent_text          TEXT NOT NULL,
  tags                  TEXT[] DEFAULT '{}',
  optin_token           TEXT,
  optin_token_expires_at TIMESTAMPTZ,
  unsub_token           TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscribers_email_idx  ON subscribers (email);
CREATE INDEX subscribers_status_idx ON subscribers (status);
CREATE INDEX subscribers_token_idx  ON subscribers (optin_token);

-- ─── SUBSCRIBER SEQUENCE STATE ───────────────────────────────
CREATE TABLE subscriber_sequence_state (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  sequence_id   UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step  INTEGER NOT NULL DEFAULT 0,
  next_send_at  TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','paused','exited')),
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, sequence_id)
);

CREATE INDEX sss_active_idx ON subscriber_sequence_state (status, next_send_at)
  WHERE status = 'active';

-- ─── EMAIL EVENTS ────────────────────────────────────────────
CREATE TABLE email_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id   UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  type            TEXT NOT NULL
                    CHECK (type IN ('sent','delivered','opened','clicked','bounced','complaint','unsubscribed')),
  idempotency_key TEXT UNIQUE,
  meta            JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_events_subscriber_idx ON email_events (subscriber_id);

-- ─── FREEBIE DELIVERIES ──────────────────────────────────────
CREATE TABLE freebie_deliveries (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id        UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  lead_magnet_id       UUID NOT NULL REFERENCES lead_magnets(id),
  signed_url_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE email_sequences           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_sequence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE freebie_deliveries        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON subscribers
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));
CREATE POLICY "admin only" ON email_sequences
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));
CREATE POLICY "admin only" ON email_sequence_steps
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));
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
  BEFORE UPDATE ON subscribers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_sss_updated_at
  BEFORE UPDATE ON subscriber_sequence_state FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SEED ────────────────────────────────────────────────────
INSERT INTO email_sequences (slug, name, trigger, is_active) VALUES
  ('welcome-en', 'Welcome Sequence (EN)', 'on_confirm', FALSE),
  ('welcome-fr', 'Welcome Sequence (FR)', 'on_confirm', FALSE);`

export default async function LeadMagnetsPage() {
  const supabase = createServiceRoleClient()
  const { data: magnets, error } = await supabase
    .from('lead_magnets')
    .select('id, slug, title_i18n, is_active, created_at, email_sequences(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
        <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Lead Magnets</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <MigrationSetup
            migrationFile="supabase/migrations/004_funnel_schema.sql"
            sql={FUNNEL_SQL}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Lead Magnets</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(224,168,44,0.12)', color: 'var(--gold)' }}>
              {magnets?.length ?? 0}
            </span>
          </div>
          <Link
            href="/admin/lead-magnets/new"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--gold)' }}
          >
            + New Lead Magnet
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-subtle)' }}>
              <tr className="text-left">
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Title (EN)</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Slug</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Sequence</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(magnets ?? []).map((m) => (
                <tr key={m.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {(m.title_i18n as Record<string, string>)['en'] ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{m.slug}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {(m.email_sequences as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/lead-magnets/${m.id}`}
                        className="text-xs hover:underline" style={{ color: 'var(--gold)' }}>
                        Edit
                      </Link>
                      <a href={`/free/${m.slug}`} target="_blank" rel="noopener"
                        className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
                        Preview ↗
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {!magnets?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No lead magnets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
