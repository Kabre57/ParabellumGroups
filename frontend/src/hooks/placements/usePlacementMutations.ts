import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import billingService from '@/shared/api/billing';
import type { CreatePlacementPayload, AddCoursePayload } from '@/types/placements';

export function useCreatePlacement(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlacementPayload) => billingService.createPlacement(data),
    onSuccess: () => {
      toast.success('Placement créé avec succès.');
      queryClient.invalidateQueries({ queryKey: ['billing-placements'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du placement.');
    },
  });
}

export function useAddAssetCourse(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value, atDate }: AddCoursePayload) =>
      billingService.addAssetCourse(id, { value, atDate }),
    onSuccess: () => {
      toast.success('Cours mis à jour avec succès.');
      queryClient.invalidateQueries({ queryKey: ['billing-placements'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour du cours.');
    },
  });
}
