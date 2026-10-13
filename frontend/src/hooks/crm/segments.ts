/**
 * Gestion des segments utilisés pour la prospection CRM.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useSegments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'segments', params],
    queryFn: async () => normalizeListResponse(await crmService.getSegments(params)),
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: ['crm', 'segment', id],
    queryFn: () => crmService.getSegment(id),
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createSegment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'segments'] });
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateSegment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'segments'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'segment', variables.id] });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'segments'] });
    },
  });
}

export function useRefreshSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.refreshSegment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'segments'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'segment', id] });
    },
  });
}
