/**
 * Gestion du pipeline commercial et des opportunités.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useOpportunites(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'opportunites', params],
    queryFn: async () => normalizeListResponse(await crmService.getOpportunites(params)),
  });
}

export function useOpportunite(id: string) {
  return useQuery({
    queryKey: ['crm', 'opportunite', id],
    queryFn: () => crmService.getOpportunite(id),
    enabled: !!id,
  });
}

export function useCreateOpportunite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createOpportunite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
    },
  });
}

export function useUpdateOpportunite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateOpportunite(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunite', variables.id] });
    },
  });
}

export function useDeleteOpportunite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteOpportunite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
    },
  });
}

export function useOpportunitesPipeline(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'opportunites-pipeline', params],
    queryFn: () => crmService.getPipelineStats(),
  });
}

export function useUpdateOpportuniteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateStage(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunite', variables.id] });
    },
  });
}

export function useCloseOpportunite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.closeOpportunite(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunite', variables.id] });
    },
  });
}

export function useAddOpportuniteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.addProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunite', variables.id] });
    },
  });
}

// ==================== DOCUMENTS ====================
