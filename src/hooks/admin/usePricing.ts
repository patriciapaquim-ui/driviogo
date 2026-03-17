// =============================================================================
// DrivioGo — usePricing hook (React Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as pricingService from '@/services/admin/pricingService';

export function usePricing() {
  const query = useQuery({
    queryKey: ['admin', 'activePricingTable'],
    queryFn:  pricingService.getActivePricingTable,
    staleTime: 60_000,
  });

  const pricingTable = query.data ?? null;
  const activeVersion = pricingTable?.versions.find((v) => v.isActive) ?? null;

  return {
    pricingTable,
    activeVersion,
    loading: query.isLoading,
    error:   query.error,
  };
}

export function usePricingTables() {
  return useQuery({
    queryKey: ['admin', 'pricingTables'],
    queryFn:  pricingService.listPricingTables,
    staleTime: 60_000,
  });
}

export function useVersionRules(versionId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'versionRules', versionId],
    queryFn:  () => pricingService.getVersionRules(versionId!),
    enabled:  !!versionId,
    staleTime: 120_000,
  });
}

export function useActivateVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: pricingService.activateVersion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'activePricingTable'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pricingTables'] });
      toast.success('Versão ativada com sucesso! Os preços do site foram atualizados.');
    },
    onError: (e: Error) => toast.error(`Erro ao ativar versão: ${e.message}`),
  });
}
