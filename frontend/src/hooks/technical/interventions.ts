/**
 * Chargement et actions sur les interventions techniques.
 */
import { technicalService } from '@/shared/api/technical';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Intervention } from '@/shared/api/technical';
import type { SearchParams } from '@/shared/api/types';

export function useInterventions(params?: SearchParams) {
  return useQuery<Intervention[]>({
    queryKey: ['interventions', params],
    queryFn: async () => {
      const response = await technicalService.getInterventions(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useIntervention(id: string) {
  return useQuery({
    queryKey: ['intervention', id],
    queryFn: () => technicalService.getIntervention(id),
    enabled: !!id,
  });
}

export function useCreateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createIntervention>[0]) =>
      technicalService.createIntervention(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intervention> }) =>
      technicalService.updateIntervention(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['intervention', variables.id] });
    },
  });
}

export function useCompleteIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resultats?: string; observations?: string; dureeReelle?: number } }) =>
      technicalService.completeIntervention(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['intervention', variables.id] });
    },
  });
}

export function useDeleteIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; force?: boolean }) =>
      typeof input === 'string'
        ? technicalService.deleteIntervention(input)
        : technicalService.deleteIntervention(input.id, { force: input.force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}

// === ORDRES DE MISSION ===
