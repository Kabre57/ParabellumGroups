import { apiClient } from '../shared/client';
import { ListResponse, DetailResponse, Interaction } from './types';

export type InteractionType = 
  | 'APPEL' 
  | 'EMAIL' 
  | 'REUNION' 
  | 'VISITE' 
  | 'SUPPORT' 
  | 'COMMERCIAL' 
  | 'TECHNIQUE' 
  | 'FORMATION' 
  | 'DEMONSTRATION' 
  | 'PRESENTATION' 
  | 'NEGOCIATION';

export type InteractionCanal = 
  | 'TELEPHONE' 
  | 'EMAIL' 
  | 'EN_PERSONNE' 
  | 'VIDEO' 
  | 'CHAT' 
  | 'RESEAUX_SOCIAUX' 
  | 'PORTAL_CLIENT' 
  | 'MOBILE';

export type InteractionResultat = 
  | 'POSITIF' 
  | 'NEGATIF' 
  | 'NEUTRE' 
  | 'EN_ATTENTE' 
  | 'A_SUIVRE';

export interface CreateInteractionRequest {
  clientId: string;
  contactId?: string;
  type: InteractionType;
  canal: InteractionCanal;
  sujet: string;
  description?: string;
  dateInteraction?: string;
  dureeMinutes?: number;
  resultat?: InteractionResultat;
  prochainContact?: string;
  notes?: string;
}

export interface UpdateInteractionRequest {
  type?: InteractionType;
  canal?: InteractionCanal;
  sujet?: string;
  description?: string;
  dateInteraction?: string;
  dureeMinutes?: number;
  resultat?: InteractionResultat;
  prochainContact?: string;
  notes?: string;
}

export interface InteractionStats {
  total: number;
  byType: Record<string, number>;
  byCanal: Record<string, number>;
  byResultat: Record<string, number>;
  thisMonth: number;
  thisWeek: number;
}

export const interactionsService = {
  async getInteractions(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    contactId?: string;
    type?: InteractionType;
    canal?: InteractionCanal;
    resultat?: InteractionResultat;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Interaction>> {
    const response = await apiClient.get('/interactions', { params });
    return response.data;
  },

  async getInteraction(id: string): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.get(`/interactions/${id}`);
    return response.data;
  },

  async getInteractionsStats(): Promise<{ success: boolean; data: InteractionStats }> {
    const response = await apiClient.get('/interactions/stats');
    return response.data;
  },

  async createInteraction(data: CreateInteractionRequest): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.post('/interactions', data);
    return response.data;
  },

  async updateInteraction(id: string, data: UpdateInteractionRequest): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.put(`/interactions/${id}`, data);
    return response.data;
  },

  async deleteInteraction(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/interactions/${id}`);
    return response.data;
  },

  async linkToTask(id: string, tacheId: string): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.patch(`/interactions/${id}/link-task`, { tacheId });
    return response.data;
  },
};
