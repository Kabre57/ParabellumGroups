import { apiClient } from '../shared/client';
import { ListResponse, DetailResponse, EmptyResponse, Contact } from './types';

export const contactsService = {
  async getContacts(params?: any): Promise<ListResponse<Contact>> {
    const response = await apiClient.get('/contacts', { params });
    return response.data;
  },

  async getContact(id: string): Promise<DetailResponse<Contact>> {
    const response = await apiClient.get(`/contacts/${id}`);
    return response.data;
  },

  async createContact(data: any): Promise<DetailResponse<Contact>> {
    const response = await apiClient.post('/contacts', data);
    return response.data;
  },

  async updateContact(id: string, data: any): Promise<DetailResponse<Contact>> {
    const response = await apiClient.put(`/contacts/${id}`, data);
    return response.data;
  },

  async deleteContact(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/contacts/${id}`);
    return response.data;
  },

  async setContactPrincipal(id: string, principal: boolean): Promise<DetailResponse<Contact>> {
    const response = await apiClient.patch(`/contacts/${id}/principal`, { principal });
    return response.data;
  }
};
