/**
 * Gestion des techniciens et de leurs disponibilit?s.
 */
import { technicalService } from '@/shared/api/technical';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Technicien } from '@/shared/api/technical';
import type { SearchParams } from '@/shared/api/types';

export function useAssignTechnicienToMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ missionId, technicienId, role }: { missionId: string; technicienId: string; role?: string }) =>
      technicalService.updateMission(missionId, { technicienIds: [technicienId], role } as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission', variables.missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useTechniciens(params?: SearchParams) {
  return useQuery<Technicien[]>({
    queryKey: ['techniciens', params],
    queryFn: async () => {
      const response = await technicalService.getTechniciens(params);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useTechnicien(id: string) {
  return useQuery({
    queryKey: ['technicien', id],
    queryFn: () => technicalService.getTechnicien(id),
    enabled: !!id,
  });
}

export function useAvailableTechniciens(params?: SearchParams) {
  return useQuery<Technicien[]>({
    queryKey: ['available-techniciens', params],
    queryFn: async () => {
      const response = await technicalService.getTechniciens(params);
      const techniciens = response.data ?? [];
      return techniciens.filter((t) => t.status === 'AVAILABLE');
    },
    placeholderData: [],
  });
}

export function useTechnicienStats(id: string) {
  return useQuery({
    queryKey: ['technicien-stats', id],
    queryFn: () => technicalService.getTechnicien(id),
    enabled: !!id,
  });
}

export function useCreateTechnicien() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Technicien>) => technicalService.createTechnicien(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['available-techniciens'] });
    },
  });
}

export function useUpdateTechnicien() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Technicien> }) =>
      technicalService.updateTechnicien(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['technicien', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['available-techniciens'] });
    },
  });
}

export function useUpdateTechnicienStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      technicalService.updateTechnicien(id, { status } as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['technicien', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['available-techniciens'] });
    },
  });
}

export function useDeleteTechnicien() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; force?: boolean }) =>
      typeof input === 'string'
        ? technicalService.deleteTechnicien(input)
        : technicalService.deleteTechnicien(input.id, { force: input.force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['available-techniciens'] });
    },
  });
}

// === MATERIEL ===
