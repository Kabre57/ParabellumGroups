import { apiClient } from '../shared/client';
import { ListResponse, DetailResponse, StatsResponse, Client, ClientsStats } from './types';

export const clientsService = {
  async getClients(params?: any): Promise<ListResponse<Client>> {
    const response = await apiClient.get('/clients', { params });
    return response.data;
  },

  async getClient(id: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  async createClient(data: any): Promise<DetailResponse<Client>> {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },

  async updateClient(id: string, data: any): Promise<DetailResponse<Client>> {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data;
  },

  async searchClients(params?: any): Promise<ListResponse<Client>> {
    const response = await apiClient.get('/clients/search', { params });
    return response.data;
  },

  async getClientsStats(params?: any): Promise<StatsResponse<ClientsStats>> {
    const response = await apiClient.get('/clients/stats', { params });
    return response.data;
  },

  async updateClientStatus(id: string, status: Client['status'], raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.patch(`/clients/${id}/status`, { status, raison });
    return response.data;
  },

  async updateClientPriority(id: string, priorite: Client['priorite'], raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.patch(`/clients/${id}/priority`, { priorite, raison });
    return response.data;
  },

  async archiveClient(id: string, raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.delete(`/clients/${id}/archive`, {
      data: raison ? { raison } : undefined,
    });
    return response.data;
  },

  async deleteClient(id: string, raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.delete(`/clients/${id}/archive`, {
      data: raison ? { raison } : undefined,
    });
    return response.data;
  }
};
