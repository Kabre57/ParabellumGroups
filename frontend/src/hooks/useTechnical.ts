import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Mission, Intervention, Technicien, Materiel, Rapport, Specialite } from '@/shared/api/technical';
import { SearchParams } from '@/shared/api/types';

// === MISSIONS ===
export function useMissions(params?: SearchParams) {
  return useQuery({
    queryKey: ['missions', params],
    queryFn: () => technicalService.getMissions(params),
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
    queryFn: () => technicalService.getMissionsStats(),
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
      technicalService.updateMissionStatus(id, status),
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
      technicalService.assignTechnicienToMission(missionId, technicienId, role),
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
  return useQuery({
    queryKey: ['interventions', params],
    queryFn: () => technicalService.getInterventions(params),
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
    mutationFn: (data: Partial<Intervention>) => technicalService.createIntervention(data),
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
  return useQuery({
    queryKey: ['techniciens', params],
    queryFn: () => technicalService.getTechniciens(params),
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
  return useQuery({
    queryKey: ['available-techniciens', params],
    queryFn: () => technicalService.getAvailableTechniciens(params),
  });
}

export function useTechnicienStats(id: string) {
  return useQuery({
    queryKey: ['technicien-stats', id],
    queryFn: () => technicalService.getTechnicienStats(id),
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
      technicalService.updateTechnicienStatus(id, status),
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
  return useQuery({
    queryKey: ['materiel', params],
    queryFn: () => technicalService.getMateriel(params),
  });
}

export function useMaterielById(id: string) {
  return useQuery({
    queryKey: ['materiel-item', id],
    queryFn: () => technicalService.getMaterielById(id),
    enabled: !!id,
  });
}

export function useMaterielAlertes() {
  return useQuery({
    queryKey: ['materiel-alertes'],
    queryFn: () => technicalService.getMaterielAlertes(),
  });
}

export function useSortiesEnCours() {
  return useQuery({
    queryKey: ['sorties-en-cours'],
    queryFn: () => technicalService.getSortiesEnCours(),
  });
}

export function useCreateMateriel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Materiel>) => technicalService.createMateriel(data),
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
  return useQuery({
    queryKey: ['rapports', params],
    queryFn: () => technicalService.getRapports(params),
  });
}

export function useRapport(id: string) {
  return useQuery({
    queryKey: ['rapport', id],
    queryFn: () => technicalService.getRapport(id),
    enabled: !!id,
  });
}

export function useCreateRapport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Rapport>) => technicalService.createRapport(data),
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
  return useQuery({
    queryKey: ['specialites'],
    queryFn: () => technicalService.getSpecialites(),
  });
}

export function useSpecialite(id: string) {
  return useQuery({
    queryKey: ['specialite', id],
    queryFn: () => technicalService.getSpecialite(id),
    enabled: !!id,
  });
}

export function useCreateSpecialite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Specialite>) => technicalService.createSpecialite(data),
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
