// =============================================================================
// DrivioGo — useImportJobs hook (React Query)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import * as importHistoryService from '@/services/admin/importHistoryService';
import type { ImportFilters } from '@/services/admin/importHistoryService';

export type { ImportFilters };

export function useImportJobs(filters: ImportFilters = {}) {
  const query = useQuery({
    queryKey: ['admin', 'importJobs', filters],
    queryFn:  () => importHistoryService.listImportJobs(filters),
    staleTime: 30_000,
  });

  return {
    jobs:       query.data?.jobs       ?? [],
    total:      query.data?.total      ?? 0,
    page:       query.data?.page       ?? 1,
    totalPages: query.data?.totalPages ?? 1,
    loading:    query.isLoading,
    error:      query.error,
  };
}

export function useImportJobRows(jobId: string | null) {
  return useQuery({
    queryKey: ['admin', 'importJobRows', jobId],
    queryFn:  () => importHistoryService.getImportJobRows(jobId!),
    enabled:  !!jobId,
    staleTime: 300_000,
  });
}

export function useLastImportJob() {
  return useQuery({
    queryKey: ['admin', 'lastImportJob'],
    queryFn:  importHistoryService.getLastImportJob,
    staleTime: 60_000,
  });
}
