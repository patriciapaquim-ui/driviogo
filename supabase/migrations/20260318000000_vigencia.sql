-- =============================================================================
-- DrivioGo — Vigência (Effective Date) Migration
-- Adds scheduling/effective-date support to vehicles and pricing versions.
-- No data is ever deleted; effective_from / effective_until control visibility.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. VEHICLES — add effective_from and effective_until
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ;

-- Back-fill existing rows so effective_from equals created_at
UPDATE public.vehicles SET effective_from = created_at WHERE effective_from = NOW();

CREATE INDEX IF NOT EXISTS idx_vehicles_effective
  ON public.vehicles(effective_from, effective_until);

-- ---------------------------------------------------------------------------
-- 2. VEHICLE_CHANGE_HISTORY — immutable log of every vehicle edit
-- Preserves previous values so no data is ever lost on update.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_change_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  changed_fields  TEXT[]      NOT NULL DEFAULT '{}',    -- which fields changed
  previous_values JSONB       NOT NULL DEFAULT '{}',    -- snapshot before change
  new_values      JSONB       NOT NULL DEFAULT '{}',    -- snapshot after change
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- when change takes effect
  changed_by      UUID        REFERENCES public.admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_change_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vch_vehicle    ON public.vehicle_change_history(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vch_changed_by ON public.vehicle_change_history(changed_by);

CREATE POLICY "admins_can_read_vehicle_history"
  ON public.vehicle_change_history FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_insert_vehicle_history"
  ON public.vehicle_change_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Prevent UPDATE / DELETE — append-only
CREATE POLICY "no_update_vehicle_history"
  ON public.vehicle_change_history FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY "no_delete_vehicle_history"
  ON public.vehicle_change_history FOR DELETE TO authenticated
  USING (FALSE);

-- ---------------------------------------------------------------------------
-- 3. VEHICLES — update public-read policy to honour effective dates
-- Public can see a vehicle only when:
--   effective_from <= NOW()  AND  (effective_until IS NULL OR effective_until > NOW())
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_can_read_active_vehicles" ON public.vehicles;

CREATE POLICY "public_can_read_active_vehicles"
  ON public.vehicles FOR SELECT
  USING (
    effective_from  <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW())
  );

-- ---------------------------------------------------------------------------
-- 4. PRICING_TABLE_VERSIONS — add effective_from
-- Allows scheduling a new price table for a future date.
-- The "current" version = is_active = TRUE with the highest version_number
-- where effective_from IS NULL OR effective_from <= NOW().
-- ---------------------------------------------------------------------------

ALTER TABLE public.pricing_table_versions
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ;

-- Remove old unique index that prevented multiple is_active=TRUE per table
-- (needed now that a future version can coexist with the current active one)
DROP INDEX IF EXISTS idx_pricing_version_active;

-- Replace with a partial index that allows at most one IMMEDIATE active version
-- (effective_from IS NULL or in the past) — future-scheduled versions are allowed.
-- Note: enforced at application level; we cannot express this purely as a unique index.

