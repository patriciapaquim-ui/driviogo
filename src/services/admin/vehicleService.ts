// =============================================================================
// DrivioGo — Vehicle Service
// All CRUD operations for the vehicles table via Supabase.
// Uses `as any` casts because the auto-generated types.ts predates the
// admin migration — update it after running supabase db push.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Vehicle, VehicleFormData, VehicleCategory } from '@/types/admin';

const db = supabase as any; // Remove when types.ts is regenerated

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
// Write
// ---------------------------------------------------------------------------

export async function createVehicle(form: VehicleFormData): Promise<Vehicle> {
  const { data, error } = await db
    .from('vehicles')
    .insert({
      brand:        form.brand,
      model:        form.model,
      year:         form.year,
      version:      form.version   || null,
      category:     form.category,
      transmission: form.transmission,
      fuel:         form.fuel,
      color:        form.color     || null,
      seats:        form.seats,
      doors:        form.doors,
      description:  form.description || null,
      features:     form.features,
      is_active:    form.isActive,
      is_featured:  form.isFeatured,
    })
    .select('*, vehicle_images(*)')
    .single();

  if (error) throw new Error(error.message);
  return mapVehicle(data);
}

export async function updateVehicle(id: string, form: Partial<VehicleFormData>): Promise<Vehicle> {
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

  const { data, error } = await db
    .from('vehicles')
    .update(patch)
    .eq('id', id)
    .select('*, vehicle_images(*)')
    .single();

  if (error) throw new Error(error.message);
  return mapVehicle(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await db.from('vehicles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleVehicleActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await db
    .from('vehicles')
    .update({ is_active: isActive })
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
