// =============================================================================
// DrivioGo — usePublicPricing
// Fetches pricing rules for a specific vehicle from the active pricing table
// version. Returns a structured array of periods + km options with real prices
// so SubscriptionSimulator and Checkout can display exact admin-managed values.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicKmOption {
  annualKm: number;
  monthlyKm: number;
  label: string;
  price: number;
}

export interface PublicPricingPeriod {
  months: number;
  label: string;
  kmOptions: PublicKmOption[];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchVehiclePricing(vehicleId: string): Promise<PublicPricingPeriod[]> {
  // 1. Get active pricing version
  const { data: activeVersion } = await db
    .from('pricing_table_versions')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!activeVersion?.id) return [];

  // 2. Get pricing rules for this vehicle in the active version
  const { data: rulesData, error } = await db
    .from('vehicle_pricing_rules')
    .select('contract_duration_months, annual_km_options(annual_km, monthly_price)')
    .eq('pricing_table_version_id', activeVersion.id)
    .eq('vehicle_id', vehicleId)
    .order('contract_duration_months', { ascending: true });

  if (error || !rulesData?.length) return [];

  return (rulesData as Record<string, unknown>[]).map((rule) => {
    const months = rule.contract_duration_months as number;
    const rawOptions = (rule.annual_km_options as Record<string, unknown>[]) ?? [];

    const kmOptions: PublicKmOption[] = rawOptions
      .sort((a, b) => (a.annual_km as number) - (b.annual_km as number))
      .map((km) => {
        const annualKm = km.annual_km as number;
        const monthlyKm = Math.round(annualKm / 12);
        return {
          annualKm,
          monthlyKm,
          label: `${monthlyKm.toLocaleString('pt-BR')} km/mês`,
          price: Number(km.monthly_price),
        };
      });

    return {
      months,
      label: `${months} meses`,
      kmOptions,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Pricing periods + km options for one vehicle from the active pricing table. */
export function useVehiclePricing(vehicleId: string | undefined) {
  return useQuery<PublicPricingPeriod[]>({
    queryKey: ['public', 'pricing', vehicleId],
    queryFn: () => fetchVehiclePricing(vehicleId!),
    enabled: !!vehicleId,
    staleTime: 120_000,
  });
}
