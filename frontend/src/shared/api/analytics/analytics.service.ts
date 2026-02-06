import { apiClient } from '../shared/client';
import { OverviewDashboard, FinancialDashboardResponse, TechnicalDashboard, HRDashboard } from './types';

export interface SalesStats {
  chiffreAffaires: number;
  chiffreAffairesMoisPrecedent: number;
  evolution: number;
  objectif?: number;
  tauxRealisation?: number;
  parMois: { mois: string; montant: number }[];
  parClient: { clientId: string; nom: string; montant: number }[];
}

export interface ProjectsStats {
  totalProjets: number;
  projetsEnCours: number;
  projetsTermines: number;
  projetsSuspendus: number;
  budgetTotal: number;
  budgetConsomme: number;
  tauxCompletion: number;
  parStatus: Record<string, number>;
}

export interface HRStats {
  totalEmployes: number;
  employesActifs: number;
  nouveauxCeMois: number;
  departsCeMois: number;
  congesEnCours: number;
  congesEnAttente: number;
  parDepartement: Record<string, number>;
  masseSalariale: number;
}

export interface FinanceStats {
  chiffreAffaires: number;
  facturesEnAttente: number;
  facturesEnRetard: number;
  montantEnAttente: number;
  montantEnRetard: number;
  tresorerie: number;
  charges: number;
  benefice: number;
}

export interface KPI {
  id: string;
  nom: string;
  valeur: number;
  unite?: string;
  objectif?: number;
  evolution?: number;
  periode: string;
  categorie: string;
}

export interface Dashboard {
  id: string;
  nom: string;
  description?: string;
  isDefault: boolean;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: 'KPI' | 'CHART' | 'TABLE' | 'LIST';
  titre: string;
  configuration: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  createdAt: string;
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
  async getOverviewDashboard(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: OverviewDashboard }> {
    const response = await apiClient.get('/analytics/overview', { params });
    return response.data;
  },

  async getSalesStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: SalesStats }> {
    const response = await apiClient.get('/analytics/sales', { params });
    return response.data;
  },

  async getProjectsStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: ProjectsStats }> {
    const response = await apiClient.get('/analytics/projects', { params });
    return response.data;
  },

  async getHRStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: HRStats }> {
    const response = await apiClient.get('/analytics/hr', { params });
    return response.data;
  },

  async getFinanceStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: FinanceStats }> {
    const response = await apiClient.get('/analytics/finance', { params });
    return response.data;
  },

  async getFinancialDashboard(params?: { period?: string }): Promise<FinancialDashboardResponse> {
    const response = await apiClient.get('/analytics/finance', { params });
    return {
      data: response.data,
      source: 'analytics/finance',
      timestamp: new Date().toISOString(),
    };
  },

  async getTechnicalDashboard(params?: { period?: string }): Promise<{ success: boolean; data: TechnicalDashboard }> {
    const response = await apiClient.get('/analytics/projects', { params });
    return response.data;
  },

  async getHRDashboard(params?: { period?: string }): Promise<{ success: boolean; data: HRDashboard }> {
    const response = await apiClient.get('/analytics/hr', { params });
    return response.data;
  },

  async getDashboards(): Promise<ListResponse<Dashboard>> {
    const response = await apiClient.get('/analytics/dashboards');
    return response.data;
  },

  async getDashboard(id: string): Promise<DetailResponse<Dashboard>> {
    const response = await apiClient.get(`/analytics/dashboards/${id}`);
    return response.data;
  },

  async getDashboardData(id: string): Promise<DetailResponse<Record<string, unknown>>> {
    const response = await apiClient.get(`/analytics/dashboards/${id}/data`);
    return response.data;
  },

  async createDashboard(data: { nom: string; description?: string }): Promise<DetailResponse<Dashboard>> {
    const response = await apiClient.post('/analytics/dashboards', data);
    return response.data;
  },

  async updateDashboard(id: string, data: Partial<Dashboard>): Promise<DetailResponse<Dashboard>> {
    const response = await apiClient.put(`/analytics/dashboards/${id}`, data);
    return response.data;
  },

  async deleteDashboard(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/analytics/dashboards/${id}`);
    return response.data;
  },

  async setDefaultDashboard(id: string): Promise<DetailResponse<Dashboard>> {
    const response = await apiClient.put(`/analytics/dashboards/${id}/set-default`);
    return response.data;
  },

  async getKPIs(params?: { categorie?: string }): Promise<ListResponse<KPI>> {
    const response = await apiClient.get('/analytics/kpis', { params });
    return response.data;
  },

  async getKPI(id: string): Promise<DetailResponse<KPI>> {
    const response = await apiClient.get(`/analytics/kpis/${id}`);
    return response.data;
  },

  async getKPITrend(params?: { ids?: string[]; period?: string }): Promise<{ success: boolean; data: Record<string, { date: string; valeur: number }[]> }> {
    const response = await apiClient.get('/analytics/kpis/trend', { params });
    return response.data;
  },

  async calculateKPI(data: { type: string; params: Record<string, unknown> }): Promise<DetailResponse<KPI>> {
    const response = await apiClient.post('/analytics/kpis/calculate', data);
    return response.data;
  },

  async getWidgets(dashboardId?: string): Promise<ListResponse<Widget>> {
    const response = await apiClient.get('/analytics/widgets', { params: { dashboardId } });
    return response.data;
  },

  async getWidgetData(id: string): Promise<DetailResponse<Record<string, unknown>>> {
    const response = await apiClient.get(`/analytics/widgets/${id}/data`);
    return response.data;
  },

  async createWidget(data: { dashboardId: string; type: string; titre: string; configuration: Record<string, unknown> }): Promise<DetailResponse<Widget>> {
    const response = await apiClient.post('/analytics/widgets', data);
    return response.data;
  },

  async updateWidget(id: string, data: Partial<Widget>): Promise<DetailResponse<Widget>> {
    const response = await apiClient.put(`/analytics/widgets/${id}`, data);
    return response.data;
  },

  async updateWidgetPosition(id: string, position: { x: number; y: number; w: number; h: number }): Promise<DetailResponse<Widget>> {
    const response = await apiClient.put(`/analytics/widgets/${id}/position`, position);
    return response.data;
  },

  async deleteWidget(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/analytics/widgets/${id}`);
    return response.data;
  },

  async refreshWidget(id: string): Promise<DetailResponse<Record<string, unknown>>> {
    const response = await apiClient.post(`/analytics/widgets/${id}/refresh`);
    return response.data;
  },
};

export * from './types';
