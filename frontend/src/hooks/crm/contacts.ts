/**
 * Consultation et gestion des contacts rattachés au CRM.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useContacts(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'contacts', params],
    queryFn: async () => normalizeListResponse(await crmService.getContacts(params)),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['crm', 'contact', id],
    queryFn: () => crmService.getContact(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateContact(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact', variables.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
    },
  });
}

export function useSetContactPrincipal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, principal }: { id: string; principal: boolean }) =>
      crmService.setContactPrincipal(id, principal),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contact', variables.id] });
    },
  });
}

// ==================== CONTRATS ====================
