/**
 * Consultation, suivi et mise à jour des contrats clients.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useContrats(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'contrats', params],
    queryFn: async () => normalizeListResponse(await crmService.getContrats(params)),
  });
}

export function useContrat(id: string) {
  return useQuery({
    queryKey: ['crm', 'contrat', id],
    queryFn: () => crmService.getContrat(id),
    enabled: !!id,
  });
}

export function useCreateContrat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createContrat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
    },
  });
}

export function useContratsStats(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'contrats-stats', params],
    queryFn: () => crmService.getContratsStats(params),
  });
}

export function useContratsExpiring(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'contrats-expiring', params],
    queryFn: () => crmService.getContratsExpiring(params),
  });
}

export function useUpdateContratStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => crmService.updateContratStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contrat', variables.id] });
    },
  });
}

export function useContratAvenants(id: string) {
  return useQuery({
    queryKey: ['crm', 'contrat-avenants', id],
    queryFn: async () => {
      const response = await crmService.getContrat(id);
      return (response as any)?.data?.avenants ?? [];
    },
    enabled: !!id,
  });
}

// ==================== INTERACTIONS ====================
