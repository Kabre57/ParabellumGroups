import { apiClient } from '../shared/client';
import { Specialite } from './types';

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateSpecialiteRequest {
  nom: string;
  description?: string;
}

export interface UpdateSpecialiteRequest {
  nom?: string;
  description?: string;
}

export const specialitesService = {
  async getSpecialites(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Specialite>> {
    const response = await apiClient.get('/technical/specialites', { params });
    return response.data;
  },

  async getSpecialite(id: string): Promise<DetailResponse<Specialite>> {
    const response = await apiClient.get(`/technical/specialites/${id}`);
    return response.data;
  },

  async createSpecialite(data: CreateSpecialiteRequest): Promise<DetailResponse<Specialite>> {
    const response = await apiClient.post('/technical/specialites', data);
    return response.data;
  },

  async updateSpecialite(id: string, data: UpdateSpecialiteRequest): Promise<DetailResponse<Specialite>> {
    const response = await apiClient.put(`/technical/specialites/${id}`, data);
    return response.data;
  },

  async deleteSpecialite(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/technical/specialites/${id}`);
    return response.data;
  },
};
