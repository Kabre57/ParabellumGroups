/**
 * Accès aux types de clients et aux secteurs d’activité.
 */
import { crmService } from '@/shared/api/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeListResponse } from './shared';

export function useTypeClients(options?: { enabled?: boolean }) {
  return useQuery<any>({
    queryKey: ['crm', 'type-clients'],
    queryFn: async () => normalizeListResponse(await crmService.getTypeClients()),
    enabled: options?.enabled ?? true,
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

// ==================== RELANCES ====================
