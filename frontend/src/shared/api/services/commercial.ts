/**
 * Commercial API service - prospects workflow
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
  ProspectStage,
  ProspectPriority,
  ProspectActivityType,
} from '../types';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: Pagination;
  message?: string;
}

interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface GetProspectsParams {
  page?: number;
  limit?: number;
  stage?: ProspectStage;
  assignedToId?: string;
  priority?: ProspectPriority;
  search?: string;
  isConverted?: boolean;
  sector?: string;
  source?: string;
  country?: string;
  scoreMin?: number;
  scoreMax?: number;
}

const basePath = '/commercial';

const mapStageFromApi = (value?: string): ProspectStage => {
  switch ((value || '').toUpperCase()) {
    case 'PREPARATION':
      return 'preparation';
    case 'RECHERCHE':
      return 'research';
    case 'CONTACT_INITIAL':
    case 'CONTACT':
      return 'contact';
    case 'DECOUVERTE':
      return 'discovery';
    case 'PROPOSITION':
    case 'NEGOCIATION':
      return 'proposal';
    case 'GAGNE':
      return 'won';
    case 'PERDU':
    case 'MISE_EN_ATTENTE':
      return 'lost';
    default:
      return 'preparation';
  }
};

const mapStageToApi = (value?: ProspectStage): string | undefined => {
  if (!value) return undefined;
  switch (value) {
    case 'preparation':
      return 'PREPARATION';
    case 'research':
      return 'RECHERCHE';
    case 'contact':
      return 'CONTACT_INITIAL';
    case 'discovery':
      return 'DECOUVERTE';
    case 'proposal':
      return 'PROPOSITION';
    case 'won':
      return 'GAGNE';
    case 'lost':
      return 'PERDU';
    default:
      return value.toUpperCase();
  }
};

const mapPriorityFromApi = (value?: string): ProspectPriority => {
  switch ((value || '').toUpperCase()) {
    case 'A':
      return 'A';
    case 'B':
      return 'B';
    case 'C':
    case 'D':
      return 'C';
    default:
      return 'C';
  }
};

const mapPriorityToApi = (value?: ProspectPriority): string | undefined => {
  if (!value) return undefined;
  return value.toUpperCase();
};

const mapActivityTypeFromApi = (value?: string): ProspectActivityType => {
  switch ((value || '').toUpperCase()) {
    case 'APPEL':
      return 'call';
    case 'EMAIL':
      return 'email';
    case 'REUNION':
    case 'VISITE':
    case 'DEMONSTRATION':
    case 'PRESENTATION':
      return 'meeting';
    case 'PROPOSITION':
    case 'SUIVI':
    case 'RELANCE':
      return 'task';
    default:
      return 'note';
  }
};

const mapActivityTypeToApi = (value: ProspectActivityType): string => {
  switch (value) {
    case 'call':
      return 'APPEL';
    case 'email':
      return 'EMAIL';
    case 'meeting':
      return 'REUNION';
    case 'task':
      return 'SUIVI';
    case 'conversion':
      return 'PROPOSITION';
    case 'note':
    default:
      return 'NOTE';
  }
};

const mapProspect = (raw: any): Prospect => {
  return {
    id: raw.id,
    companyName: raw.companyName ?? '',
    contactName: raw.contactName ?? '',
    position: raw.position ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.phone ?? undefined,
    website: raw.website ?? undefined,
    sector: raw.secteurActivite ?? raw.sector ?? undefined,
    employees: raw.employees ?? undefined,
    revenue: raw.revenue ?? undefined,
    address: raw.address ?? undefined,
    city: raw.city ?? undefined,
    postalCode: raw.postalCode ?? undefined,
    country: raw.country ?? 'cote d\'ivoire',
    stage: mapStageFromApi(raw.stage),
    priority: mapPriorityFromApi(raw.priorite ?? raw.priority),
    score: raw.score ?? 0,
    source: raw.source ?? undefined,
    assignedToId: raw.assignedToId ?? undefined,
    potentialValue: raw.potentialValue ?? undefined,
    closingProbability: raw.closingProbability ?? undefined,
    estimatedCloseDate: raw.estimatedCloseDate ?? undefined,
    notes: raw.notes ?? undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    isConverted: !!raw.isConverted,
    convertedAt: raw.convertedAt ?? undefined,
    customerId: raw.customerId ?? undefined,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    activities: Array.isArray(raw.activities)
      ? raw.activities.map(mapProspectActivity)
      : undefined,
  };
};

const mapProspectActivity = (raw: any): ProspectActivity => {
  return {
    id: raw.id,
    prospectId: raw.prospectId ?? raw.prospect_id ?? '',
    type: mapActivityTypeFromApi(raw.type),
    subject: raw.subject ?? raw.title ?? '',
    description: raw.description ?? undefined,
    outcome: raw.outcome ?? undefined,
    scheduledAt: raw.scheduledAt ?? undefined,
    completedAt: raw.completedAt ?? undefined,
    duration: raw.duration ?? undefined,
    createdById: raw.createdById ?? raw.created_by_id ?? '',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    prospect: undefined,
    creator: raw.creator ?? undefined,
  };
};

const mapStats = (raw: any): ProspectionStats => {
  const baseStages: Record<ProspectStage, number> = {
    preparation: 0,
    research: 0,
    contact: 0,
    discovery: 0,
    proposal: 0,
    won: 0,
    lost: 0,
  };
  const basePriorities: Record<ProspectPriority, number> = {
    A: 0,
    B: 0,
    C: 0,
  };

  if (raw?.byStage) {
    Object.entries(raw.byStage).forEach(([key, value]) => {
      const stage = mapStageFromApi(key);
      baseStages[stage] = Number(value) || 0;
    });
  }

  if (raw?.byPriority) {
    Object.entries(raw.byPriority).forEach(([key, value]) => {
      const priority = mapPriorityFromApi(key);
      basePriorities[priority] = (basePriorities[priority] || 0) + (Number(value) || 0);
    });
  }

  return {
    totalProspects: raw?.totalProspects ?? 0,
    convertedProspects: raw?.convertedProspects ?? 0,
    conversionRate: raw?.conversionRate ?? 0,
    recentActivities: raw?.recentActivities ?? 0,
    byStage: baseStages,
    byPriority: basePriorities,
  };
};

const mapProspectPayload = (data: CreateProspectRequest | UpdateProspectRequest) => {
  const { stage, priority, sector, ...rest } = data;
  return {
    ...rest,
    stage: mapStageToApi(stage as ProspectStage),
    priorite: mapPriorityToApi(priority as ProspectPriority),
    secteurActivite: sector,
  };
};

export const commercialService = {
  // ==================== PROSPECTS ====================
  async getProspects(params?: GetProspectsParams): Promise<ListResponse<Prospect>> {
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
    if (params?.scoreMin !== undefined) queryParams.append('scoreMin', params.scoreMin.toString());
    if (params?.scoreMax !== undefined) queryParams.append('scoreMax', params.scoreMax.toString());

    const url = `${basePath}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    const payload = response.data as ListResponse<any>;

    return {
      ...payload,
      data: Array.isArray(payload.data) ? payload.data.map(mapProspect) : [],
    };
  },

  async getProspectById(id: string): Promise<DetailResponse<Prospect>> {
    const response = await apiClient.get(`${basePath}/${id}`);
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspect(payload.data),
    };
  },

  async createProspect(data: CreateProspectRequest): Promise<DetailResponse<Prospect>> {
    const response = await apiClient.post(`${basePath}`, mapProspectPayload(data));
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspect(payload.data),
    };
  },

  async updateProspect(id: string, data: UpdateProspectRequest): Promise<DetailResponse<Prospect>> {
    const response = await apiClient.put(`${basePath}/${id}`, mapProspectPayload(data));
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspect(payload.data),
    };
  },

  async deleteProspect(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`${basePath}/${id}`);
    return response.data;
  },

  async moveProspect(id: string, data: MoveProspectRequest): Promise<DetailResponse<Prospect>> {
    const response = await apiClient.post(`${basePath}/${id}/move`, {
      stage: mapStageToApi(data.stage) || data.stage,
      notes: data.notes,
    });
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspect(payload.data),
    };
  },

  async convertProspect(id: string, data?: Partial<ConvertProspectRequest>): Promise<DetailResponse<Prospect>> {
    const response = await apiClient.post(`${basePath}/${id}/convert`, data || {});
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspect(payload.data),
    };
  },

  // ==================== ACTIVITES ====================
  async getProspectActivities(
    id: string,
    filters?: {
      type?: string;
      completed?: boolean;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ListResponse<ProspectActivity>> {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.completed !== undefined) queryParams.append('completed', filters.completed.toString());
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const url = `${basePath}/${id}/activities${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    const payload = response.data as ListResponse<any>;

    return {
      ...payload,
      data: Array.isArray(payload.data) ? payload.data.map(mapProspectActivity) : [],
    };
  },

  async addProspectActivity(
    id: string,
    data: CreateProspectActivityRequest
  ): Promise<DetailResponse<ProspectActivity>> {
    const response = await apiClient.post(`${basePath}/${id}/activities`, {
      ...data,
      type: mapActivityTypeToApi(data.type),
    });
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspectActivity(payload.data),
    };
  },

  async updateProspectActivity(
    prospectId: string,
    activityId: string,
    data: Partial<CreateProspectActivityRequest>
  ): Promise<DetailResponse<ProspectActivity>> {
    const response = await apiClient.put(`${basePath}/${prospectId}/activities/${activityId}`, {
      ...data,
      type: data.type ? mapActivityTypeToApi(data.type) : undefined,
    });
    const payload = response.data as DetailResponse<any>;
    return {
      ...payload,
      data: mapProspectActivity(payload.data),
    };
  },

  // ==================== DOCUMENTS ====================
  async getProspectDocuments(id: string, type?: string): Promise<DetailResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);

    const url = `${basePath}/${id}/documents${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async uploadProspectDocument(id: string, data: FormData): Promise<DetailResponse<any>> {
    const response = await apiClient.post(`${basePath}/${id}/documents`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ==================== STATISTIQUES ====================
  async getStats(filters?: {
    period?: string;
    userId?: string;
    teamId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DetailResponse<ProspectionStats>> {
    const queryParams = new URLSearchParams();
    if (filters?.period) queryParams.append('period', filters.period);
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.teamId) queryParams.append('teamId', filters.teamId);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const url = `${basePath}/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    const payload = response.data as DetailResponse<any>;

    return {
      ...payload,
      data: mapStats(payload.data),
    };
  },

  // ==================== CAMPAGNES / SEQUENCES / TARGETS ====================
  async getCampaigns(filters?: { status?: string; type?: string }): Promise<DetailResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.type) queryParams.append('type', filters.type);

    const url = `${basePath}/campaigns/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async createCampaign(data: any): Promise<DetailResponse<any>> {
    const response = await apiClient.post(`${basePath}/campaigns/create`, data);
    return response.data;
  },

  async getSequences(filters?: { isActive?: boolean }): Promise<DetailResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

    const url = `${basePath}/sequences/all${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async createSequence(data: any): Promise<DetailResponse<any>> {
    const response = await apiClient.post(`${basePath}/sequences/create`, data);
    return response.data;
  },

  async getTargets(): Promise<DetailResponse<any[]>> {
    const response = await apiClient.get(`${basePath}/targets/all`);
    return response.data;
  },

  async updateTarget(id: string, data: any): Promise<DetailResponse<any>> {
    const response = await apiClient.put(`${basePath}/targets/${id}`, data);
    return response.data;
  },

  async getTemplates(): Promise<DetailResponse<any[]>> {
    const response = await apiClient.get(`${basePath}/templates/all`);
    return response.data;
  },

  async createTemplate(data: any): Promise<DetailResponse<any>> {
    const response = await apiClient.post(`${basePath}/templates/create`, data);
    return response.data;
  },
};

export default commercialService;
