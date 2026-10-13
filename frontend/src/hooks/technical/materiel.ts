/**
 * Gestion des mat?riels, alertes et sorties en cours.
 */
import { technicalService } from '@/shared/api/technical';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Materiel } from '@/shared/api/technical';
import type { SearchParams } from '@/shared/api/types';

export function useMateriel(params?: SearchParams) {
  return useQuery<Materiel[]>({
    queryKey: ['materiel', params],
    queryFn: async () => {
      const response = await technicalService.getMateriels(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useMaterielById(id: string) {
  return useQuery<Materiel>({
    queryKey: ['materiel-item', id],
    queryFn: async () => {
      const response = await technicalService.getMateriel(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMaterielAlertes() {
  return useQuery({
    queryKey: ['materiel-alertes'],
    queryFn: async () => {
      const response = await technicalService.getAlertes();
      return response.data ?? [];
    },
  });
}

export function useSortiesEnCours() {
  return useQuery({
    queryKey: ['sorties-en-cours'],
    queryFn: async () => {
      const response = await technicalService.getSortiesEnCours();
      return response.data ?? [];
    },
  });
}

export function useCreateMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createMateriel>[0]) =>
      technicalService.createMateriel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

export function useUpdateMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Materiel> }) =>
      technicalService.updateMateriel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-item', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

export function useDeleteMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; force?: boolean }) =>
      typeof input === 'string'
        ? technicalService.deleteMateriel(input)
        : technicalService.deleteMateriel(input.id, { force: input.force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

// === RAPPORTS ===
