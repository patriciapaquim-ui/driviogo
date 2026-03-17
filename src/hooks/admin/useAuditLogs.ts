// =============================================================================
// DrivioGo — useAuditLogs hook (React Query)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import * as auditService from '@/services/admin/auditService';
import type { AuditFilters } from '@/services/admin/auditService';

export type { AuditFilters };

export function useAuditLogs(filters: AuditFilters = {}) {
  const query = useQuery({
    queryKey: ['admin', 'auditLogs', filters],
    queryFn:  () => auditService.listAuditLogs(filters),
    staleTime: 30_000,
  });

  return {
    logs:       query.data?.logs       ?? [],
    total:      query.data?.total      ?? 0,
    page:       query.data?.page       ?? 1,
    totalPages: query.data?.totalPages ?? 1,
    loading:    query.isLoading,
    error:      query.error,
  };
}

export function useRecentAuditLogs(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'recentAuditLogs', limit],
    queryFn:  () => auditService.getRecentAuditLogs(limit),
    staleTime: 60_000,
  });
}
