/**
 * Service API Commercial - Gestion de la prospection
 */

import apiClient from '../client';
import type {
  Prospect,
  ProspectActivity,
  ProspectionStats,
  CreateProspectRequest,
  UpdateProspectRequest,
  MoveProspectRequest,
  ConvertProspectRequest,
  CreateProspectActivityRequest,
  ProspectStage
} from '../types';

const COMMERCIAL_SERVICE_URL = process.env.NEXT_PUBLIC_COMMERCIAL_SERVICE_URL || 'http://localhost:3004';

export interface GetProspectsParams {
  page?: number;
  limit?: number;
  stage?: ProspectStage;
  assignedToId?: string;
  priority?: string;
  search?: string;
  isConverted?: boolean;
}

export interface ProspectsResponse {
  success: boolean;
  data: Prospect[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProspectResponse {
  success: boolean;
  data: Prospect;
  message?: string;
}

export interface ActivitiesResponse {
  success: boolean;
  data: ProspectActivity[];
}

export interface StatsResponse {
  success: boolean;
  data: ProspectionStats;
}

export const commercialService = {
  /**
   * Récupère la liste des prospects avec filtres et pagination
   */
  async getProspects(params?: GetProspectsParams): Promise<ProspectsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isConverted !== undefined) queryParams.append('isConverted', params.isConverted.toString());
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<ProspectsResponse>(url);
  },

  /**
   * Récupère un prospect par son ID
   */
  async getProspectById(id: string): Promise<ProspectResponse> {
    return apiClient.get<ProspectResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}`);
  },

  /**
   * Crée un nouveau prospect
   */
  async createProspect(data: CreateProspectRequest): Promise<ProspectResponse> {
    return apiClient.post<ProspectResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects`, data);
  },

  /**
   * Met à jour un prospect
   */
  async updateProspect(id: string, data: UpdateProspectRequest): Promise<ProspectResponse> {
    return apiClient.put<ProspectResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}`, data);
  },

  /**
   * Supprime un prospect
   */
  async deleteProspect(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}`);
  },

  /**
   * Déplace un prospect dans le workflow
   */
  async moveProspect(id: string, data: MoveProspectRequest): Promise<ProspectResponse> {
    return apiClient.post<ProspectResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/move`, data);
  },

  /**
   * Convertit un prospect en client
   */
  async convertProspect(id: string, data: ConvertProspectRequest): Promise<ProspectResponse> {
    return apiClient.post<ProspectResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/convert`, data);
  },

  /**
   * Récupère les activités d'un prospect
   */
  async getProspectActivities(id: string): Promise<ActivitiesResponse> {
    return apiClient.get<ActivitiesResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/activities`);
  },

  /**
   * Ajoute une activité à un prospect
   */
  async addProspectActivity(id: string, data: CreateProspectActivityRequest): Promise<{ success: boolean; data: ProspectActivity; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/activities`, data);
  },

  /**
   * Récupère les statistiques de prospection
   */
  async getStats(): Promise<StatsResponse> {
    return apiClient.get<StatsResponse>(`${COMMERCIAL_SERVICE_URL}/api/prospects/stats`);
  }
};
