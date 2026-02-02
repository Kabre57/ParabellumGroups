/**
 * Service API Commercial - Gestion complète de la prospection
 */

import apiClient from '../client';
import type {
  Prospect,
  ProspectActivity,
  ProspectionStats,
  ProspectionCampaign,
  ProspectionSequence,
  SalesTarget,
  EmailTemplate,
  CreateProspectRequest,
  UpdateProspectRequest,
  MoveProspectRequest,
  ConvertProspectRequest,
  CreateProspectActivityRequest,
  CreateCampaignRequest,
  CreateSequenceRequest,
  CreateTargetRequest,
  GetProspectsParams,
  ProspectsResponse,
  ProspectResponse,
  ActivitiesResponse,
  StatsResponse,
  CampaignsResponse,
  SequencesResponse,
  TargetsResponse,
  EtatProspect,
  PrioriteProspect,
  SourceProspect
} from '../types';

const COMMERCIAL_SERVICE_URL = process.env.NEXT_PUBLIC_COMMERCIAL_SERVICE_URL || 'http://localhost:4004';

export const commercialService = {
  // ==================== PROSPECTS ====================
  
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
    if (params?.sector) queryParams.append('sector', params.sector);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.country) queryParams.append('country', params.country);
    if (params?.scoreMin) queryParams.append('scoreMin', params.scoreMin.toString());
    if (params?.scoreMax) queryParams.append('scoreMax', params.scoreMax.toString());
    
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

  // ==================== ACTIVITÉS ====================

  /**
   * Récupère les activités d'un prospect
   */
  async getProspectActivities(id: string, filters?: {
    type?: string;
    completed?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<ActivitiesResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.completed !== undefined) queryParams.append('completed', filters.completed.toString());
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/activities${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<ActivitiesResponse>(url);
  },

  /**
   * Ajoute une activité à un prospect
   */
  async addProspectActivity(id: string, data: CreateProspectActivityRequest): Promise<{ success: boolean; data: ProspectActivity; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/activities`, data);
  },

  /**
   * Met à jour une activité
   */
  async updateProspectActivity(prospectId: string, activityId: string, data: Partial<CreateProspectActivityRequest>): Promise<{ success: boolean; data: ProspectActivity; message: string }> {
    return apiClient.put(`${COMMERCIAL_SERVICE_URL}/api/prospects/${prospectId}/activities/${activityId}`, data);
  },

  // ==================== DOCUMENTS ====================

  /**
   * Récupère les documents d'un prospect
   */
  async getProspectDocuments(id: string, type?: string): Promise<{ success: boolean; data: any[] }> {
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/documents${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get(url);
  },

  /**
   * Upload un document pour un prospect
   */
  async uploadProspectDocument(id: string, data: FormData): Promise<{ success: boolean; data: any; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/${id}/documents`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // ==================== STATISTIQUES ====================

  /**
   * Récupère les statistiques de prospection
   */
  async getStats(filters?: {
    period?: string;
    userId?: string;
    teamId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StatsResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.period) queryParams.append('period', filters.period);
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.teamId) queryParams.append('teamId', filters.teamId);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<StatsResponse>(url);
  },

  // ==================== CAMPAGNES ====================

  /**
   * Récupère toutes les campagnes
   */
  async getCampaigns(filters?: {
    status?: string;
    type?: string;
  }): Promise<CampaignsResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.type) queryParams.append('type', filters.type);
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<CampaignsResponse>(url);
  },

  /**
   * Crée une nouvelle campagne
   */
  async createCampaign(data: CreateCampaignRequest): Promise<{ success: boolean; data: ProspectionCampaign; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/create`, data);
  },

  /**
   * Récupère une campagne par son ID
   */
  async getCampaignById(id: string): Promise<{ success: boolean; data: ProspectionCampaign }> {
    return apiClient.get(`${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/${id}`);
  },

  /**
   * Ajoute des prospects à une campagne
   */
  async addProspectsToCampaign(campaignId: string, prospectIds: string[]): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/${campaignId}/prospects`, { prospectIds });
  },

  /**
   * Lance une campagne
   */
  async launchCampaign(id: string): Promise<{ success: boolean; data: ProspectionCampaign; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/${id}/launch`);
  },

  /**
   * Récupère les statistiques d'une campagne
   */
  async getCampaignStats(id: string): Promise<{ success: boolean; data: { campaign: ProspectionCampaign; stats: any } }> {
    return apiClient.get(`${COMMERCIAL_SERVICE_URL}/api/prospects/campaigns/${id}/stats`);
  },

  // ==================== SÉQUENCES ====================

  /**
   * Récupère toutes les séquences
   */
  async getSequences(filters?: {
    isActive?: boolean;
  }): Promise<SequencesResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/sequences/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<SequencesResponse>(url);
  },

  /**
   * Crée une nouvelle séquence
   */
  async createSequence(data: CreateSequenceRequest): Promise<{ success: boolean; data: ProspectionSequence; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/sequences/create`, data);
  },

  /**
   * Récupère une séquence par son ID
   */
  async getSequenceById(id: string): Promise<{ success: boolean; data: ProspectionSequence }> {
    return apiClient.get(`${COMMERCIAL_SERVICE_URL}/api/prospects/sequences/${id}`);
  },

  /**
   * Assign un prospect à une séquence
   */
  async assignToSequence(prospectId: string, sequenceId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/${prospectId}/sequences/assign`, { sequenceId });
  },

  /**
   * Récupère les statistiques d'une séquence
   */
  async getSequenceStats(id: string): Promise<{ success: boolean; data: { sequence: ProspectionSequence; stats: any } }> {
    return apiClient.get(`${COMMERCIAL_SERVICE_URL}/api/prospects/sequences/${id}/stats`);
  },

  // ==================== OBJECTIFS ====================

  /**
   * Récupère tous les objectifs
   */
  async getTargets(filters?: {
    period?: string;
    userId?: string;
    teamId?: string;
    year?: number;
  }): Promise<TargetsResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.period) queryParams.append('period', filters.period);
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.teamId) queryParams.append('teamId', filters.teamId);
    if (filters?.year) queryParams.append('year', filters.year.toString());
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/targets/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<TargetsResponse>(url);
  },

  /**
   * Crée un nouvel objectif
   */
  async createTarget(data: CreateTargetRequest): Promise<{ success: boolean; data: SalesTarget; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/targets/create`, data);
  },

  /**
   * Met à jour un objectif
   */
  async updateTarget(id: string, data: Partial<CreateTargetRequest>): Promise<{ success: boolean; data: SalesTarget; message: string }> {
    return apiClient.put(`${COMMERCIAL_SERVICE_URL}/api/prospects/targets/${id}`, data);
  },

  // ==================== TEMPLATES ====================

  /**
   * Récupère tous les templates d'email
   */
  async getTemplates(filters?: {
    type?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; data: EmailTemplate[] }> {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/templates/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get(url);
  },

  /**
   * Crée un nouveau template
   */
  async createTemplate(data: {
    name: string;
    subject: string;
    content: string;
    type?: string;
    category?: string;
    variables?: string[];
  }): Promise<{ success: boolean; data: EmailTemplate; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/templates/create`, data);
  },

  // ==================== CONCURRENTS ====================

  /**
   * Récupère les concurrents d'un prospect
   */
  async getCompetitors(prospectId: string): Promise<{ success: boolean; data: any[] }> {
    return apiClient.get(`${COMMERCIAL_SERVICE_URL}/api/prospects/${prospectId}/competitors`);
  },

  /**
   * Ajoute un concurrent à un prospect
   */
  async addCompetitor(prospectId: string, data: {
    competitorName: string;
    competitorStrength?: string;
    competitorWeakness?: string;
    competitorPrice?: string;
    competitorStatus?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    return apiClient.post(`${COMMERCIAL_SERVICE_URL}/api/prospects/${prospectId}/competitors`, data);
  },

  // ==================== HISTORIQUE ====================

  /**
   * Récupère l'historique d'un prospect
   */
  async getHistory(prospectId: string, limit?: number): Promise<{ success: boolean; data: any[] }> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `${COMMERCIAL_SERVICE_URL}/api/prospects/${prospectId}/history${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get(url);
  }
};