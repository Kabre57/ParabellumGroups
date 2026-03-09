import { apiClient } from '../shared/client';
import { Prospect, ProspectionStats, CreateProspectRequest, UpdateProspectRequest } from './types';

export const commercialService = {
  async getProspects(params?: any): Promise<Prospect[]> {
    const response = await apiClient.get('/commercial', { params });
    return response.data?.data || response.data || [];
  },

  async getProspectById(id: string): Promise<Prospect> {
    const response = await apiClient.get(`/commercial/${id}`);
    return response.data?.data || response.data;
  },

  async createProspect(data: CreateProspectRequest): Promise<Prospect> {
    const response = await apiClient.post('/commercial', data);
    return response.data?.data || response.data;
  },

  async updateProspect(id: string, data: UpdateProspectRequest): Promise<Prospect> {
    const response = await apiClient.put(`/commercial/${id}`, data);
    return response.data?.data || response.data;
  },

  async deleteProspect(id: string): Promise<void> {
    await apiClient.delete(`/commercial/${id}`);
  },

  async getStats(): Promise<ProspectionStats> {
    const response = await apiClient.get('/commercial/stats');
    return response.data?.data || response.data;
  }
};
