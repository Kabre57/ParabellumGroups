/**
 * Gestion des adresses de facturation et de livraison.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useAdresses(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'adresses', params],
    queryFn: async () => normalizeListResponse(await crmService.getAdresses(params)),
  });
}

export function useAdresse(id: string) {
  return useQuery({
    queryKey: ['crm', 'adresse', id],
    queryFn: () => crmService.getAdresse(id),
    enabled: !!id,
  });
}

export function useCreateAdresse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createAdresse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
    },
  });
}

export function useUpdateAdresse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateAdresse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresse', variables.id] });
    },
  });
}

export function useDeleteAdresse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteAdresse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
    },
  });
}

export function useSetAdressePrincipal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.setAdressePrincipal(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresses'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'adresse', id] });
    },
  });
}

// ==================== TYPES CLIENTS ====================
