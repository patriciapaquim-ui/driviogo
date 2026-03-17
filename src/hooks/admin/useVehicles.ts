// =============================================================================
// DrivioGo — useVehicles hook (React Query)
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

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['admin', 'vehicles'] });

  const createMutation = useMutation({
    mutationFn: vehicleService.createVehicle,
    onSuccess: () => {
      invalidate();
      toast.success('Veículo cadastrado com sucesso!');
    },
    onError: (e: Error) => toast.error(`Erro ao cadastrar: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormData> }) =>
      vehicleService.updateVehicle(id, data),
    onSuccess: () => {
      invalidate();
      toast.success('Veículo atualizado com sucesso!');
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleService.deleteVehicle,
    onSuccess: () => {
      invalidate();
      toast.success('Veículo excluído com sucesso!');
    },
    onError: (e: Error) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      vehicleService.toggleVehicleActive(id, isActive),
    onSuccess: (_data, { isActive }) => {
      invalidate();
      toast.success(isActive ? 'Veículo ativado!' : 'Veículo desativado!');
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

    createVehicle: (data: VehicleFormData) => createMutation.mutateAsync(data),
    updateVehicle: (id: string, data: Partial<VehicleFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteVehicle: (id: string) => deleteMutation.mutateAsync(id),
    toggleActive:  (id: string, isActive: boolean) =>
      toggleMutation.mutateAsync({ id, isActive }),

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
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
