/**
 * Gestion et mise à jour des fiches clients.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useClients(params?: Record<string, any>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['crm', 'clients', params],
    queryFn: async () => normalizeListResponse(await crmService.getClients(params)),
    enabled: options?.enabled ?? true,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['crm', 'client', id],
    queryFn: () => crmService.getClient(id),
    enabled: !!id,
  });
}

export function useSearchClients(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'clients-search', params],
    queryFn: () => crmService.searchClients(params),
    enabled: !!params,
  });
}

export function useClientsStats(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'clients-stats', params],
    queryFn: () => crmService.getClientsStats(params),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'client', variables.id] });
    },
  });
}

export function useUpdateClientStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, raison }: { id: string; status: any; raison?: string }) =>
      crmService.updateClientStatus(id, status, raison),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'client', variables.id] });
    },
  });
}

export function useUpdateClientPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, priorite, raison }: { id: string; priorite: any; raison?: string }) =>
      crmService.updateClientPriority(id, priorite, raison),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'client', variables.id] });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, raison }: { id: string; raison?: string }) => crmService.archiveClient(id, raison),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, raison }: { id: string; raison?: string }) => crmService.deleteClient(id, raison),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
    },
  });
}

// ==================== CONTACTS ====================
