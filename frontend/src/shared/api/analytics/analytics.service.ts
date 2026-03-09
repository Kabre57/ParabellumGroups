import { apiClient } from '../shared/client';
import { OverviewDashboard, FinancialDashboardResponse, TechnicalDashboard, HRDashboard } from './types';

export interface SalesStats {
  chiffreAffaires: {
    total: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  nombreVentes: {
    total: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  panierMoyen: {
    valeur: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  tauxConversion: {
    valeur: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  topProduits: { id: number; nom: string; ventes: number; ca: number }[];
  ventesParCanal: Record<string, number>;
  evolutionTemporelle: { date: string; valeur: number }[];
}

export interface ProjectsStats {
  periode: { dateDebut: string; dateFin: string };
  nombreProjets: {
    total: number;
    enCours: number;
    termines: number;
    enRetard: number;
  };
  tauxReussite: {
    valeur: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  budgetTotal: {
    alloue: number;
    consomme: number;
    taux: number;
  };
  tempsTotal: {
    estime: number;
    realise: number;
    efficacite: number;
  };
  projetsCritiques: { id: number; nom: string; retard: number; risque: string }[];
  ressourcesUtilisation: Record<string, number>;
}

export interface HRStats {
  periode: { dateDebut: string; dateFin: string };
  effectifs: {
    total: number;
    cdi: number;
    cdd: number;
    stagiaires: number;
  };
  turnover: {
    taux: number;
    entrees: number;
    sorties: number;
    variation: number;
  };
  absences: {
    tauxAbsenteisme: number;
    conges: number;
    maladies: number;
    autres: number;
  };
  formations: {
    nombre: number;
    heures: number;
    budget: number;
    tauxParticipation: number;
  };
  satisfaction: {
    score: number;
    variation: number;
    tauxReponse: number;
  };
  recrutement: {
    postesOuverts: number;
    candidatures: number;
    entretiens: number;
    embauches: number;
  };
}

export interface FinanceStats {
  periode: { dateDebut: string; dateFin: string };
  revenus: {
    total: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  depenses: {
    total: number;
    variation: number;
    tendance: 'UP' | 'DOWN' | 'STABLE';
  };
  resultat: {
    net: number;
    marge: number;
    variation: number;
  };
  tresorerie: {
    disponible: number;
    variation: number;
    joursCA: number;
  };
  comptesClients: {
    encours: number;
    enRetard: number;
    tauxRecouvrement: number;
  };
  comptesFournisseurs: {
    encours: number;
    enRetard: number;
    delaiMoyen: number;
  };
  budgetVsReel: {
    revenus: { budget: number; reel: number; ecart: number };
    depenses: { budget: number; reel: number; ecart: number };
  };
}

export interface KPI {
  id: string;
  nom: string;
  description?: string;
  categorie: string;
  valeur: number;
  cible?: number;
  unite?: string;
  dateCalcul: string;
  tendance: 'UP' | 'DOWN' | 'STABLE';
  variation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  nom: string;
  description?: string;
  userId: string;
  config: Record<string, unknown>;
  actif: boolean;
  parDefaut: boolean;
  createdAt: string;
  updatedAt: string;
  widgets?: Widget[];
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: 'CHART' | 'TABLE' | 'KPI' | 'MAP';
  titre: string;
  config: Record<string, unknown>;
  position: Record<string, unknown>;
  refresh: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: Record<string, unknown>;
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const analyticsService = {
  // --- Analytics Stats ---
  async getOverviewDashboard(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: OverviewDashboard }> {
    const response = await apiClient.get('/analytics/overview', { params });
    return response.data;
  },

  async getSalesStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<SalesStats> {
    const response = await apiClient.get('/analytics/sales', { params });
    return response.data;
  },

  async getProjectsStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<ProjectsStats> {
    const response = await apiClient.get('/analytics/projects', { params });
    return response.data;
  },

  async getHRStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<HRStats> {
    const response = await apiClient.get('/analytics/hr', { params });
    return response.data;
  },

  async getFinanceStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<FinanceStats> {
    const response = await apiClient.get('/analytics/finance', { params });
    return response.data;
  },

  // --- Dashboards ---
  async getDashboards(): Promise<Dashboard[]> {
    const response = await apiClient.get('/dashboards');
    return response.data;
  },

  async getDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.get(`/dashboards/${id}`);
    return response.data;
  },

  async getDashboardData(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`/dashboards/${id}/data`);
    return response.data;
  },

  async createDashboard(data: { nom: string; description?: string }): Promise<Dashboard> {
    const response = await apiClient.post('/dashboards', data);
    return response.data;
  },

  async updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
    const response = await apiClient.put(`/dashboards/${id}`, data);
    return response.data;
  },

  async deleteDashboard(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/dashboards/${id}`);
    return response.data;
  },

  async setDefaultDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.put(`/dashboards/${id}/set-default`);
    return response.data;
  },

  async duplicateDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.post(`/dashboards/${id}/duplicate`);
    return response.data;
  },

  // --- KPIs ---
  async getKPIs(): Promise<KPI[]> {
    const response = await apiClient.get('/kpis');
    return response.data;
  },

  async getKPI(id: string): Promise<KPI> {
    const response = await apiClient.get(`/kpis/${id}`);
    return response.data;
  },

  async calculateKPI(data: { type: string; params: Record<string, unknown> }): Promise<KPI> {
    const response = await apiClient.post('/kpis/calculate', data);
    return response.data;
  },

  async getKPITrend(params?: { id: string }): Promise<any> {
    const response = await apiClient.get('/kpis/trend', { params });
    return response.data;
  },

  // --- Widgets ---
  async getWidgets(): Promise<Widget[]> {
    const response = await apiClient.get('/widgets');
    return response.data;
  },

  async getWidget(id: string): Promise<Widget> {
    const response = await apiClient.get(`/widgets/${id}`);
    return response.data;
  },

  async createWidget(data: { dashboardId: string; type: string; titre: string; config: Record<string, unknown> }): Promise<Widget> {
    const response = await apiClient.post('/widgets', data);
    return response.data;
  },

  async updateWidget(id: string, data: Partial<Widget>): Promise<Widget> {
    const response = await apiClient.put(`/widgets/${id}`, data);
    return response.data;
  },

  async updateWidgetPosition(id: string, position: Record<string, unknown>): Promise<Widget> {
    const response = await apiClient.put(`/widgets/${id}/position`, { position });
    return response.data;
  },

  async deleteWidget(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/widgets/${id}`);
    return response.data;
  },

  async getWidgetData(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`/widgets/${id}/data`);
    return response.data;
  },

  async refreshWidget(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.post(`/widgets/${id}/refresh`);
    return response.data;
  },
};

export * from './types';