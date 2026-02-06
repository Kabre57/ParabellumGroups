import { apiClient } from '../shared/client';
import { Task, TaskData } from './types';

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

export interface CreateTaskRequest {
  projetId: string;
  titre: string;
  description?: string;
  dateDebut?: string;
  dateEcheance?: string;
  dureeEstimee?: number;
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'BLOQUEE';
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
  assigneId?: string;
}

export interface UpdateTaskRequest {
  titre?: string;
  description?: string;
  dateDebut?: string;
  dateEcheance?: string;
  dureeEstimee?: number;
  dureeReelle?: number;
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'BLOQUEE';
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
}

export const tachesService = {
  async getTaches(params?: {
    page?: number;
    limit?: number;
    projetId?: string;
    assigneId?: string;
    status?: string;
    priorite?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Task>> {
    const response = await apiClient.get('/projects/tasks', { params });
    return response.data;
  },

  async getTache(id: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.get(`/projects/tasks/${id}`);
    return response.data;
  },

  async getTachesByProject(projetId: string, params?: {
    status?: string;
    assigneId?: string;
  }): Promise<ListResponse<Task>> {
    const response = await apiClient.get(`/projects/${projetId}/tasks`, { params });
    return response.data;
  },

  async createTache(data: CreateTaskRequest): Promise<DetailResponse<Task>> {
    const response = await apiClient.post('/projects/tasks', data);
    return response.data;
  },

  async updateTache(id: string, data: UpdateTaskRequest): Promise<DetailResponse<Task>> {
    const response = await apiClient.put(`/projects/tasks/${id}`, data);
    return response.data;
  },

  async deleteTache(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/tasks/${id}`);
    return response.data;
  },

  async assignTache(id: string, userId: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.post(`/projects/tasks/${id}/assign`, { userId });
    return response.data;
  },

  async unassignTache(id: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/tasks/${id}/assign/${userId}`);
    return response.data;
  },

  async completeTache(id: string, dureeReelle?: number): Promise<DetailResponse<Task>> {
    const response = await apiClient.patch(`/projects/tasks/${id}/complete`, { dureeReelle });
    return response.data;
  },
};
