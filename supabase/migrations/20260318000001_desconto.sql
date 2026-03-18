-- =============================================================================
-- DrivioGo — Desconto (Discount) Migration
-- Adds a discount system that can be applied to:
--   a) All vehicles across all pricing tables
--   b) All vehicles in a specific pricing table
--   c) Individual vehicles
-- Discount has a highlight flag so when active it's shown prominently
-- to the end customer on the public site.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. DISCOUNTS — master discount records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discounts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  description      TEXT,

  -- Discount percentage (e.g. 10.00 = 10%)
  percentage       NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),

  -- Scope: ALL | TABLE | VEHICLE
  scope            TEXT        NOT NULL DEFAULT 'ALL'
                   CHECK (scope IN ('ALL', 'TABLE', 'VEHICLE')),

  -- When scope = TABLE: which pricing table
  pricing_table_id UUID        REFERENCES public.pricing_tables(id) ON DELETE SET NULL,

  -- Highlight flag: when TRUE, the discount is shown prominently on the public site
  is_highlighted   BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Active flag (admin can pause without deleting)
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Vigência
  effective_from   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until  TIMESTAMPTZ,

  -- Audit
  created_by       UUID        REFERENCES public.admin_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_discounts_active    ON public.discounts(is_active, effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_discounts_scope     ON public.discounts(scope);
CREATE INDEX IF NOT EXISTS idx_discounts_table     ON public.discounts(pricing_table_id);
CREATE INDEX IF NOT EXISTS idx_discounts_highlight ON public.discounts(is_highlighted, is_active);

CREATE TRIGGER trg_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public: can read active, in-effect discounts
CREATE POLICY "public_can_read_active_discounts"
  ON public.discounts FOR SELECT
  USING (
    is_active = TRUE
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW())
  );

CREATE POLICY "admins_can_manage_discounts"
  ON public.discounts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. DISCOUNT_VEHICLES — many-to-many: which vehicles a VEHICLE-scoped discount applies to
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discount_vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id  UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (discount_id, vehicle_id)
);

ALTER TABLE public.discount_vehicles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_discount_vehicles_discount ON public.discount_vehicles(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_vehicles_vehicle  ON public.discount_vehicles(vehicle_id);

CREATE POLICY "public_can_read_discount_vehicles"
  ON public.discount_vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discounts d
      WHERE d.id = discount_id
        AND d.is_active = TRUE
        AND d.effective_from <= NOW()
        AND (d.effective_until IS NULL OR d.effective_until > NOW())
    )
  );

CREATE POLICY "admins_can_manage_discount_vehicles"
  ON public.discount_vehicles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. DISCOUNT_CHANGE_LOG — append-only history of discount changes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discount_change_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id    UUID        NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL CHECK (action IN ('CREATE','UPDATE','DEACTIVATE','REACTIVATE')),
  previous_values JSONB,
  new_values      JSONB,
  changed_by     UUID        REFERENCES public.admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.discount_change_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dcl_discount    ON public.discount_change_log(discount_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcl_changed_by  ON public.discount_change_log(changed_by);

CREATE POLICY "admins_can_read_discount_log"
  ON public.discount_change_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_insert_discount_log"
  ON public.discount_change_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "no_update_discount_log"
  ON public.discount_change_log FOR UPDATE TO authenticated USING (FALSE);

CREATE POLICY "no_delete_discount_log"
  ON public.discount_change_log FOR DELETE TO authenticated USING (FALSE);

-- ---------------------------------------------------------------------------
-- 4. Helper: get the best applicable discount for a vehicle at a specific moment
-- Returns the highest percentage discount that applies to the vehicle.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_vehicle_discount(
  p_vehicle_id     UUID,
  p_pricing_table_id UUID DEFAULT NULL,
  p_at             TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  discount_id    UUID,
  name           VARCHAR(255),
  percentage     NUMERIC(5,2),
  is_highlighted BOOLEAN
)
LANGUAGE sql STABLE
AS $$
  SELECT d.id, d.name, d.percentage, d.is_highlighted
  FROM public.discounts d
  LEFT JOIN public.discount_vehicles dv
    ON dv.discount_id = d.id AND dv.vehicle_id = p_vehicle_id
  WHERE d.is_active = TRUE
    AND d.effective_from <= p_at
    AND (d.effective_until IS NULL OR d.effective_until > p_at)
    AND (
      d.scope = 'ALL'
      OR (d.scope = 'TABLE' AND d.pricing_table_id = p_pricing_table_id)
      OR (d.scope = 'VEHICLE' AND dv.vehicle_id IS NOT NULL)
    )
  ORDER BY d.percentage DESC
  LIMIT 1;
$$;
