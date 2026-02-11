import { apiClient } from '../shared/client';
import { Intervention } from './types';

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

export interface CreateInterventionRequest {
  missionId: string;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin?: string;
  dureeEstimee?: number;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  technicienIds?: string[];
  materiels?: Array<{
    materielId: string;
    quantite: number;
    notes?: string;
    technicienId?: string;
  }>;
}

export interface UpdateInterventionRequest {
  titre?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  dureeEstimee?: number;
  dureeReelle?: number;
  status?: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  resultats?: string;
  observations?: string;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  technicienIds?: string[];
}

export interface CompleteInterventionRequest {
  dureeReelle?: number;
  resultats?: string;
  observations?: string;
}

export const interventionsService = {
  async getInterventions(params?: {
    page?: number;
    limit?: number;
    missionId?: string;
    technicienId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Intervention>> {
    const response = await apiClient.get('/technical/interventions', { params });
    return response.data;
  },

  async getIntervention(id: string): Promise<DetailResponse<Intervention>> {
    const response = await apiClient.get(`/technical/interventions/${id}`);
    return response.data;
  },

  async createIntervention(data: CreateInterventionRequest): Promise<DetailResponse<Intervention>> {
    const response = await apiClient.post('/technical/interventions', data);
    return response.data;
  },

  async updateIntervention(id: string, data: UpdateInterventionRequest): Promise<DetailResponse<Intervention>> {
    const response = await apiClient.put(`/technical/interventions/${id}`, data);
    return response.data;
  },

  async deleteIntervention(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/technical/interventions/${id}`);
    return response.data;
  },

  async completeIntervention(id: string, data?: CompleteInterventionRequest): Promise<DetailResponse<Intervention>> {
    const response = await apiClient.patch(`/technical/interventions/${id}/complete`, data || {});
    return response.data;
  },

  async assignTechnicien(id: string, technicienId: string): Promise<DetailResponse<Intervention>> {
    const response = await apiClient.post(`/technical/interventions/${id}/techniciens`, { technicienId });
    return response.data;
  },

  async removeTechnicien(id: string, technicienId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/technical/interventions/${id}/techniciens/${technicienId}`);
    return response.data;
  },
};
