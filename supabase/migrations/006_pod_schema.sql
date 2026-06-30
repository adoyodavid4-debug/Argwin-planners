-- ============================================================
--  Arwign Planners — Phase 1 + Phase 2 POD Schema
-- ============================================================

-- ─── Phase 1: product_type + fulfillment_options ─────────────

-- Product type discriminator (planner | notebook)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'planner'
    CHECK (product_type IN ('planner','notebook'));

-- How this product can be fulfilled
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_options TEXT NOT NULL DEFAULT 'digital'
    CHECK (fulfillment_options IN ('digital','print','both'));

-- Index for filtering
CREATE INDEX IF NOT EXISTS products_type_idx ON products (product_type);

-- Seed the Digital Notebooks category
INSERT INTO categories (name, name_fr, slug, icon, sort_order, is_featured)
VALUES ('Digital Notebooks', 'Cahiers Numériques', 'digital-notebooks', 'notebook', 14, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ─── Phase 2: POD tables ─────────────────────────────────────

-- Print product spec (ties a product to a POD provider config)
CREATE TABLE IF NOT EXISTS print_products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL DEFAULT 'lulu',
  pod_package_id   TEXT NOT NULL,           -- e.g. '0600X0900BWSTDPB060UW444MXX'
  interior_pdf_url TEXT NOT NULL,           -- print-ready interior (NOT the digital download)
  cover_pdf_url    TEXT NOT NULL,
  base_cost        INTEGER NOT NULL,        -- provider base cost in minor units (e.g. cents)
  retail_price     INTEGER NOT NULL,        -- what we charge, minor units
  currency         TEXT NOT NULL DEFAULT 'USD',
  min_margin_pct   INTEGER NOT NULL DEFAULT 30, -- margin guard threshold %
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, provider)
);

-- Physical orders (created after payment, before POD submission)
CREATE TABLE IF NOT EXISTS physical_orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shipping_address   JSONB NOT NULL,
  shipping_level     TEXT NOT NULL,
  shipping_cost      INTEGER NOT NULL,      -- minor units
  subtotal           INTEGER NOT NULL,      -- minor units
  total              INTEGER NOT NULL,      -- minor units
  currency           TEXT NOT NULL DEFAULT 'USD',
  provider           TEXT NOT NULL DEFAULT 'lulu',
  provider_job_id    TEXT,                  -- null until submitted
  fulfillment_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (fulfillment_status IN (
      'pending_review','submitted','accepted','in_production',
      'shipped','delivered','rejected','canceled','error'
    )),
  tracking_url       TEXT,
  tracking_number    TEXT,
  failure_reason     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS physical_orders_status_idx ON physical_orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS physical_orders_user_idx   ON physical_orders (user_id);

-- Append-only audit log for every status transition
CREATE TABLE IF NOT EXISTS fulfillment_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physical_order_id UUID NOT NULL REFERENCES physical_orders(id) ON DELETE CASCADE,
  status            TEXT NOT NULL,
  payload           JSONB DEFAULT '{}',
  source            TEXT NOT NULL DEFAULT 'webhook'
    CHECK (source IN ('webhook','admin','poll')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fulfillment_events_order_idx ON fulfillment_events (physical_order_id);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE print_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_events ENABLE ROW LEVEL SECURITY;

-- print_products: cost fields admin-only; active records publicly readable
CREATE POLICY "print_products: public read active" ON print_products
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "print_products: admin all" ON print_products
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- physical_orders: customers see their own; admin sees all
CREATE POLICY "physical_orders: own" ON physical_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "physical_orders: admin" ON physical_orders
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- fulfillment_events: customers see events for their own orders; admin sees all
CREATE POLICY "fulfillment_events: own order" ON fulfillment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM physical_orders po
      WHERE po.id = physical_order_id AND po.user_id = auth.uid()
    )
  );
CREATE POLICY "fulfillment_events: admin" ON fulfillment_events
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- ─── Triggers ────────────────────────────────────────────────

CREATE TRIGGER set_print_products_updated_at
  BEFORE UPDATE ON print_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_physical_orders_updated_at
  BEFORE UPDATE ON physical_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Helper: advance fulfillment status with audit log ───────

CREATE OR REPLACE FUNCTION advance_fulfillment_status(
  p_physical_order_id UUID,
  p_new_status        TEXT,
  p_payload           JSONB  DEFAULT '{}',
  p_source            TEXT   DEFAULT 'admin'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current TEXT;
  -- Valid forward transitions only
  valid BOOLEAN := FALSE;
BEGIN
  SELECT fulfillment_status INTO v_current
  FROM physical_orders WHERE id = p_physical_order_id FOR UPDATE;

  -- Allow any → rejected/canceled/error as side exits
  IF p_new_status IN ('rejected','canceled','error') THEN
    valid := TRUE;
  END IF;

  -- Forward-only state machine
  IF (v_current = 'pending_review' AND p_new_status = 'submitted')   THEN valid := TRUE; END IF;
  IF (v_current = 'submitted'      AND p_new_status = 'accepted')     THEN valid := TRUE; END IF;
  IF (v_current = 'accepted'       AND p_new_status = 'in_production') THEN valid := TRUE; END IF;
  IF (v_current = 'in_production'  AND p_new_status = 'shipped')      THEN valid := TRUE; END IF;
  IF (v_current = 'shipped'        AND p_new_status = 'delivered')     THEN valid := TRUE; END IF;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid fulfillment transition: % → %', v_current, p_new_status;
  END IF;

  UPDATE physical_orders
  SET fulfillment_status = p_new_status,
      tracking_url       = COALESCE((p_payload->>'tracking_url')::TEXT, tracking_url),
      tracking_number    = COALESCE((p_payload->>'tracking_number')::TEXT, tracking_number),
      failure_reason     = CASE WHEN p_new_status IN ('rejected','error') THEN (p_payload->>'reason')::TEXT ELSE failure_reason END
  WHERE id = p_physical_order_id;

  INSERT INTO fulfillment_events (physical_order_id, status, payload, source)
  VALUES (p_physical_order_id, p_new_status, p_payload, p_source);
END;
$$;
