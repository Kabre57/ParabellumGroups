import { apiClient } from '../shared/client';
import { Rapport } from './types';

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

export interface CreateRapportRequest {
  interventionId: string;
  titre: string;
  contenu: string;
  conclusions?: string;
  recommandations?: string;
}

export interface UpdateRapportRequest {
  titre?: string;
  contenu?: string;
  conclusions?: string;
  recommandations?: string;
}

export interface UpdateRapportStatusRequest {
  status: 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'REJETE';
  commentaire?: string;
}

export const rapportsService = {
  async getRapports(params?: {
    page?: number;
    limit?: number;
    interventionId?: string;
    redacteurId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Rapport>> {
    const response = await apiClient.get('/technical/rapports', { params });
    return response.data;
  },

  async getRapport(id: string): Promise<DetailResponse<Rapport>> {
    const response = await apiClient.get(`/technical/rapports/${id}`);
    return response.data;
  },

  async createRapport(data: CreateRapportRequest): Promise<DetailResponse<Rapport>> {
    const response = await apiClient.post('/technical/rapports', data);
    return response.data;
  },

  async updateRapport(id: string, data: UpdateRapportRequest): Promise<DetailResponse<Rapport>> {
    const response = await apiClient.put(`/technical/rapports/${id}`, data);
    return response.data;
  },

  async updateRapportStatus(id: string, data: UpdateRapportStatusRequest): Promise<DetailResponse<Rapport>> {
    const response = await apiClient.patch(`/technical/rapports/${id}/status`, data);
    return response.data;
  },

  async deleteRapport(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/technical/rapports/${id}`);
    return response.data;
  },

  async uploadRapportPhotos(id: string, files: File[]): Promise<DetailResponse<Rapport>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    const response = await apiClient.post(`/technical/rapports/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteRapportPhoto(id: string, url: string): Promise<DetailResponse<Rapport>> {
    const response = await apiClient.delete(`/technical/rapports/${id}/photos`, {
      data: { url },
    });
    return response.data;
  },

  async submitRapport(id: string): Promise<DetailResponse<Rapport>> {
    return this.updateRapportStatus(id, { status: 'SOUMIS' });
  },

  async validateRapport(id: string): Promise<DetailResponse<Rapport>> {
    return this.updateRapportStatus(id, { status: 'VALIDE' });
  },

  async rejectRapport(id: string, commentaire?: string): Promise<DetailResponse<Rapport>> {
    return this.updateRapportStatus(id, { status: 'REJETE', commentaire });
  },
};
