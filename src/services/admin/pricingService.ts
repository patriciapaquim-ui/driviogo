// =============================================================================
// DrivioGo — Pricing Service
// Reads pricing tables, versions, and rules from Supabase.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { PricingTable, PricingTableVersion, VehiclePricingRule, AnnualKmOption } from '@/types/admin';

const db = supabase as any;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapKmOption(r: Record<string, unknown>): AnnualKmOption {
  return {
    id:                   r.id                     as string,
    vehiclePricingRuleId: r.vehicle_pricing_rule_id as string,
    annualKm:             r.annual_km               as number,
    monthlyPrice:         Number(r.monthly_price),
  };
}

function mapRule(r: Record<string, unknown>): VehiclePricingRule {
  const vehicle = r.vehicle as Record<string, unknown> | undefined;
  return {
    id:                    r.id                       as string,
    pricingTableVersionId: r.pricing_table_version_id as string,
    vehicleId:             r.vehicle_id               as string,
    vehicleName: vehicle
      ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}`
      : (r.vehicle_name as string | undefined),
    contractDurationMonths: r.contract_duration_months as number,
    excessKmValue:          Number(r.excess_km_value),
    monitoringValue:        Number(r.monitoring_value),
    reserveCarValue:        Number(r.reserve_car_value),
    kmOptions: ((r.annual_km_options as Record<string, unknown>[]) ?? [])
                 .map(mapKmOption)
                 .sort((a, b) => a.annualKm - b.annualKm),
  };
}

function mapVersion(r: Record<string, unknown>): PricingTableVersion {
  return {
    id:              r.id               as string,
    pricingTableId:  r.pricing_table_id as string,
    versionNumber:   r.version_number   as number,
    label:           r.label            as string | undefined,
    notes:           r.notes            as string | undefined,
    isActive:        r.is_active        as boolean,
    activatedAt:     r.activated_at     as string | undefined,
    deactivatedAt:   r.deactivated_at   as string | undefined,
    createdAt:       r.created_at       as string,
    createdById:     r.created_by       as string,
    createdByName:   (r.admin_user as Record<string, unknown>)?.name as string | undefined,
    importJobId:     r.import_job_id    as string | undefined,
    rules: [],  // loaded separately when needed
  };
}

function mapTable(r: Record<string, unknown>): PricingTable {
  return {
    id:          r.id          as string,
    name:        r.name        as string,
    description: r.description as string | undefined,
    isActive:    r.is_active   as boolean,
    createdAt:   r.created_at  as string,
    updatedAt:   r.updated_at  as string,
    versions:    ((r.pricing_table_versions as Record<string, unknown>[]) ?? []).map(mapVersion),
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Returns the currently active pricing table with its versions (no rules). */
export async function getActivePricingTable(): Promise<PricingTable | null> {
  const { data, error } = await db
    .from('pricing_tables')
    .select(`
      *,
      pricing_table_versions(
        id, pricing_table_id, version_number, label, notes,
        is_active, activated_at, deactivated_at, created_at, created_by, import_job_id,
        admin_user:admin_users(name)
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const table = mapTable(data);
  table.versions.sort((a, b) => b.versionNumber - a.versionNumber);
  return table;
}

/** Returns the rules + km_options for a specific version. */
export async function getVersionRules(versionId: string): Promise<VehiclePricingRule[]> {
  const { data, error } = await db
    .from('vehicle_pricing_rules')
    .select(`
      *,
      vehicle:vehicles(id, brand, model, year),
      annual_km_options(*)
    `)
    .eq('pricing_table_version_id', versionId)
    .order('contract_duration_months', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRule);
}

/** Returns all pricing tables (for history/management). */
export async function listPricingTables(): Promise<PricingTable[]> {
  const { data, error } = await db
    .from('pricing_tables')
    .select('*, pricing_table_versions(id, version_number, is_active, label, created_at)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTable);
}

// ---------------------------------------------------------------------------
// Activate version (calls DB function for atomic swap)
// ---------------------------------------------------------------------------

export async function activateVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc('activate_pricing_version' as any, {
    p_version_id: versionId,
  });
  if (error) throw new Error(error.message);
}
