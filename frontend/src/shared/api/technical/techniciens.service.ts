import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Technicien, Specialite } from './types';

export const techniciensService = {
  async getSpecialites(params?: any): Promise<PaginatedResponse<Specialite>> {
    const response = await apiClient.get('/specialites', { params });
    return response.data;
  },

  async getTechniciens(params?: any): Promise<PaginatedResponse<Technicien>> {
    const response = await apiClient.get('/techniciens', { params });
    return response.data;
  },

  async getTechnicien(id: string): Promise<Technicien> {
    const response = await apiClient.get(`/techniciens/${id}`);
    return response.data;
  },

  async createTechnicien(data: any): Promise<Technicien> {
    const response = await apiClient.post('/techniciens', data);
    return response.data;
  },

  async updateTechnicien(id: string, data: any): Promise<Technicien> {
    const response = await apiClient.put(`/techniciens/${id}`, data);
    return response.data;
  },

  async deleteTechnicien(id: string): Promise<void> {
    await apiClient.delete(`/techniciens/${id}`);
  }
};
