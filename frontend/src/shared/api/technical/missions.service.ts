import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Mission, Intervention, SortirMaterielRequest, SortieMateriel } from './types';

export const missionsService = {
  async getMissions(params?: any): Promise<PaginatedResponse<Mission>> {
    const response = await apiClient.get('/missions', { params });
    return response.data;
  },

  async getMission(id: string): Promise<Mission> {
    const response = await apiClient.get(`/missions/${id}`);
    return response.data;
  },

  async createMission(data: any): Promise<Mission> {
    const response = await apiClient.post('/missions', data);
    return response.data;
  },

  async updateMission(id: string, data: any): Promise<Mission> {
    const response = await apiClient.put(`/missions/${id}`, data);
    return response.data;
  },

  async deleteMission(id: string): Promise<void> {
    await apiClient.delete(`/missions/${id}`);
  },

  async getInterventions(params?: any): Promise<PaginatedResponse<Intervention>> {
    const response = await apiClient.get('/interventions', { params });
    return response.data;
  },

  async sortirMateriel(interventionId: string, data: SortirMaterielRequest): Promise<SortieMateriel> {
    const response = await apiClient.post(`/interventions/${interventionId}/materiel`, data);
    return response.data;
  }
};
