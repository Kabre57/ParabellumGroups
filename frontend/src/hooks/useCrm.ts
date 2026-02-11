import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmService } from '@/shared/api/crm';

const normalizeListResponse = (response: any) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
};

// ==================== CLIENTS ====================

export function useClients(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['crm', 'clients', params],
    queryFn: async () => normalizeListResponse(await crmService.getClients(params)),
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

export function useTypeClients() {
  return useQuery<any>({
    queryKey: ['crm', 'type-clients'],
    queryFn: async () => normalizeListResponse(await crmService.getTypeClients()),
  });
}

export function useTypeClient(id: string) {
  return useQuery({
    queryKey: ['crm', 'type-client', id],
    queryFn: () => crmService.getTypeClient(id),
    enabled: !!id,
  });
}

export function useCreateTypeClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createTypeClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'type-clients'] });
    },
  });
}

export function useUpdateTypeClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateTypeClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'type-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'type-client', variables.id] });
    },
  });
}

export function useDeleteTypeClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteTypeClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'type-clients'] });
    },
  });
}

export function useToggleTypeClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.toggleTypeClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'type-clients'] });
    },
  });
}

// ==================== SECTEURS ====================

export function useSecteurs() {
  return useQuery({
    queryKey: ['crm', 'secteurs'],
    queryFn: async () => normalizeListResponse(await crmService.getSecteurs()),
  });
}

export function useSecteur(id: string) {
  return useQuery({
    queryKey: ['crm', 'secteur', id],
    queryFn: () => crmService.getSecteur(id),
    enabled: !!id,
  });
}

export function useCreateSecteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => crmService.createSecteur(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'secteurs'] });
    },
  });
}

export function useUpdateSecteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmService.updateSecteur(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'secteurs'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'secteur', variables.id] });
    },
  });
}

export function useDeleteSecteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteSecteur(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'secteurs'] });
    },
  });
}

export function useSecteursTree() {
  return useQuery({
    queryKey: ['crm', 'secteurs-tree'],
    queryFn: () => crmService.getSecteursTree(),
  });
}
