/**
 * Chargement et actions sur les missions techniques.
 */
import { technicalService } from '@/shared/api/technical';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Mission, MissionOrder } from '@/shared/api/technical';
import type { SearchParams } from '@/shared/api/types';

export function useMissions(params?: SearchParams) {
  return useQuery<Mission[]>({
    queryKey: ['missions', params],
    queryFn: async () => {
      const response = await technicalService.getMissions(params);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useMission(id: string) {
  return useQuery({
    queryKey: ['mission', id],
    queryFn: () => technicalService.getMission(id),
    enabled: !!id,
  });
}

export function useMissionsStats() {
  return useQuery({
    queryKey: ['missions-stats'],
    queryFn: async () => {
      const response = await technicalService.getMissions({ page: 1, limit: 200 });
      const missions = response.data ?? [];
      const byStatus = missions.reduce<Record<string, number>>((acc, mission) => {
        const status = mission.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      return {
        total: missions.length,
        byStatus,
      };
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Mission>) => technicalService.createMission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Mission> }) =>
      technicalService.updateMission(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

export function useResyncMissionFromCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.resyncMissionFromCrm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', id] });
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}

export function useUpdateMissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      technicalService.updateMissionStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { id: string; force?: boolean }) =>
      typeof input === 'string'
        ? technicalService.deleteMission(input)
        : technicalService.deleteMission(input.id, { force: input.force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

// === INTERVENTIONS ===

export function useMissionOrders(params?: SearchParams) {
  return useQuery<MissionOrder[]>({
    queryKey: ['mission-orders', params],
    queryFn: async () => {
      const response = await technicalService.getOrders(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useCreateMissionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createOrder>[0]) =>
      technicalService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-orders'] });
    },
  });
}

export function useCreateMissionOrdersBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createOrdersBatch>[0]) =>
      technicalService.createOrdersBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-orders'] });
    },
  });
}

export function useUpdateMissionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof technicalService.updateOrder>[1] }) =>
      technicalService.updateOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mission-order', variables.id] });
    },
  });
}

export function useMarkMissionOrderPrinted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.markPrinted(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['mission-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mission-order', id] });
    },
  });
}

// === TECHNICIENS ===
