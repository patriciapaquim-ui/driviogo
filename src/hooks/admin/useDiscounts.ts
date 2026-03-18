// =============================================================================
// DrivioGo — useDiscounts hook (React Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as discountService from '@/services/admin/discountService';
import type { DiscountFormData } from '@/types/admin';

export function useDiscounts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn:  discountService.listDiscounts,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'discounts'] });
    qc.invalidateQueries({ queryKey: ['public', 'discounts'] });
  };

  const createMutation = useMutation({
    mutationFn: ({
      form, effectiveFrom, adminUserId,
    }: { form: DiscountFormData; effectiveFrom: Date | null; adminUserId?: string }) =>
      discountService.createDiscount(form, effectiveFrom, adminUserId),
    onSuccess: () => { invalidate(); toast.success('Desconto criado com sucesso!'); },
    onError: (e: Error) => toast.error(`Erro ao criar desconto: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id, form, effectiveFrom, adminUserId,
    }: { id: string; form: Partial<DiscountFormData>; effectiveFrom: Date | null; adminUserId?: string }) =>
      discountService.updateDiscount(id, form, effectiveFrom, adminUserId),
    onSuccess: () => { invalidate(); toast.success('Desconto atualizado!'); },
    onError: (e: Error) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({
      id, effectiveUntil, adminUserId,
    }: { id: string; effectiveUntil: Date | null; adminUserId?: string }) =>
      discountService.deactivateDiscount(id, effectiveUntil, adminUserId),
    onSuccess: () => { invalidate(); toast.success('Desconto desativado.'); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const highlightMutation = useMutation({
    mutationFn: ({ id, isHighlighted }: { id: string; isHighlighted: boolean }) =>
      discountService.toggleDiscountHighlight(id, isHighlighted),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  return {
    discounts:  query.data ?? [],
    loading:    query.isLoading,
    error:      query.error,

    createDiscount:    (form: DiscountFormData, effectiveFrom: Date | null, adminUserId?: string) =>
      createMutation.mutateAsync({ form, effectiveFrom, adminUserId }),
    updateDiscount:    (id: string, form: Partial<DiscountFormData>, effectiveFrom: Date | null, adminUserId?: string) =>
      updateMutation.mutateAsync({ id, form, effectiveFrom, adminUserId }),
    deactivateDiscount:(id: string, effectiveUntil: Date | null, adminUserId?: string) =>
      deactivateMutation.mutateAsync({ id, effectiveUntil, adminUserId }),
    toggleHighlight:   (id: string, isHighlighted: boolean) =>
      highlightMutation.mutateAsync({ id, isHighlighted }),

    isCreating:    createMutation.isPending,
    isUpdating:    updateMutation.isPending,
    isDeactivating:deactivateMutation.isPending,
  };
}
