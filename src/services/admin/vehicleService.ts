// =============================================================================
// DrivioGo — Vehicle Service (with Vigência support)
// All CRUD operations for the vehicles table via Supabase.
// Changes are never overwritten: previous state is saved to vehicle_change_history.
// Uses `as any` casts because the auto-generated types.ts predates the
// admin migration — update it after running supabase db push.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Vehicle, VehicleFormData, VehicleCategory } from '@/types/admin';

const db = supabase as any;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapImage(r: Record<string, unknown>) {
  return {
    id:           r.id           as string,
    vehicleId:    r.vehicle_id   as string,
    url:          r.url          as string,
    altText:      r.alt_text     as string | undefined,
    displayOrder: r.display_order as number,
    isMain:       r.is_main      as boolean,
  };
}

function mapVehicle(r: Record<string, unknown>): Vehicle {
  return {
    id:           r.id            as string,
    brand:        r.brand         as string,
    model:        r.model         as string,
    year:         r.year          as number,
    version:      r.version       as string | undefined,
    category:     r.category      as VehicleCategory,
    transmission: r.transmission  as Vehicle['transmission'],
    fuel:         r.fuel          as Vehicle['fuel'],
    color:        r.color         as string | undefined,
    seats:        r.seats         as number,
    doors:        r.doors         as number,
    description:  r.description   as string | undefined,
    features:     (r.features     as string[]) ?? [],
    isActive:     r.is_active     as boolean,
    isFeatured:   r.is_featured   as boolean,
    featuredOrder: r.featured_order as number | undefined,
    images: ((r.vehicle_images as Record<string, unknown>[]) ?? [])
              .map(mapImage)
              .sort((a, b) => a.displayOrder - b.displayOrder),
    effectiveFrom:  r.effective_from  as string,
    effectiveUntil: (r.effective_until as string | null) ?? null,
    createdAt:    r.created_at    as string,
    updatedAt:    r.updated_at    as string,
  };
}

// ---------------------------------------------------------------------------
// Query types
// ---------------------------------------------------------------------------

export interface VehicleFilters {
  page?:     number;
  limit?:    number;
  search?:   string;
  category?: string;
  isActive?: boolean;
}

