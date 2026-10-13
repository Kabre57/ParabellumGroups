/**
 * Gestion des relances commerciales et de leur état.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useRelances(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'relances', params],
    queryFn: async () => normalizeListResponse(await crmService.getRelances(params)),
  });
}

export function useRelance(id: string) {
  return useQuery({
    queryKey: ['crm', 'relance', id],
    queryFn: () => crmService.getRelance(id),
    enabled: !!id,
  });
}

export function useCreateRelance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createRelance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relances'] });
    },
  });
}

export function useUpdateRelance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateRelance(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relances'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relance', variables.id] });
    },
  });
}

export function useDeleteRelance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteRelance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relances'] });
    },
  });
}

export function useToggleRelance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.toggleRelance(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relances'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relance', id] });
    },
  });
}

// ==================== SEGMENTS ====================
