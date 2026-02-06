import { apiClient } from '../shared/client';
import { ListResponse, DetailResponse, StatsResponse, Contrat, ContratsStats, ContratsExpiring } from './types';

export const contratsService = {
  async getContrats(params?: any): Promise<ListResponse<Contrat>> {
    const response = await apiClient.get('/contrats', { params });
    return response.data;
  },

  async getContrat(id: string): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.get(`/contrats/${id}`);
    return response.data;
  },

  async createContrat(data: any): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.post('/contrats', data);
    return response.data;
  },

  async getContratsStats(params?: any): Promise<StatsResponse<ContratsStats>> {
    const response = await apiClient.get('/contrats/stats', { params });
    return response.data;
  },

  async getContratsExpiring(params?: any): Promise<StatsResponse<ContratsExpiring>> {
    const response = await apiClient.get('/contrats/expiring', { params });
    return response.data;
  },

  async updateContratStatus(id: string, status: Contrat['status']): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.patch(`/contrats/${id}/status`, { status });
    return response.data;
  }
};
