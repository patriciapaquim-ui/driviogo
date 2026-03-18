// =============================================================================
// DrivioGo — useDashboard hook
// Combines vehicle stats, active pricing table, last import, and recent logs.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { getVehicleStats } from '@/services/admin/vehicleService';
import { getActivePricingTable } from '@/services/admin/pricingService';
import { getLastImportJob } from '@/services/admin/importHistoryService';
import { getRecentAuditLogs } from '@/services/admin/auditService';

export function useDashboard() {
  const vehicleStats = useQuery({
    queryKey: ['admin', 'vehicleStats'],
    queryFn:  getVehicleStats,
    staleTime: 60_000,
  });

  const pricingTable = useQuery({
    queryKey: ['admin', 'activePricingTable'],
    queryFn:  getActivePricingTable,
    staleTime: 60_000,
  });

  const lastImport = useQuery({
    queryKey: ['admin', 'lastImportJob'],
    queryFn:  getLastImportJob,
    staleTime: 60_000,
  });

  const recentLogs = useQuery({
    queryKey: ['admin', 'recentAuditLogs', 5],
    queryFn:  () => getRecentAuditLogs(5),
    staleTime: 60_000,
  });

  const activeVersion = pricingTable.data?.versions.find((v) => v.isActive);

  return {
    activeVehicles:      vehicleStats.data?.active      ?? 0,
    inactiveVehicles:    vehicleStats.data?.inactive    ?? 0,
    totalVehicles:       vehicleStats.data?.total       ?? 0,
    activePricingTable:  pricingTable.data?.name        ?? null,
    activePricingVersion: activeVersion?.versionNumber  ?? null,
    lastImport:          lastImport.data                ?? null,
    recentAuditLogs:     recentLogs.data                ?? [],
    loading:
      vehicleStats.isLoading ||
      pricingTable.isLoading ||
      lastImport.isLoading   ||
      recentLogs.isLoading,
  };
}
