import { apiClient } from '../shared/client';
import { ListResponse, DetailResponse, Opportunite } from './types';

export interface CreateOpportuniteRequest {
  clientId: string;
  nom: string;
  description?: string;
  montantEstime: number;
  probabilite?: number;
  dateFermetureEstimee?: string;
  etape?: 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';
  statut?: 'OUVERTE' | 'GAGNEE' | 'PERDUE' | 'MISE_EN_ATTENTE';
  source?: string;
  commercialId?: string;
}

export interface UpdateOpportuniteRequest {
  nom?: string;
  description?: string;
  montantEstime?: number;
  probabilite?: number;
  dateFermetureEstimee?: string;
  etape?: 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';
  statut?: 'OUVERTE' | 'GAGNEE' | 'PERDUE' | 'MISE_EN_ATTENTE';
}

export interface UpdateStageRequest {
  etape: 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';
  notes?: string;
}

export interface CloseOpportuniteRequest {
  statut: 'GAGNEE' | 'PERDUE';
  raisonPerdue?: string;
  montantFinal?: number;
}

export interface AddProductRequest {
  description: string;
  prixUnitaire: number;
  quantite: number;
  tva?: number;
  remise?: number;
}

export interface PipelineStats {
  byEtape: Record<string, { count: number; montant: number }>;
  total: { count: number; montant: number };
  tauxConversion?: number;
}

export const opportunitesService = {
  async getOpportunites(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    etape?: string;
    statut?: string;
    commercialId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Opportunite>> {
    const response = await apiClient.get('/opportunites', { params });
    return response.data;
  },

  async getOpportunite(id: string): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.get(`/opportunites/${id}`);
    return response.data;
  },

  async getPipelineStats(): Promise<{ success: boolean; data: PipelineStats }> {
    const response = await apiClient.get('/opportunites/pipeline');
    return response.data;
  },

  async createOpportunite(data: CreateOpportuniteRequest): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.post('/opportunites', data);
    return response.data;
  },

  async updateOpportunite(id: string, data: UpdateOpportuniteRequest): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.put(`/opportunites/${id}`, data);
    return response.data;
  },

  async updateStage(id: string, data: UpdateStageRequest): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.patch(`/opportunites/${id}/stage`, data);
    return response.data;
  },

  async closeOpportunite(id: string, data: CloseOpportuniteRequest): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.patch(`/opportunites/${id}/close`, data);
    return response.data;
  },

  async addProduct(id: string, data: AddProductRequest): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.post(`/opportunites/${id}/products`, data);
    return response.data;
  },

  async deleteOpportunite(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/opportunites/${id}`);
    return response.data;
  },
};
