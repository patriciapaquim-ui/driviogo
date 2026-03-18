// =============================================================================
// DrivioGo — usePricing hook (React Query + Vigência)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as pricingService from '@/services/admin/pricingService';
import type { PriceOverride } from '@/services/admin/pricingService';

export type { PriceOverride };

export function usePricing() {
  const query = useQuery({
    queryKey: ['admin', 'activePricingTable'],
    queryFn:  pricingService.getActivePricingTable,
    staleTime: 60_000,
  });

  const pricingTable  = query.data ?? null;
  const now           = new Date();
  // "Active" version = is_active=TRUE AND (effective_from is null or in the past)
  const activeVersion = pricingTable?.versions.find(
    (v) => v.isActive && !v.isScheduled,
  ) ?? null;
  // "Scheduled" versions = is_active=TRUE but effective_from is in the future
  const scheduledVersions = pricingTable?.versions.filter((v) => v.isScheduled) ?? [];

  return {
    pricingTable,
    activeVersion,
    scheduledVersions,
    loading: query.isLoading,
    error:   query.error,
    now,
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
    mutationFn: ({ versionId, effectiveFrom }: { versionId: string; effectiveFrom: Date | null }) =>
      pricingService.activateVersion(versionId, effectiveFrom),
    onSuccess: (_data, { effectiveFrom }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'activePricingTable'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pricingTables'] });
      qc.invalidateQueries({ queryKey: ['public', 'pricing'] });
      const scheduled = effectiveFrom && effectiveFrom > new Date();
      toast.success(
        scheduled
          ? `Versão agendada para ${effectiveFrom!.toLocaleDateString('pt-BR')} — entrará em vigor automaticamente.`
          : 'Versão ativada com sucesso! Os preços do site foram atualizados.',
      );
    },
    onError: (e: Error) => toast.error(`Erro ao ativar versão: ${e.message}`),
  });
}

export function useCloneVersionWithOverrides() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof pricingService.cloneVersionWithOverrides>[0]) =>
      pricingService.cloneVersionWithOverrides(params),
    onSuccess: (_id, { effectiveFrom }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'activePricingTable'] });
      qc.invalidateQueries({ queryKey: ['admin', 'versionRules'] });
      qc.invalidateQueries({ queryKey: ['public', 'pricing'] });
      const scheduled = effectiveFrom && effectiveFrom > new Date();
      toast.success(
        scheduled
          ? `Nova tabela de preços agendada para ${effectiveFrom!.toLocaleDateString('pt-BR')}.`
          : 'Preços atualizados com sucesso!',
      );
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar preços: ${e.message}`),
  });
}
