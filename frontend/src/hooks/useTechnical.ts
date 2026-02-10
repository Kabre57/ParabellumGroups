import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Mission, Intervention, Technicien, Materiel, Rapport, Specialite } from '@/shared/api/technical';
import { SearchParams } from '@/shared/api/types';

// === MISSIONS ===
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

export function useUpdateMissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      technicalService.updateMission(id, { status } as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

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

export function useDeleteMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-stats'] });
    },
  });
}

// === INTERVENTIONS ===
export function useInterventions(params?: SearchParams) {
  return useQuery<Intervention[]>({
    queryKey: ['interventions', params],
    queryFn: async () => {
      const response = await technicalService.getInterventions(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useIntervention(id: string) {
  return useQuery({
    queryKey: ['intervention', id],
    queryFn: () => technicalService.getIntervention(id),
    enabled: !!id,
  });
}

export function useCreateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createIntervention>[0]) =>
      technicalService.createIntervention(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intervention> }) =>
      technicalService.updateIntervention(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['intervention', variables.id] });
    },
  });
}

export function useCompleteIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resultats?: string; observations?: string; dureeReelle?: number } }) =>
      technicalService.completeIntervention(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['intervention', variables.id] });
    },
  });
}

export function useDeleteIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteIntervention(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
  });
}

// === TECHNICIENS ===
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
    mutationFn: (id: string) => technicalService.deleteTechnicien(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techniciens'] });
      queryClient.invalidateQueries({ queryKey: ['available-techniciens'] });
    },
  });
}

// === MATERIEL ===
export function useMateriel(params?: SearchParams) {
  return useQuery<Materiel[]>({
    queryKey: ['materiel', params],
    queryFn: async () => {
      const response = await technicalService.getMateriels(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useMaterielById(id: string) {
  return useQuery<Materiel>({
    queryKey: ['materiel-item', id],
    queryFn: async () => {
      const response = await technicalService.getMateriel(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMaterielAlertes() {
  return useQuery({
    queryKey: ['materiel-alertes'],
    queryFn: async () => {
      const response = await technicalService.getAlertes();
      return response.data ?? [];
    },
  });
}

export function useSortiesEnCours() {
  return useQuery({
    queryKey: ['sorties-en-cours'],
    queryFn: async () => {
      const response = await technicalService.getSortiesEnCours();
      return response.data ?? [];
    },
  });
}

export function useCreateMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createMateriel>[0]) =>
      technicalService.createMateriel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

export function useUpdateMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Materiel> }) =>
      technicalService.updateMateriel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-item', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

export function useDeleteMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteMateriel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiel'] });
      queryClient.invalidateQueries({ queryKey: ['materiel-alertes'] });
    },
  });
}

// === RAPPORTS ===
export function useRapports(params?: SearchParams) {
  return useQuery<Rapport[]>({
    queryKey: ['rapports', params],
    queryFn: async () => {
      const response = await technicalService.getRapports(params as any);
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useRapport(id: string) {
  return useQuery<Rapport>({
    queryKey: ['rapport', id],
    queryFn: async () => {
      const response = await technicalService.getRapport(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createRapport>[0]) =>
      technicalService.createRapport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
    },
  });
}

export function useUpdateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Rapport> }) =>
      technicalService.updateRapport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      queryClient.invalidateQueries({ queryKey: ['rapport', variables.id] });
    },
  });
}

export function useValidateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.validateRapport(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
      queryClient.invalidateQueries({ queryKey: ['rapport', id] });
    },
  });
}

export function useDeleteRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteRapport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports'] });
    },
  });
}

// === SPECIALITES ===
export function useSpecialites() {
  return useQuery<Specialite[]>({
    queryKey: ['specialites'],
    queryFn: async () => {
      const response = await technicalService.getSpecialites();
      return response.data ?? [];
    },
    placeholderData: [],
  });
}

export function useSpecialite(id: string) {
  return useQuery<Specialite>({
    queryKey: ['specialite', id],
    queryFn: async () => {
      const response = await technicalService.getSpecialite(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof technicalService.createSpecialite>[0]) =>
      technicalService.createSpecialite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
    },
  });
}

export function useUpdateSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Specialite> }) =>
      technicalService.updateSpecialite(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
      queryClient.invalidateQueries({ queryKey: ['specialite', variables.id] });
    },
  });
}

export function useDeleteSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicalService.deleteSpecialite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
    },
  });
}
