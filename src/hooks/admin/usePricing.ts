import { useState } from 'react';
import { MOCK_PRICING_TABLE } from '@/lib/admin/mockData';
import type { PricingTable } from '@/types/admin';

export function usePricing() {
  const [pricingTable] = useState<PricingTable>(MOCK_PRICING_TABLE);
  const [loading] = useState(false);

  const activeVersion = pricingTable.versions.find((v) => v.isActive);

  return { pricingTable, activeVersion, loading };
}
