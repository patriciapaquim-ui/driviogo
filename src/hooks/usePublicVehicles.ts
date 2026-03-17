// =============================================================================
// DrivioGo — usePublicVehicles
// Fetches vehicles from the Supabase `vehicles` table (managed by admin) and
// maps them to the public Vehicle interface used by all site components.
// Falls back to the static catalog when Supabase returns no data.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Vehicle } from '@/data/vehicles';
import { vehicles as staticVehicles } from '@/data/vehicles';
import { CATEGORY_LABELS, TRANSMISSION_LABELS, FUEL_LABELS } from '@/types/admin';

const db = supabase as any;

// ---------------------------------------------------------------------------
// Mapper: admin DB row → public Vehicle interface
// ---------------------------------------------------------------------------

function mapAdminVehicle(r: Record<string, unknown>, basePrice = 0): Vehicle {
  const images = ((r.vehicle_images as Record<string, unknown>[]) ?? []).sort(
    (a, b) => (a.display_order as number) - (b.display_order as number),
  );

  const mainImage = images.find((img) => img.is_main) ?? images[0];
  const imageUrl = (mainImage?.url as string | undefined) ?? '';
  const imageUrls = images.map((img) => img.url as string);

  const category = r.category as string;
  const transmission = r.transmission as string;
  const fuel = r.fuel as string;

  return {
    id: r.id as string,
    brand: r.brand as string,
    model: r.model as string,
    year: r.year as number,
    bodyType: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category,
    image: imageUrl,
    images: imageUrls,
    basePrice,
    available: r.is_active as boolean,
    specs: {
      engine: '',
      power: '',
      transmission: TRANSMISSION_LABELS[transmission as keyof typeof TRANSMISSION_LABELS] ?? transmission,
      fuel: FUEL_LABELS[fuel as keyof typeof FUEL_LABELS] ?? fuel,
      consumption: '',
      trunk: '',
      seats: r.seats as number,
    },
    features: (r.features as string[]) ?? [],
    optionals: [],
    description: (r.description as string) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Fetch: all active vehicles + their minimum monthly price from active pricing
// ---------------------------------------------------------------------------

async function fetchActiveVehicles(): Promise<Vehicle[]> {
  const { data, error } = await db
    .from('vehicles')
    .select('*, vehicle_images(*)')
    .eq('is_active', true)
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error || !data?.length) return staticVehicles;

  // Get min monthly price per vehicle from the active pricing version
  const minPrices: Record<string, number> = {};

  const { data: activeVersion } = await db
    .from('pricing_table_versions')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (activeVersion?.id) {
    const { data: rulesData } = await db
      .from('vehicle_pricing_rules')
      .select('vehicle_id, annual_km_options(monthly_price)')
      .eq('pricing_table_version_id', activeVersion.id);

    (rulesData ?? []).forEach((rule: Record<string, unknown>) => {
      const vehicleId = rule.vehicle_id as string;
      const kmOptions = rule.annual_km_options as { monthly_price: string | number }[];
      kmOptions?.forEach((km) => {
        const price = Number(km.monthly_price);
        if (!minPrices[vehicleId] || price < minPrices[vehicleId]) {
          minPrices[vehicleId] = price;
        }
      });
    });
  }

  return (data as Record<string, unknown>[]).map((v) =>
    mapAdminVehicle(v, minPrices[v.id as string] ?? 0),
  );
}

// ---------------------------------------------------------------------------
// Fetch: single vehicle by ID (UUID from admin or legacy string from static)
// ---------------------------------------------------------------------------

async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await db
    .from('vehicles')
    .select('*, vehicle_images(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    // Fallback: static catalog (legacy numeric IDs like "1", "2"…)
    return staticVehicles.find((v) => v.id === id) ?? null;
  }

  // Get min price from active pricing for this vehicle
  let basePrice = 0;
  const { data: activeVersion } = await db
    .from('pricing_table_versions')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (activeVersion?.id) {
    const { data: rulesData } = await db
      .from('vehicle_pricing_rules')
      .select('annual_km_options(monthly_price)')
      .eq('pricing_table_version_id', activeVersion.id)
      .eq('vehicle_id', id);

    (rulesData ?? []).forEach((rule: Record<string, unknown>) => {
      const kmOptions = rule.annual_km_options as { monthly_price: string | number }[];
      kmOptions?.forEach((km) => {
        const price = Number(km.monthly_price);
        if (!basePrice || price < basePrice) basePrice = price;
      });
    });
  }

  return mapAdminVehicle(data as Record<string, unknown>, basePrice);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** All active vehicles — used by Catalog and FeaturedVehicles. */
export function usePublicVehicleList() {
  return useQuery<Vehicle[]>({
    queryKey: ['public', 'vehicles'],
    queryFn: fetchActiveVehicles,
    staleTime: 60_000,
  });
}

/** Single vehicle by ID — used by VehicleDetail and Checkout. */
export function usePublicVehicle(id: string | undefined) {
  return useQuery<Vehicle | null>({
    queryKey: ['public', 'vehicle', id],
    queryFn: () => fetchVehicleById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
