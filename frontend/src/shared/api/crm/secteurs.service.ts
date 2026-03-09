import apiClient from '../shared/client';
import { SecteurActivite } from './types';

export const secteursService = {
  async getSecteurs(params?: Record<string, any>): Promise<SecteurActivite[]> {
    const response = await apiClient.get('/customers/secteurs', { params });
    return response.data;
  },

  async getSecteur(id: string): Promise<SecteurActivite> {
    const response = await apiClient.get(`/customers/secteurs/${id}`);
    return response.data;
  },

  async createSecteur(data: Partial<SecteurActivite>): Promise<SecteurActivite> {
    const response = await apiClient.post('/customers/secteurs', data);
    return response.data;
  },

  async updateSecteur(id: string, data: Partial<SecteurActivite>): Promise<SecteurActivite> {
    const response = await apiClient.put(`/customers/secteurs/${id}`, data);
    return response.data;
  },

  async deleteSecteur(id: string): Promise<void> {
    await apiClient.delete(`/customers/secteurs/${id}`);
  },

  async getSecteursTree(): Promise<any> {
    const response = await apiClient.get('/customers/secteurs/tree');
    return response.data;
  },
};
