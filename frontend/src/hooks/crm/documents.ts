/**
 * Consultation et suivi des documents clients.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useDocuments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'documents', params],
    queryFn: async () => normalizeListResponse(await crmService.getDocuments(params)),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['crm', 'document', id],
    queryFn: () => crmService.getDocument(id),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'document', variables.id] });
    },
  });
}

export function useUpdateDocumentValidity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estValide: boolean; raison?: string } }) =>
      crmService.updateDocumentValidity(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'document', variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'documents'] });
    },
  });
}

export function useDocumentsExpiring(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'documents-expiring', params],
    queryFn: () => crmService.getDocumentsExpiring(params),
  });
}

// ==================== ADRESSES ====================
