-- =============================================================================
-- DrivioGo — Admin Module Migration
-- Creates all tables for the admin module (vehicles, pricing, imports, audit)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: update updated_at automatically
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: check admin role from JWT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
$$;

-- =============================================================================
-- 1. ADMIN_USERS
-- Mirrors auth.users with admin-specific metadata.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  role        TEXT         NOT NULL DEFAULT 'VIEWER'
                CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_users_role     ON public.admin_users(role);
CREATE INDEX idx_admin_users_active   ON public.admin_users(is_active);

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin users can view all admins; super_admin can manage
CREATE POLICY "admins_can_view_admin_users"
  ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "super_admin_can_manage_admin_users"
  ON public.admin_users FOR ALL TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- 2. VEHICLES
-- The vehicle catalog managed by admins.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand         VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          SMALLINT    NOT NULL,
  version       VARCHAR(150),
  category      TEXT        NOT NULL
                CHECK (category IN ('HATCH','SEDAN','SUV','PICKUP','MINIVAN','ESPORTIVO','ELETRICO')),
  transmission  TEXT        NOT NULL
                CHECK (transmission IN ('MANUAL','AUTOMATICO','CVT')),
  fuel          TEXT        NOT NULL
                CHECK (fuel IN ('FLEX','GASOLINA','DIESEL','ELETRICO','HIBRIDO')),
  color         VARCHAR(80),
  seats         SMALLINT    NOT NULL DEFAULT 5,
  doors         SMALLINT    NOT NULL DEFAULT 4,
  description   TEXT,
  features      TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  featured_order SMALLINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vehicles_active_category  ON public.vehicles(is_active, category);
CREATE INDEX idx_vehicles_featured         ON public.vehicles(is_featured, featured_order);
CREATE INDEX idx_vehicles_brand_model      ON public.vehicles(brand, model, year);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public read for the site catalog; admins can write
CREATE POLICY "public_can_read_active_vehicles"
  ON public.vehicles FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "admins_can_read_all_vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_manage_vehicles"
  ON public.vehicles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 3. VEHICLE_IMAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  alt_text      VARCHAR(255),
  display_order SMALLINT    NOT NULL DEFAULT 0,
  is_main       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_vehicle_images_order  ON public.vehicle_images(vehicle_id, display_order);
CREATE INDEX        idx_vehicle_images_main   ON public.vehicle_images(vehicle_id, is_main);

CREATE POLICY "public_can_read_vehicle_images"
  ON public.vehicle_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_id AND v.is_active = TRUE
  ));

CREATE POLICY "admins_can_manage_vehicle_images"
  ON public.vehicle_images FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 4. PRICING_TABLES
-- A named pricing table (e.g. "Tabela Março 2026").
-- Only one can be is_active = TRUE at a time.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_tables (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pricing_tables ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pricing_tables_active ON public.pricing_tables(is_active);

CREATE TRIGGER trg_pricing_tables_updated_at
  BEFORE UPDATE ON public.pricing_tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "public_can_read_active_pricing_tables"
  ON public.pricing_tables FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "admins_can_manage_pricing_tables"
  ON public.pricing_tables FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 5. PRICING_TABLE_VERSIONS
-- Immutable snapshots of a pricing table. Once activated, data should not
-- change — create a new version instead.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_table_versions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_table_id  UUID        NOT NULL REFERENCES public.pricing_tables(id),
  version_number    INTEGER     NOT NULL,
  label             VARCHAR(255),
  notes             TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT FALSE,
  activated_at      TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID        REFERENCES public.admin_users(id),
  import_job_id     UUID        -- FK added after import_jobs table is created
);

ALTER TABLE public.pricing_table_versions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_pricing_version_unique
  ON public.pricing_table_versions(pricing_table_id, version_number);

-- Only one active version per pricing_table
CREATE UNIQUE INDEX idx_pricing_version_active
  ON public.pricing_table_versions(pricing_table_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_pricing_version_table  ON public.pricing_table_versions(pricing_table_id, is_active);

CREATE POLICY "public_can_read_active_versions"
  ON public.pricing_table_versions FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "admins_can_manage_pricing_versions"
  ON public.pricing_table_versions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 6. VEHICLE_PRICING_RULES
-- One row = one vehicle + contract duration + fixed fee values.
-- The 7 KM options go in annual_km_options.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_pricing_rules (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_table_version_id  UUID        NOT NULL
    REFERENCES public.pricing_table_versions(id) ON DELETE CASCADE,
  vehicle_id                UUID        NOT NULL REFERENCES public.vehicles(id),
  contract_duration_months  SMALLINT    NOT NULL,
  excess_km_value           NUMERIC(10,2) NOT NULL,
  monitoring_value          NUMERIC(10,2) NOT NULL,
  reserve_car_value         NUMERIC(10,2) NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Prevents duplicate rules for the same vehicle+duration in the same version
CREATE UNIQUE INDEX idx_pricing_rule_unique
  ON public.vehicle_pricing_rules(pricing_table_version_id, vehicle_id, contract_duration_months);

CREATE INDEX idx_pricing_rule_version   ON public.vehicle_pricing_rules(pricing_table_version_id);
CREATE INDEX idx_pricing_rule_vehicle   ON public.vehicle_pricing_rules(vehicle_id);

CREATE POLICY "public_can_read_pricing_rules"
  ON public.vehicle_pricing_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pricing_table_versions ptv
    WHERE ptv.id = pricing_table_version_id AND ptv.is_active = TRUE
  ));

CREATE POLICY "admins_can_manage_pricing_rules"
  ON public.vehicle_pricing_rules FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 7. ANNUAL_KM_OPTIONS
