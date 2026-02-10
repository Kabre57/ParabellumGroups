import apiClient from '../shared/client';
import { TypeClient } from './types';

export const typeClientsService = {
  async getTypeClients(): Promise<TypeClient[]> {
    const response = await apiClient.get('/customers/type-clients');
    return response.data;
  },

  async getTypeClient(id: string): Promise<TypeClient> {
    const response = await apiClient.get(`/customers/type-clients/${id}`);
    return response.data;
  },

  async createTypeClient(data: Partial<TypeClient>): Promise<TypeClient> {
    const response = await apiClient.post('/customers/type-clients', data);
    return response.data;
  },

  async updateTypeClient(id: string, data: Partial<TypeClient>): Promise<TypeClient> {
    const response = await apiClient.put(`/customers/type-clients/${id}`, data);
    return response.data;
  },

  async deleteTypeClient(id: string): Promise<void> {
    await apiClient.delete(`/customers/type-clients/${id}`);
  },

  async toggleTypeClient(id: string): Promise<TypeClient> {
    const response = await apiClient.patch(`/customers/type-clients/${id}/toggle`);
    return response.data;
  },
};
