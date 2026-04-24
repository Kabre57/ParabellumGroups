import { apiClient } from '../shared/client';
import {
  Prospect,
  ProspectionStats,
  CreateProspectRequest,
  UpdateProspectRequest,
  TerrainVisit,
  CreateTerrainVisitRequest,
  UpdateTerrainVisitRequest,
} from './types';

const normalizeStage = (value?: string): Prospect['stage'] => {
  switch (String(value || '').toUpperCase()) {
    case 'PREPARATION':
      return 'preparation';
    case 'RECHERCHE':
      return 'research';
    case 'CONTACT_INITIAL':
      return 'contact';
    case 'DECOUVERTE':
      return 'discovery';
    case 'PROPOSITION':
      return 'proposal';
    case 'NEGOCIATION':
      return 'negotiation';
    case 'GAGNE':
      return 'won';
    case 'PERDU':
      return 'lost';
    case 'MISE_EN_ATTENTE':
      return 'on_hold';
    default:
      return 'preparation';
  }
};

const normalizePriority = (value?: string): Prospect['priority'] => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'A' || normalized === 'B' || normalized === 'C' || normalized === 'D') {
    return normalized;
  }
  return 'C';
};

const normalizeProspect = (prospect: any): Prospect => ({
  ...prospect,
  sector: prospect?.sector || prospect?.secteurActivite || '',
  idu: prospect?.idu || prospect?.siret || '',
  ncc: prospect?.ncc || prospect?.tvaIntra || '',
  rccm: prospect?.rccm || '',
  codeActivite: prospect?.codeActivite || prospect?.codeNAF || '',
  address2: prospect?.address2 || '',
  address3: prospect?.address3 || '',
  region: prospect?.region || '',
  gpsCoordinates: prospect?.gpsCoordinates || prospect?.coordonneesGps || '',
  accessNotes: prospect?.accessNotes || prospect?.informationsAcces || '',
  priority: normalizePriority(prospect?.priority || prospect?.priorite),
  stage: normalizeStage(prospect?.stage),
  country: prospect?.country || "Cote d'Ivoire",
  tags: Array.isArray(prospect?.tags) ? prospect.tags : [],
});

export const commercialService = {
  async getProspects(params?: any): Promise<Prospect[]> {
    const response = await apiClient.get('/commercial', { params });
    const prospects = response.data?.data || response.data || [];
    return Array.isArray(prospects) ? prospects.map(normalizeProspect) : [];
  },

  async getProspectById(id: string): Promise<Prospect> {
    const response = await apiClient.get(`/commercial/${id}`);
    return normalizeProspect(response.data?.data || response.data);
  },

  async createProspect(data: CreateProspectRequest): Promise<Prospect> {
    const response = await apiClient.post('/commercial', data);
    return normalizeProspect(response.data?.data || response.data);
  },

  async updateProspect(id: string, data: UpdateProspectRequest): Promise<Prospect> {
    const response = await apiClient.put(`/commercial/${id}`, data);
    return normalizeProspect(response.data?.data || response.data);
  },

  async deleteProspect(id: string): Promise<void> {
    await apiClient.delete(`/commercial/${id}`);
  },

  async getStats(): Promise<ProspectionStats> {
    const response = await apiClient.get('/commercial/stats');
    return response.data?.data || response.data;
  },

  async getTerrainVisits(params?: Record<string, any>): Promise<TerrainVisit[]> {
    const response = await apiClient.get('/commercial/terrain/visits', { params });
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  },

  async createTerrainVisit(payload: CreateTerrainVisitRequest): Promise<TerrainVisit> {
    const response = await apiClient.post('/commercial/terrain/visits', payload);
    return response.data?.data || response.data;
  },

  async updateTerrainVisit(visitId: string, payload: UpdateTerrainVisitRequest): Promise<TerrainVisit> {
    const response = await apiClient.patch(`/commercial/terrain/visits/${visitId}`, payload);
    return response.data?.data || response.data;
  },
};
