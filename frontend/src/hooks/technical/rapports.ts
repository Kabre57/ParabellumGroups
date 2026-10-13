/**
 * Gestion et validation des rapports techniques.
 */
import { technicalService } from '@/shared/api/technical';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Rapport } from '@/shared/api/technical';
import type { SearchParams } from '@/shared/api/types';

export function useRapports(params?: SearchParams) {
  return useQuery<Rapport[]>({
    queryKey: ['rapports', params],
    queryFn: async () => {
      const response = await technicalService.getRapports(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useRapport(id: string) {
  return useQuery<Rapport>({
    queryKey: ['rapport', id],
    queryFn: async () => {
      const response = await technicalService.getRapport(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createRapport>[0]) =>
      technicalService.createRapport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
    },
  });
}

export function useUpdateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Rapport> }) =>
      technicalService.updateRapport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      queryClient.invalidateQueries({ queryKey: ['rapport', variables.id] });
    },
  });
}

export function useValidateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.validateRapport(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      queryClient.invalidateQueries({ queryKey: ['rapport', id] });
    },
  });
}

export function useDeleteRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteRapport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
    },
  });
}

// === SPECIALITES ===
