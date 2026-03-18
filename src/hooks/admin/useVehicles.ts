// =============================================================================
// DrivioGo — useVehicles hook (React Query + Vigência)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as vehicleService from '@/services/admin/vehicleService';
import type { VehicleFilters } from '@/services/admin/vehicleService';
import type { VehicleFormData } from '@/types/admin';

export type { VehicleFilters };

export function useVehicles(filters: VehicleFilters = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'vehicles', filters],
    queryFn:  () => vehicleService.listVehicles(filters),
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    qc.invalidateQueries({ queryKey: ['public', 'vehicles'] });
  };

  const createMutation = useMutation({
    mutationFn: ({ data, effectiveFrom }: { data: VehicleFormData; effectiveFrom: Date | null }) =>
      vehicleService.createVehicle(data, effectiveFrom),
    onSuccess: (_v, { effectiveFrom }) => {
      invalidate();
      toast.success(
        effectiveFrom && effectiveFrom > new Date()
          ? `Veículo agendado para ${effectiveFrom.toLocaleDateString('pt-BR')}.`
          : 'Veículo cadastrado com sucesso!',
      );
    },
    onError: (e: Error) => toast.error(`Erro ao cadastrar: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id, data, effectiveFrom, adminUserId,
    }: { id: string; data: Partial<VehicleFormData>; effectiveFrom: Date | null; adminUserId?: string }) =>
      vehicleService.updateVehicle(id, data, effectiveFrom, adminUserId),
    onSuccess: (_v, { effectiveFrom }) => {
      invalidate();
      toast.success(
        effectiveFrom && effectiveFrom > new Date()
          ? `Alteração agendada para ${effectiveFrom.toLocaleDateString('pt-BR')}.`
          : 'Veículo atualizado com sucesso!',
      );
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, effectiveUntil, adminUserId }: { id: string; effectiveUntil: Date | null; adminUserId?: string }) =>
      vehicleService.deactivateVehicle(id, effectiveUntil, adminUserId),
    onSuccess: (_v, { effectiveUntil }) => {
      invalidate();
      toast.success(
        effectiveUntil && effectiveUntil > new Date()
          ? `Desativação agendada para ${effectiveUntil.toLocaleDateString('pt-BR')}.`
          : 'Veículo desativado.',
      );
    },
    onError: (e: Error) => toast.error(`Erro ao desativar: ${e.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive, effectiveFrom }: { id: string; isActive: boolean; effectiveFrom: Date | null }) =>
      vehicleService.toggleVehicleActive(id, isActive, effectiveFrom),
    onSuccess: (_data, { isActive, effectiveFrom }) => {
      invalidate();
      const scheduled = effectiveFrom && effectiveFrom > new Date();
      if (scheduled) {
        toast.success(`Alteração agendada para ${effectiveFrom!.toLocaleDateString('pt-BR')}.`);
      } else {
        toast.success(isActive ? 'Veículo ativado!' : 'Veículo desativado!');
      }
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  return {
    vehicles:   query.data?.vehicles ?? [],
    total:      query.data?.total      ?? 0,
    page:       query.data?.page       ?? 1,
    totalPages: query.data?.totalPages ?? 1,
    loading:    query.isLoading,
    error:      query.error,

    createVehicle: (data: VehicleFormData, effectiveFrom: Date | null) =>
      createMutation.mutateAsync({ data, effectiveFrom }),
    updateVehicle: (id: string, data: Partial<VehicleFormData>, effectiveFrom: Date | null, adminUserId?: string) =>
      updateMutation.mutateAsync({ id, data, effectiveFrom, adminUserId }),
    deactivateVehicle: (id: string, effectiveUntil: Date | null, adminUserId?: string) =>
      deactivateMutation.mutateAsync({ id, effectiveUntil, adminUserId }),
    toggleActive: (id: string, isActive: boolean, effectiveFrom: Date | null) =>
      toggleMutation.mutateAsync({ id, isActive, effectiveFrom }),

    isCreating:     createMutation.isPending,
    isUpdating:     updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}

/** Fetch a single vehicle by id (used in edit form). */
export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'vehicle', id],
    queryFn:  () => vehicleService.getVehicleById(id!),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useVehicleStats() {
  return useQuery({
    queryKey: ['admin', 'vehicleStats'],
    queryFn:  vehicleService.getVehicleStats,
    staleTime: 60_000,
  });
}