-- One of the 7 annual KM tiers for a pricing rule.
-- monthly_price is the BASE price (before monitoring + reserve car fees).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.annual_km_options (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_pricing_rule_id UUID        NOT NULL
    REFERENCES public.vehicle_pricing_rules(id) ON DELETE CASCADE,
  annual_km               INTEGER     NOT NULL,
  monthly_price           NUMERIC(10,2) NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.annual_km_options ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_km_option_unique
  ON public.annual_km_options(vehicle_pricing_rule_id, annual_km);

CREATE INDEX idx_km_option_rule ON public.annual_km_options(vehicle_pricing_rule_id);

CREATE POLICY "public_can_read_km_options"
  ON public.annual_km_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vehicle_pricing_rules vpr
    JOIN public.pricing_table_versions ptv ON ptv.id = vpr.pricing_table_version_id
    WHERE vpr.id = vehicle_pricing_rule_id AND ptv.is_active = TRUE
  ));

CREATE POLICY "admins_can_manage_km_options"
  ON public.annual_km_options FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 8. IMPORT_JOBS
-- Tracks every Excel import attempt.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name                VARCHAR(500) NOT NULL,
  file_url                 TEXT        NOT NULL,
  file_size                INTEGER,
  status                   TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED')),
  total_rows               INTEGER     NOT NULL DEFAULT 0,
  processed_rows           INTEGER     NOT NULL DEFAULT 0,
  success_rows             INTEGER     NOT NULL DEFAULT 0,
  error_rows               INTEGER     NOT NULL DEFAULT 0,
  error_summary            TEXT,
  created_by               UUID        REFERENCES public.admin_users(id),
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pricing_table_version_id UUID        REFERENCES public.pricing_table_versions(id)
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_import_jobs_status     ON public.import_jobs(status, created_at DESC);
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs(created_by);

CREATE POLICY "admins_can_manage_import_jobs"
  ON public.import_jobs FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Now add the FK from pricing_table_versions to import_jobs
ALTER TABLE public.pricing_table_versions
  ADD CONSTRAINT fk_ptv_import_job
  FOREIGN KEY (import_job_id) REFERENCES public.import_jobs(id);

-- =============================================================================
-- 9. IMPORT_JOB_ROWS
-- Per-row result from an import. Preserves raw data + processing outcome.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.import_job_rows (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id           UUID        NOT NULL
    REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number              INTEGER     NOT NULL,
  vehicle_name            VARCHAR(255) NOT NULL,
  contract_duration_months SMALLINT   NOT NULL,
  -- JSONB: [{ annualKm: number, monthlyPrice: number }, ...] — up to 7 elements
  annual_km_options       JSONB       NOT NULL DEFAULT '[]',
  excess_km_value         NUMERIC(10,2),
  monitoring_value        NUMERIC(10,2),
  reserve_car_value       NUMERIC(10,2),
  raw_data                JSONB,
  status                  TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SUCCESS','ERROR','SKIPPED')),
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_job_rows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_import_rows_job_status ON public.import_job_rows(import_job_id, status);
CREATE INDEX idx_import_rows_job_row    ON public.import_job_rows(import_job_id, row_number);

CREATE POLICY "admins_can_manage_import_rows"
  ON public.import_job_rows FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 10. AUDIT_LOGS
-- Immutable append-only log of all admin actions.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID        NOT NULL REFERENCES public.admin_users(id),
  action        TEXT        NOT NULL
    CHECK (action IN ('CREATE','UPDATE','DELETE','ACTIVATE','DEACTIVATE','IMPORT','LOGIN','LOGOUT','PASSWORD_CHANGE')),
  entity_type   VARCHAR(100) NOT NULL,
  entity_id     UUID,
  entity_label  VARCHAR(255),
  -- { before: {...}, after: {...} } for UPDATE
  -- { data: {...} }               for CREATE / DELETE / IMPORT
  changes       JSONB,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are NEVER deleted or updated — INSERT only
CREATE INDEX idx_audit_admin      ON public.audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_entity     ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action     ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_created_at ON public.audit_logs(created_at DESC);

CREATE POLICY "admins_can_read_audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_insert_audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Prevent UPDATE and DELETE on audit_logs (append-only)
CREATE POLICY "no_update_audit_logs"
  ON public.audit_logs FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY "no_delete_audit_logs"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (FALSE);

-- =============================================================================
-- Storage bucket for Excel imports and vehicle images
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vehicle-images', 'vehicle-images', TRUE),
  ('import-files',   'import-files',   FALSE)
ON CONFLICT (id) DO NOTHING;

-- Vehicle images: public read, admin write
CREATE POLICY "public_read_vehicle_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "admins_upload_vehicle_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND public.is_admin());

CREATE POLICY "admins_delete_vehicle_images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.is_admin());

-- Import files: admin only
CREATE POLICY "admins_manage_import_files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'import-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'import-files' AND public.is_admin());

-- =============================================================================
-- Function: activate a pricing table version (atomic swap)
-- Deactivates all other versions of the same table, activates the given one.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.activate_pricing_version(p_version_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id UUID;
BEGIN
  -- Get the pricing table ID for this version
  SELECT pricing_table_id INTO v_table_id
  FROM public.pricing_table_versions
  WHERE id = p_version_id;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada: %', p_version_id;
  END IF;

  -- Deactivate all versions of this table
  UPDATE public.pricing_table_versions
  SET is_active = FALSE, deactivated_at = NOW()
  WHERE pricing_table_id = v_table_id AND is_active = TRUE;

  -- Activate the target version
  UPDATE public.pricing_table_versions
  SET is_active = TRUE, activated_at = NOW()
  WHERE id = p_version_id;

  -- Ensure the parent table is also marked active
  UPDATE public.pricing_tables
  SET is_active = TRUE
  WHERE id = v_table_id;
END;
$$;