CREATE INDEX IF NOT EXISTS idx_pricing_version_effective
  ON public.pricing_table_versions(pricing_table_id, is_active, effective_from DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- 5. PRICING_TABLE_VERSIONS — update public-read policy
-- Public can see a version only when is_active = TRUE AND effective date passed.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_can_read_active_versions" ON public.pricing_table_versions;

CREATE POLICY "public_can_read_active_versions"
  ON public.pricing_table_versions FOR SELECT
  USING (
    is_active = TRUE
    AND (effective_from IS NULL OR effective_from <= NOW())
  );

-- ---------------------------------------------------------------------------
-- 6. UPDATE activate_pricing_version — accept optional effective_from
-- If p_effective_from is NOW (or NULL), activates immediately (original behaviour).
-- If p_effective_from is in the future, schedules the version without
-- deactivating the current active version yet — it will be superseded
-- automatically when the public site queries by (is_active=TRUE, effective_from<=NOW(),
-- version_number DESC LIMIT 1).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_pricing_version(
  p_version_id    UUID,
  p_effective_from TIMESTAMPTZ DEFAULT NULL   -- NULL = immediate
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id    UUID;
  v_effective   TIMESTAMPTZ;
BEGIN
  v_effective := COALESCE(p_effective_from, NOW());

  -- Get the pricing table ID for this version
  SELECT pricing_table_id INTO v_table_id
  FROM public.pricing_table_versions
  WHERE id = p_version_id;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada: %', p_version_id;
  END IF;

  -- Set effective_from and mark as active on the target version
  UPDATE public.pricing_table_versions
  SET is_active     = TRUE,
      effective_from = v_effective,
      activated_at  = CASE WHEN v_effective <= NOW() THEN NOW() ELSE activated_at END
  WHERE id = p_version_id;

  -- Ensure parent pricing table is marked active
  UPDATE public.pricing_tables
  SET is_active = TRUE
  WHERE id = v_table_id;

  -- For IMMEDIATE activations: deactivate all OTHER versions of this table
  -- that are currently active and have no future effective_from
  IF v_effective <= NOW() THEN
    UPDATE public.pricing_table_versions
    SET is_active      = FALSE,
        deactivated_at = NOW()
    WHERE pricing_table_id = v_table_id
      AND id              <> p_version_id
      AND is_active        = TRUE
      AND (effective_from IS NULL OR effective_from <= NOW());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Helper function: clone a pricing version with selective price overrides
-- Used by admin "Edit Prices with Vigência" feature.
-- p_overrides: JSON array of { "km_option_id": "<uuid>", "monthly_price": 1234.56 }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clone_pricing_version_with_overrides(
  p_source_version_id UUID,
  p_label             TEXT,
  p_notes             TEXT,
  p_effective_from    TIMESTAMPTZ,
  p_created_by        UUID,
  p_overrides         JSONB DEFAULT '[]'
)
RETURNS UUID   -- new version id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id      UUID;
  v_new_version   INTEGER;
  v_new_ver_id    UUID;
  v_rule          RECORD;
  v_new_rule_id   UUID;
  v_km            RECORD;
  v_new_price     NUMERIC(10,2);
BEGIN
  -- Get pricing_table_id and next version number
  SELECT pricing_table_id INTO v_table_id
  FROM public.pricing_table_versions WHERE id = p_source_version_id;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_new_version
  FROM public.pricing_table_versions WHERE pricing_table_id = v_table_id;

  -- Create new version row
  INSERT INTO public.pricing_table_versions
    (pricing_table_id, version_number, label, notes, is_active, effective_from, created_by)
  VALUES
    (v_table_id, v_new_version, p_label, p_notes, TRUE, p_effective_from, p_created_by)
  RETURNING id INTO v_new_ver_id;

  -- Clone each pricing rule
  FOR v_rule IN
    SELECT * FROM public.vehicle_pricing_rules WHERE pricing_table_version_id = p_source_version_id
  LOOP
    INSERT INTO public.vehicle_pricing_rules
      (pricing_table_version_id, vehicle_id, contract_duration_months,
       excess_km_value, monitoring_value, reserve_car_value)
    VALUES
      (v_new_ver_id, v_rule.vehicle_id, v_rule.contract_duration_months,
       v_rule.excess_km_value, v_rule.monitoring_value, v_rule.reserve_car_value)
    RETURNING id INTO v_new_rule_id;

    -- Clone km options for this rule (apply overrides if any)
    FOR v_km IN
      SELECT * FROM public.annual_km_options WHERE vehicle_pricing_rule_id = v_rule.id
    LOOP
      -- Check if there's an override for this km_option
      SELECT (elem->>'monthly_price')::NUMERIC(10,2)
      INTO v_new_price
      FROM jsonb_array_elements(p_overrides) AS elem
      WHERE (elem->>'km_option_id') = v_km.id::TEXT
      LIMIT 1;

      INSERT INTO public.annual_km_options
        (vehicle_pricing_rule_id, annual_km, monthly_price)
      VALUES
        (v_new_rule_id, v_km.annual_km, COALESCE(v_new_price, v_km.monthly_price));
    END LOOP;
  END LOOP;

  -- If effective_from is immediate, deactivate all other active versions
  IF p_effective_from <= NOW() THEN
    UPDATE public.pricing_table_versions
    SET is_active = FALSE, deactivated_at = NOW()
    WHERE pricing_table_id = v_table_id
      AND id <> v_new_ver_id
      AND is_active = TRUE
      AND (effective_from IS NULL OR effective_from <= NOW());
  END IF;

  RETURN v_new_ver_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. AUDIT_LOGS — add effective_from field to changes JSONB (no schema change
--    needed; it's stored in the free-form `changes` column).
--    Also add a dedicated index for vigência-related queries.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_vigencia
  ON public.audit_logs((changes->>'effective_from'));
