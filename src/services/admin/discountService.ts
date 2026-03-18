// =============================================================================
// DrivioGo — Discount Service
// CRUD for the discounts table. All changes are logged to discount_change_log.
// No records are ever hard-deleted — is_active=false deactivates them.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Discount, DiscountFormData } from '@/types/admin';

const db = supabase as any;

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapDiscount(r: Record<string, unknown>, vehicleIds: string[] = []): Discount {
  return {
    id:             r.id              as string,
    name:           r.name            as string,
    description:    r.description     as string | undefined,
    percentage:     Number(r.percentage),
    scope:          r.scope           as Discount['scope'],
    pricingTableId: (r.pricing_table_id as string | null) ?? null,
    vehicleIds,
    isHighlighted:  r.is_highlighted  as boolean,
    isActive:       r.is_active       as boolean,
    effectiveFrom:  r.effective_from  as string,
    effectiveUntil: (r.effective_until as string | null) ?? null,
    createdAt:      r.created_at      as string,
    updatedAt:      r.updated_at      as string,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listDiscounts(): Promise<Discount[]> {
  const { data, error } = await db
    .from('discounts')
    .select('*, discount_vehicles(vehicle_id)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => {
    const dv = (r.discount_vehicles as { vehicle_id: string }[]) ?? [];
    return mapDiscount(r, dv.map((x) => x.vehicle_id));
  });
}

export async function getDiscountById(id: string): Promise<Discount | null> {
  const { data, error } = await db
    .from('discounts')
    .select('*, discount_vehicles(vehicle_id)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  const dv = (data.discount_vehicles as { vehicle_id: string }[]) ?? [];
  return mapDiscount(data, dv.map((x) => x.vehicle_id));
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

async function logDiscountChange(
  discountId: string,
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'REACTIVATE',
  previousValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy?: string,
) {
  await db.from('discount_change_log').insert({
    discount_id:     discountId,
    action,
    previous_values: previousValues ?? null,
    new_values:      newValues ?? null,
    changed_by:      changedBy ?? null,
  });
}

async function syncVehicleIds(discountId: string, vehicleIds: string[]) {
  // Remove all existing, then re-insert
  await db.from('discount_vehicles').delete().eq('discount_id', discountId);
  if (vehicleIds.length > 0) {
    await db.from('discount_vehicles').insert(
      vehicleIds.map((vid) => ({ discount_id: discountId, vehicle_id: vid })),
    );
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createDiscount(
  form: DiscountFormData,
  effectiveFrom: Date | null,
  adminUserId?: string,
): Promise<Discount> {
  const effectiveAt = (effectiveFrom ?? new Date()).toISOString();

  const { data, error } = await db
    .from('discounts')
    .insert({
      name:             form.name,
      description:      form.description  || null,
      percentage:       form.percentage,
      scope:            form.scope,
      pricing_table_id: form.scope === 'TABLE' ? form.pricingTableId || null : null,
      is_highlighted:   form.isHighlighted,
      is_active:        form.isActive,
      effective_from:   effectiveAt,
      created_by:       adminUserId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (form.scope === 'VEHICLE' && form.vehicleIds.length > 0) {
    await syncVehicleIds(data.id, form.vehicleIds);
  }

  await logDiscountChange(data.id, 'CREATE', null, { ...form, effectiveFrom: effectiveAt }, adminUserId);

  return mapDiscount(data, form.scope === 'VEHICLE' ? form.vehicleIds : []);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateDiscount(
  id: string,
  form: Partial<DiscountFormData>,
  effectiveFrom: Date | null,
  adminUserId?: string,
): Promise<Discount> {
  const current = await getDiscountById(id);

  const patch: Record<string, unknown> = {};
  if (form.name            !== undefined) patch.name             = form.name;
  if (form.description     !== undefined) patch.description      = form.description  || null;
  if (form.percentage      !== undefined) patch.percentage       = form.percentage;
  if (form.scope           !== undefined) patch.scope            = form.scope;
  if (form.pricingTableId  !== undefined) patch.pricing_table_id = form.scope === 'TABLE' ? form.pricingTableId || null : null;
  if (form.isHighlighted   !== undefined) patch.is_highlighted   = form.isHighlighted;
  if (form.isActive        !== undefined) patch.is_active        = form.isActive;
  if (effectiveFrom) patch.effective_from = effectiveFrom.toISOString();

  const { data, error } = await db
    .from('discounts').update(patch).eq('id', id).select().single();

  if (error) throw new Error(error.message);

  if (form.scope === 'VEHICLE' && form.vehicleIds !== undefined) {
    await syncVehicleIds(id, form.vehicleIds);
  }

  await logDiscountChange(
    id, 'UPDATE',
    { name: current?.name, percentage: current?.percentage, scope: current?.scope, isHighlighted: current?.isHighlighted },
    { ...patch, vehicleIds: form.vehicleIds },
    adminUserId,
  );

  return mapDiscount(data, form.vehicleIds ?? current?.vehicleIds ?? []);
}

// ---------------------------------------------------------------------------
// Deactivate (never hard deletes)
// ---------------------------------------------------------------------------

export async function deactivateDiscount(
  id: string,
  effectiveUntil: Date | null,
  adminUserId?: string,
): Promise<void> {
  const until = (effectiveUntil ?? new Date()).toISOString();

  const { error } = await db
    .from('discounts')
    .update({ is_active: false, effective_until: until })
    .eq('id', id);

  if (error) throw new Error(error.message);
  await logDiscountChange(id, 'DEACTIVATE', null, { effective_until: until }, adminUserId);
}

// ---------------------------------------------------------------------------
// Toggle highlight (immediate — no vigência needed)
// ---------------------------------------------------------------------------

export async function toggleDiscountHighlight(id: string, isHighlighted: boolean): Promise<void> {
  const { error } = await db
    .from('discounts')
    .update({ is_highlighted: isHighlighted })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
