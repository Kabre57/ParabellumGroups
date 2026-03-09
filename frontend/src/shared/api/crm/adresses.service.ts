import apiClient from '../shared/client';
import { Address } from './types';

export const adressesService = {
  async getAdresses(params?: Record<string, any>): Promise<Address[]> {
    const response = await apiClient.get('/customers/adresses', { params });
    return response.data;
  },

  async getAdresse(id: string): Promise<Address> {
    const response = await apiClient.get(`/customers/adresses/${id}`);
    return response.data;
  },

  async createAdresse(data: Partial<Address>): Promise<Address> {
    const response = await apiClient.post('/customers/adresses', data);
    return response.data;
  },

  async updateAdresse(id: string, data: Partial<Address>): Promise<Address> {
    const response = await apiClient.put(`/customers/adresses/${id}`, data);
    return response.data;
  },

  async deleteAdresse(id: string): Promise<void> {
    await apiClient.delete(`/customers/adresses/${id}`);
  },

  async setAdressePrincipal(id: string): Promise<Address> {
    const response = await apiClient.patch(`/customers/adresses/${id}/principal`);
    return response.data;
  },
};
