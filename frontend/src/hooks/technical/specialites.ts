/**
 * Gestion des sp?cialit?s des techniciens.
 */
import { technicalService } from '@/shared/api/technical';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Specialite } from '@/shared/api/technical';

export function useSpecialites() {
  return useQuery<Specialite[]>({
    queryKey: ['specialites'],
    queryFn: async () => {
      const response = await technicalService.getSpecialites();
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useSpecialite(id: string) {
  return useQuery<Specialite>({
    queryKey: ['specialite', id],
    queryFn: async () => {
      const response = await technicalService.getSpecialite(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createSpecialite>[0]) =>
      technicalService.createSpecialite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
    },
  });
}

export function useUpdateSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Specialite> }) =>
      technicalService.updateSpecialite(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
      queryClient.invalidateQueries({ queryKey: ['specialite', variables.id] });
    },
  });
}

export function useDeleteSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; force?: boolean }) =>
      typeof input === 'string'
        ? technicalService.deleteSpecialite(input)
        : technicalService.deleteSpecialite(input.id, { force: input.force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
    },
  });
}
