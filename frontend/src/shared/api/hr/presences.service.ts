import { apiClient } from '../shared/client';

export type TypePresence = 'BUREAU' | 'TELETRAVAIL' | 'DEPLACEMENT' | 'ABSENCE';

export interface Presence {
  id: string;
  employeId: string;
  employe?: {
    id: string;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  date: string;
  type: TypePresence;
  heureArrivee?: string;
  heureDepart?: string;
  heuresTravaillees?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PresenceStats {
  totalJours: number;
  parType: Record<TypePresence, number>;
  heuresTotal: number;
  moyenneHeuresParJour: number;
  tauxPresence: number;
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

export interface CreatePresenceRequest {
  employeId: string;
  date: string;
  type?: TypePresence;
  heureArrivee?: string;
  heureDepart?: string;
  notes?: string;
}

export interface UpdatePresenceRequest {
  type?: TypePresence;
  heureArrivee?: string;
  heureDepart?: string;
  notes?: string;
}

export const presencesService = {
  async getPresencesByEmploye(employeId: string, params?: {
    startDate?: string;
    endDate?: string;
    type?: TypePresence;
  }): Promise<ListResponse<Presence>> {
    const response = await apiClient.get(`/hr/presences/employe/${employeId}`, { params });
    return response.data;
  },

  async getPresencesStats(params?: {
    employeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: PresenceStats }> {
    const response = await apiClient.get('/hr/presences/stats', { params });
    return response.data;
  },

  async exportPresences(params?: {
    employeId?: string;
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    const response = await apiClient.get('/hr/presences/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async createPresence(data: CreatePresenceRequest): Promise<DetailResponse<Presence>> {
    const response = await apiClient.post('/hr/presences', data);
    return response.data;
  },

  async updatePresence(id: string, data: UpdatePresenceRequest): Promise<DetailResponse<Presence>> {
    const response = await apiClient.put(`/hr/presences/${id}`, data);
    return response.data;
  },

  async pointage(employeId: string, type: 'arrivee' | 'depart'): Promise<DetailResponse<Presence>> {
    const response = await apiClient.post('/hr/presences/pointage', { employeId, type });
    return response.data;
  },
};
