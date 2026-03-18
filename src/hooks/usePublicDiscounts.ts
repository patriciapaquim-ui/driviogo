// =============================================================================
// DrivioGo — usePublicDiscounts
// Fetches active, in-effect discounts from Supabase for the public site.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicDiscount {
  id:            string;
  name:          string;
  description?:  string;
  percentage:    number;
  scope:         'ALL' | 'TABLE' | 'VEHICLE';
  pricingTableId?: string | null;
  vehicleIds:    string[];
  isHighlighted: boolean;
}

async function fetchActiveDiscounts(): Promise<PublicDiscount[]> {
  const db = supabase as any;
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('discounts')
    .select('*, discount_vehicles(vehicle_id)')
    .eq('is_active', true)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => {
    const dv = (r.discount_vehicles as { vehicle_id: string }[]) ?? [];
    return {
      id:            r.id            as string,
      name:          r.name          as string,
      description:   r.description   as string | undefined,
      percentage:    Number(r.percentage),
      scope:         r.scope         as PublicDiscount['scope'],
      pricingTableId: (r.pricing_table_id as string | null) ?? null,
      vehicleIds:    dv.map((x) => x.vehicle_id),
      isHighlighted: r.is_highlighted as boolean,
    };
  });
}

export function usePublicDiscounts() {
  return useQuery<PublicDiscount[]>({
    queryKey: ['public', 'discounts'],
    queryFn:  fetchActiveDiscounts,
    staleTime: 60_000,
  });
}

/**
 * Returns the best (highest %) discount applicable to a specific vehicle,
 * optionally filtered to a pricing table scope.
 */
export function useBestVehicleDiscount(
  vehicleId: string | undefined,
  pricingTableId?: string | null,
) {
  const { data: discounts = [] } = usePublicDiscounts();

  if (!vehicleId) return null;

  const applicable = discounts.filter((d) => {
    if (d.scope === 'ALL') return true;
    if (d.scope === 'TABLE' && d.pricingTableId === pricingTableId) return true;
    if (d.scope === 'VEHICLE' && d.vehicleIds.includes(vehicleId)) return true;
    return false;
  });

  if (!applicable.length) return null;

  // Return the highest percentage discount
  return applicable.reduce((best, d) => (d.percentage > best.percentage ? d : best));
}
