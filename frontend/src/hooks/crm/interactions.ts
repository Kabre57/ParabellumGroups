/**
 * Suivi des échanges et actions associés aux clients.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useInteractions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'interactions', params],
    queryFn: async () => normalizeListResponse(await crmService.getInteractions(params)),
  });
}

export function useInteraction(id: string) {
  return useQuery({
    queryKey: ['crm', 'interaction', id],
    queryFn: () => crmService.getInteraction(id),
    enabled: !!id,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createInteraction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateInteraction(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'interaction', variables.id] });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteInteraction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
    },
  });
}

export function useInteractionsStats() {
  return useQuery({
    queryKey: ['crm', 'interactions-stats'],
    queryFn: () => crmService.getInteractionsStats(),
  });
}

export function useLinkInteractionTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tacheId }: { id: string; tacheId: string }) => crmService.linkToTask(id, tacheId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'interaction', variables.id] });
    },
  });
}

// ==================== OPPORTUNITES ====================
