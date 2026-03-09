import { apiClient } from '../shared/client';

export type JalonStatus = 'PLANIFIE' | 'ATTEINT' | 'MANQUE';

export interface Jalon {
  id: string;
  projetId: string;
  nom: string;
  description?: string;
  dateEcheance: string;
  dateAtteinte?: string;
  status: JalonStatus;
  livrables?: string[];
  createdAt?: string;
  updatedAt?: string;
}

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

export interface CreateJalonRequest {
  projetId: string;
  nom: string;
  description?: string;
  dateEcheance: string;
  livrables?: string[];
}

export interface UpdateJalonRequest {
  nom?: string;
  description?: string;
  dateEcheance?: string;
  livrables?: string[];
  status?: JalonStatus;
}

export const jalonsService = {
  async getJalons(params?: {
    page?: number;
    limit?: number;
    projetId?: string;
    status?: JalonStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Jalon>> {
    const response = await apiClient.get('/projects/jalons', { params });
    return response.data;
  },

  async getJalon(id: string): Promise<DetailResponse<Jalon>> {
    const response = await apiClient.get(`/projects/jalons/${id}`);
    return response.data;
  },

  async getJalonsByProject(projetId: string): Promise<ListResponse<Jalon>> {
    const response = await apiClient.get('/projects/jalons', { params: { projetId } });
    return response.data;
  },

  async createJalon(data: CreateJalonRequest): Promise<DetailResponse<Jalon>> {
    const response = await apiClient.post('/projects/jalons', data);
    return response.data;
  },

  async updateJalon(id: string, data: UpdateJalonRequest): Promise<DetailResponse<Jalon>> {
    const response = await apiClient.put(`/projects/jalons/${id}`, data);
    return response.data;
  },

  async deleteJalon(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/jalons/${id}`);
    return response.data;
  },

  async updateJalonStatus(id: string, status: JalonStatus): Promise<DetailResponse<Jalon>> {
    const response = await apiClient.patch(`/projects/jalons/${id}/status`, { status });
    return response.data;
  },

  async markAsAtteint(id: string): Promise<DetailResponse<Jalon>> {
    return this.updateJalonStatus(id, 'ATTEINT');
  },

  async markAsManque(id: string): Promise<DetailResponse<Jalon>> {
    return this.updateJalonStatus(id, 'MANQUE');
  },
};