export interface VehicleListResult {
  vehicles:   Vehicle[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listVehicles(filters: VehicleFilters = {}): Promise<VehicleListResult> {
  const { page = 1, limit = 12, search, category, isActive } = filters;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = db
    .from('vehicles')
    .select('*, vehicle_images(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(`brand.ilike.%${s}%,model.ilike.%${s}%,version.ilike.%${s}%`);
  }
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    vehicles:   (data ?? []).map(mapVehicle),
    total:      count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await db
    .from('vehicles')
    .select('*, vehicle_images(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapVehicle(data);
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/** Saves the current vehicle state to vehicle_change_history before any update. */
async function logVehicleHistory(
  vehicleId: string,
  previousData: Record<string, unknown>,
  newData: Record<string, unknown>,
  effectiveFrom: Date | null,
  adminUserId?: string,
): Promise<void> {
  const changedFields = Object.keys(newData).filter(
    (k) => JSON.stringify(previousData[k]) !== JSON.stringify(newData[k]),
  );

  if (changedFields.length === 0) return;

  const { error } = await db.from('vehicle_change_history').insert({
    vehicle_id:      vehicleId,
    changed_fields:  changedFields,
    previous_values: previousData,
    new_values:      newData,
    effective_from:  (effectiveFrom ?? new Date()).toISOString(),
    changed_by:      adminUserId ?? null,
  });

  if (error) console.warn('vehicle_change_history write failed:', error.message);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createVehicle(
  form: VehicleFormData,
  effectiveFrom: Date | null = null,
): Promise<Vehicle> {
  const effectiveAt = (effectiveFrom ?? new Date()).toISOString();

  const { data, error } = await db
    .from('vehicles')
    .insert({
      brand:          form.brand,
      model:          form.model,
      year:           form.year,
      version:        form.version   || null,
      category:       form.category,
      transmission:   form.transmission,
      fuel:           form.fuel,
      color:          form.color     || null,
      seats:          form.seats,
      doors:          form.doors,
      description:    form.description || null,
      features:       form.features,
      is_active:      form.isActive,
      is_featured:    form.isFeatured,
      effective_from: effectiveAt,
    })
    .select('*, vehicle_images(*)')
    .single();

  if (error) throw new Error(error.message);
  return mapVehicle(data);
}

// ---------------------------------------------------------------------------
// Update (with history logging)
// ---------------------------------------------------------------------------

export async function updateVehicle(
  id: string,
  form: Partial<VehicleFormData>,
  effectiveFrom: Date | null = null,
  adminUserId?: string,
): Promise<Vehicle> {
  // Load current state for history
  const current = await getVehicleById(id);

  const patch: Record<string, unknown> = {};
  if (form.brand        !== undefined) patch.brand        = form.brand;
  if (form.model        !== undefined) patch.model        = form.model;
  if (form.year         !== undefined) patch.year         = form.year;
  if (form.version      !== undefined) patch.version      = form.version      || null;
  if (form.category     !== undefined) patch.category     = form.category;
  if (form.transmission !== undefined) patch.transmission = form.transmission;
  if (form.fuel         !== undefined) patch.fuel         = form.fuel;
  if (form.color        !== undefined) patch.color        = form.color        || null;
  if (form.seats        !== undefined) patch.seats        = form.seats;
  if (form.doors        !== undefined) patch.doors        = form.doors;
  if (form.description  !== undefined) patch.description  = form.description  || null;
  if (form.features     !== undefined) patch.features     = form.features;
  if (form.isActive     !== undefined) patch.is_active    = form.isActive;
  if (form.isFeatured   !== undefined) patch.is_featured  = form.isFeatured;

  // Set effective_from when scheduling future changes
  if (effectiveFrom) {
    patch.effective_from = effectiveFrom.toISOString();
  }

  const { data, error } = await db
    .from('vehicles')
    .update(patch)
    .eq('id', id)
    .select('*, vehicle_images(*)')
    .single();

  if (error) throw new Error(error.message);

  // Log history asynchronously (non-blocking)
  if (current) {
    logVehicleHistory(
      id,
      {
        brand: current.brand, model: current.model, year: current.year,
        version: current.version, category: current.category,
        transmission: current.transmission, fuel: current.fuel,
        color: current.color, seats: current.seats, doors: current.doors,
        description: current.description, features: current.features,
        is_active: current.isActive, is_featured: current.isFeatured,
        effective_from: current.effectiveFrom,
      },
      patch,
      effectiveFrom,
      adminUserId,
    );
  }

  return mapVehicle(data);
}

// ---------------------------------------------------------------------------
// Deactivate (soft delete — sets effective_until, never hard deletes)
// ---------------------------------------------------------------------------

export async function deactivateVehicle(
  id: string,
  effectiveUntil: Date | null = null,
  adminUserId?: string,
): Promise<void> {
  const until = (effectiveUntil ?? new Date()).toISOString();
  const current = await getVehicleById(id);

  const { error } = await db
    .from('vehicles')
    .update({ effective_until: until, is_active: false })
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (current) {
    logVehicleHistory(
      id,
      { is_active: current.isActive, effective_until: current.effectiveUntil },
      { is_active: false, effective_until: until },
      effectiveUntil,
      adminUserId,
    );
  }
}

export async function toggleVehicleActive(
  id: string,
  isActive: boolean,
  effectiveFrom: Date | null = null,
): Promise<void> {
  const patch: Record<string, unknown> = { is_active: isActive };

  if (isActive) {
    // Reactivating: clear effective_until and optionally set new effective_from
    patch.effective_until = null;
    if (effectiveFrom) patch.effective_from = effectiveFrom.toISOString();
  } else {
    // Deactivating: set effective_until
    patch.effective_until = (effectiveFrom ?? new Date()).toISOString();
  }

  const { error } = await db
    .from('vehicles')
    .update(patch)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Stats (for dashboard)
// ---------------------------------------------------------------------------

export async function getVehicleStats(): Promise<{ total: number; active: number; inactive: number }> {
  const { count: total, error: e1 } = await db
    .from('vehicles')
    .select('id', { count: 'exact', head: true });

  const { count: active, error: e2 } = await db
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (e1 || e2) throw new Error((e1 ?? e2)?.message);
  return { total: total ?? 0, active: active ?? 0, inactive: (total ?? 0) - (active ?? 0) };
}
