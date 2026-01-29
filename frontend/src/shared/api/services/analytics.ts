// src/shared/api/services/analytics.ts
import { apiClient } from '../client';

// ==================== INTERFACES POUR DONNÉES RÉELLES ====================

export interface OverviewDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  active_missions: number;
  users: number;
  clients: number;
  monthly_revenue: number[];
  top_clients: Array<{ name: string; revenue: number }>;
  overdue_invoices: Array<{ client: string; amount: number; days: number }>;
  _source: string;
  _timestamp: string;
  _realData: boolean;
  _fallback?: boolean;
}

export interface FinancialDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
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
  factures: {
    total: number;
    payees: number;
    enAttente: number;
    enRetard: number;
    tauxRecouvrement: number;
  };
  devis: {
    total: number;
    convertis: number;
    tauxConversion: number;
  };
  tresorerie: {
    disponible: number;
    variation: number;
    joursCA: number;
  };
  revenue_trend: number[];
  expense_trend: number[];
  revenue_breakdown: {
    labels: string[];
    data: number[];
  };
  top_clients: Array<{
    name: string;
    revenue: number;
    invoices: number;
  }>;
  _source: string;
  _timestamp: string;
  _realData: boolean;
  _fallback?: boolean;
}

export interface TechnicalDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
  total_missions: number;
  ongoing_missions: number;
  completed_missions: number;
  planned_missions: number;
  total_technicians: number;
  available_technicians: number;
  on_mission_technicians: number;
  utilization_rate: number;
  total_equipment: number;
  low_stock_items: number;
  out_of_stock_items: number;
  maintenance_needed: number;
  upcoming_missions: Array<{
    client: string;
    type: string;
    date: string;
    technician: string;
  }>;
  missions_per_month: number[];
  _source: string;
  _timestamp: string;
  _realData: boolean;
  _fallback?: boolean;
}

export interface HRDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
  headcount: number;
  new_hires: number;
  departures: number;
  turnover_rate: number;
  total_payroll: number;
  average_salary: number;
  benefits: number;
  taxes: number;
  leave_stats: {
    taken: number[];
    remaining: number[];
  };
  department_breakdown: {
    labels: string[];
    data: number[];
  };
  _source: string;
  _timestamp: string;
  _realData: boolean;
  _fallback?: boolean;
}

export interface CustomerDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
  total_customers: number;
  active_customers: number;
  new_customers: number;
  churn_rate: number;
  customer_satisfaction: number;
  customer_growth: number[];
  customer_by_type: {
    labels: string[];
    data: number[];
  };
  top_customers: Array<{
    name: string;
    projects: number;
    revenue: number;
    satisfaction: number;
  }>;
  recent_customers: Array<{
    name: string;
    type: string;
    date: string;
    contact: string;
  }>;
  _source: string;
  _timestamp: string;
  _realData: boolean;
  _fallback?: boolean;
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
}

export interface Report {
  id: string;
  nom: string;
  description?: string;
  type: 'VENTES' | 'FINANCES' | 'RH' | 'PROJETS' | 'CUSTOM';
  format: 'PDF' | 'EXCEL' | 'CSV';
  frequence: 'QUOTIDIEN' | 'HEBDO' | 'MENSUEL' | 'ANNUEL';
  parametres: Record<string, any>;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  created_at: string;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

export interface Metric {
  key: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  nom: string;
  description?: string;
  userId: string;
  config: Record<string, any>;
  actif: boolean;
  parDefaut: boolean;
  createdAt: string;
  updatedAt: string;
  widgets: Widget[];
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: 'CHART' | 'TABLE' | 'KPI' | 'MAP';
  titre: string;
  config: Record<string, any>;
  position: Record<string, any>;
  refresh: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== SERVICE ANALYTICS AVEC DONNÉES RÉELLES ====================

export const analyticsService = {
  // ==================== DASHBOARDS ====================
  
  async getOverviewDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<OverviewDashboard> {
    const response = await apiClient.get('/analytics/dashboard/overview', { params });
    return response.data;
  },

  async getFinancialDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<FinancialDashboard> {
    const response = await apiClient.get('/analytics/dashboard/financial', { params });
    return response.data;
  },

  async getTechnicalDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<TechnicalDashboard> {
    const response = await apiClient.get('/analytics/dashboard/technical', { params });
    return response.data;
  },

  async getHRDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
    year?: number;
  }): Promise<HRDashboard> {
    const response = await apiClient.get('/analytics/dashboard/hr', { params });
    return response.data;
  },

  async getCustomerDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<CustomerDashboard> {
    const response = await apiClient.get('/analytics/dashboard/customer', { params });
    return response.data;
  },

  // ==================== KPIs ====================
  
  async getKPIs(params?: {
    categorie?: string;
    dateDebut?: string;
    dateFin?: string;
    period?: string;
  }): Promise<KPI[]> {
    const response = await apiClient.get('/analytics/kpis', { params });
    return response.data;
  },

  async createKPI(data: {
    nom: string;
    description?: string;
    categorie: string;
    valeur: number;
    cible?: number;
    unite?: string;
    tendance?: 'UP' | 'DOWN' | 'STABLE';
    variation?: number;
  }): Promise<KPI> {
    const response = await apiClient.post('/analytics/kpis', data);
    return response.data;
  },

  async updateKPI(id: string, data: Partial<KPI>): Promise<KPI> {
    const response = await apiClient.put(`/analytics/kpis/${id}`, data);
    return response.data;
  },

  async deleteKPI(id: string): Promise<void> {
    await apiClient.delete(`/analytics/kpis/${id}`);
  },

  async calculateKPI(data: {
    nom: string;
    categorie: string;
    parametres: Record<string, any>;
  }): Promise<KPI> {
    const response = await apiClient.post('/analytics/kpis/calculate', data);
    return response.data;
  },

  async compareKPI(id: string, params?: {
    compareToId?: string;
  }): Promise<{
    current: KPI;
    compare: KPI;
    difference: number;
    pourcentage: number;
    amelioration: boolean;
  }> {
    const response = await apiClient.get(`/analytics/kpis/${id}/compare`, { params });
    return response.data;
  },

  async getKPITrend(params: {
    nom: string;
    categorie: string;
    periode?: number;
  }): Promise<{
    nom: string;
    categorie: string;
    periode: number;
    dataPoints: Array<{
      date: string;
      valeur: number;
      cible?: number;
      variation?: number;
    }>;
    moyenne: number;
    min: number;
    max: number;
    tendanceGlobale: 'UP' | 'DOWN' | 'STABLE';
  }> {
    const response = await apiClient.get('/analytics/kpis/trend', { params });
    return response.data;
  },

  // ==================== RAPPORTS ====================
  
  async getReports(params?: {
    type?: string;
    actif?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Report[]> {
    const response = await apiClient.get('/analytics/rapports', { params });
    return response.data;
  },

  async getReportById(id: string): Promise<Report> {
    const response = await apiClient.get(`/analytics/rapports/${id}`);
    return response.data;
  },

  async createReport(data: {
    nom: string;
    description?: string;
    type: 'VENTES' | 'FINANCES' | 'RH' | 'PROJETS' | 'CUSTOM';
    format: 'PDF' | 'EXCEL' | 'CSV';
    frequence: 'QUOTIDIEN' | 'HEBDO' | 'MENSUEL' | 'ANNUEL';
    parametres?: Record<string, any>;
    actif?: boolean;
  }): Promise<Report> {
    const response = await apiClient.post('/analytics/rapports', data);
    return response.data;
  },

  async updateReport(id: string, data: Partial<Report>): Promise<Report> {
    const response = await apiClient.put(`/analytics/rapports/${id}`, data);
    return response.data;
  },

  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/analytics/rapports/${id}`);
  },

  async executeReport(id: string): Promise<{
    id: string;
    rapportId: string;
    dateExecution: string;
    statut: 'RUNNING' | 'COMPLETED' | 'FAILED';
    fichier?: string;
    erreur?: string;
    duree?: number;
  }> {
    const response = await apiClient.post(`/analytics/rapports/${id}/execute`);
    return response.data;
  },

  async scheduleReport(id: string): Promise<{
    message: string;
    frequence: string;
  }> {
    const response = await apiClient.post(`/analytics/rapports/${id}/schedule`);
    return response.data;
  },

  async getReportHistory(id: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    executions: Array<{
      id: string;
      dateExecution: string;
      statut: 'RUNNING' | 'COMPLETED' | 'FAILED';
      fichier?: string;
      erreur?: string;
      duree?: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await apiClient.get(`/analytics/rapports/${id}/history`, { params });
    return response.data;
  },

  async downloadReport(id: string, executionId: string): Promise<{
    message: string;
    fichier: string;
    url: string;
  }> {
    const response = await apiClient.get(`/analytics/rapports/${id}/executions/${executionId}/download`);
    return response.data;
  },

  // ==================== ALERTES ====================
  
  async getAlerts(params?: {
    severity?: string;
    acknowledged?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Alert[]> {
    const response = await apiClient.get('/analytics/alerts', { params });
    return response.data;
  },

  async acknowledgeAlert(id: string): Promise<void> {
    await apiClient.post(`/analytics/alerts/${id}/acknowledge`);
  },

  // ==================== METRIQUES ====================
  
  async getMetrics(keys: string[]): Promise<Metric[]> {
    const response = await apiClient.get('/analytics/metrics', {
      params: { keys: keys.join(',') }
    });
    return response.data;
  },

  // ==================== DASHBOARDS PERSONNALISÉS ====================
  
  async getDashboards(params?: {
    actif?: boolean;
  }): Promise<Dashboard[]> {
    const response = await apiClient.get('/analytics/dashboards', { params });
    return response.data;
  },

  async getDashboardById(id: string): Promise<Dashboard> {
    const response = await apiClient.get(`/analytics/dashboards/${id}`);
    return response.data;
  },

  async getDashboardData(id: string): Promise<Dashboard> {
    const response = await apiClient.get(`/analytics/dashboards/${id}/data`);
    return response.data;
  },

  async createDashboard(data: {
    nom: string;
    description?: string;
    config?: Record<string, any>;
    actif?: boolean;
    parDefaut?: boolean;
  }): Promise<Dashboard> {
    const response = await apiClient.post('/analytics/dashboards', data);
    return response.data;
  },

  async updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
    const response = await apiClient.put(`/analytics/dashboards/${id}`, data);
    return response.data;
  },

  async deleteDashboard(id: string): Promise<void> {
    await apiClient.delete(`/analytics/dashboards/${id}`);
  },

  async duplicateDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.post(`/analytics/dashboards/${id}/duplicate`);
    return response.data;
  },

  async setDefaultDashboard(id: string): Promise<Dashboard> {
    const response = await apiClient.put(`/analytics/dashboards/${id}/set-default`);
    return response.data;
  },

  // ==================== WIDGETS ====================
  
  async getWidgets(params: {
    dashboardId: string;
  }): Promise<Widget[]> {
    const response = await apiClient.get('/analytics/widgets', { params });
    return response.data;
  },

  async getWidgetById(id: string): Promise<Widget> {
    const response = await apiClient.get(`/analytics/widgets/${id}`);
    return response.data;
  },

  async getWidgetData(id: string): Promise<{
    widget: Widget;
    data: any;
  }> {
    const response = await apiClient.get(`/analytics/widgets/${id}/data`);
    return response.data;
  },

  async createWidget(data: {
    dashboardId: string;
    type: 'CHART' | 'TABLE' | 'KPI' | 'MAP';
    titre: string;
    config?: Record<string, any>;
    position?: Record<string, any>;
    refresh?: number;
  }): Promise<Widget> {
    const response = await apiClient.post('/analytics/widgets', data);
    return response.data;
  },

  async updateWidget(id: string, data: Partial<Widget>): Promise<Widget> {
    const response = await apiClient.put(`/analytics/widgets/${id}`, data);
    return response.data;
  },

  async deleteWidget(id: string): Promise<void> {
    await apiClient.delete(`/analytics/widgets/${id}`);
  },

  async updateWidgetPosition(id: string, position: Record<string, any>): Promise<Widget> {
    const response = await apiClient.put(`/analytics/widgets/${id}/position`, { position });
    return response.data;
  },

  async refreshWidget(id: string): Promise<{
    widget: Widget;
    data: any;
    refreshedAt: string;
  }> {
    const response = await apiClient.post(`/analytics/widgets/${id}/refresh`);
    return response.data;
  },

  // ==================== ANALYTICS SPÉCIFIQUES ====================
  
  async getSalesStats(params?: {
    dateDebut?: string;
    dateFin?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    periode: { dateDebut: string; dateFin: string };
    chiffreAffaires: { total: number; variation: number; tendance: string };
    nombreVentes: { total: number; variation: number; tendance: string };
    panierMoyen: { valeur: number; variation: number; tendance: string };
    tauxConversion: { valeur: number; variation: number; tendance: string };
    topProduits: Array<{ id: number; nom: string; ventes: number; ca: number }>;
    ventesParCanal: { web: number; magasin: number; telephone: number };
    evolutionTemporelle: Array<{ date: string; valeur: number }>;
    _source: string;
    _timestamp: string;
  }> {
    const response = await apiClient.get('/analytics/sales', { params });
    return response.data;
  },

  async getProjectStats(params?: {
    dateDebut?: string;
    dateFin?: string;
    statut?: string;
  }): Promise<{
    periode: { dateDebut: string; dateFin: string };
    nombreProjets: { total: number; enCours: number; termines: number; enRetard: number };
    tauxReussite: { valeur: number; variation: number; tendance: string };
    budgetTotal: { alloue: number; consomme: number; taux: number };
    tempsTotal: { estime: number; realise: number; efficacite: number };
    projetsCritiques: Array<{ id: number; nom: string; retard: number; risque: string }>;
    ressourcesUtilisation: { developpeurs: number; designers: number; chefsProjets: number };
    _source: string;
    _timestamp: string;
  }> {
    const response = await apiClient.get('/analytics/projects', { params });
    return response.data;
  },

  async getHRStats(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<{
    periode: { dateDebut: string; dateFin: string };
    effectifs: { total: number; cdi: number; cdd: number; stagiaires: number };
    turnover: { taux: number; entrees: number; sorties: number; variation: number };
    absences: { tauxAbsenteisme: number; conges: number; maladies: number; autres: number };
    formations: { nombre: number; heures: number; budget: number; tauxParticipation: number };
    satisfaction: { score: number; variation: number; tauxReponse: number };
    recrutement: { postesOuverts: number; candidatures: number; entretiens: number; embauches: number };
    _source: string;
    _timestamp: string;
  }> {
    const response = await apiClient.get('/analytics/hr', { params });
    return response.data;
  },

  async getFinanceStats(params?: {
    dateDebut?: string;
    dateFin?: string;
    type?: string;
  }): Promise<{
    periode: { dateDebut: string; dateFin: string };
    revenus: { total: number; variation: number; tendance: string };
    depenses: { total: number; variation: number; tendance: string };
    resultat: { net: number; marge: number; variation: number };
    tresorerie: { disponible: number; variation: number; joursCA: number };
    comptesClients: { encours: number; enRetard: number; tauxRecouvrement: number };
    comptesFournisseurs: { encours: number; enRetard: number; delaiMoyen: number };
    budgetVsReel: {
      revenus: { budget: number; reel: number; ecart: number };
      depenses: { budget: number; reel: number; ecart: number };
    };
    _source: string;
    _timestamp: string;
  }> {
    const response = await apiClient.get('/analytics/finance', { params });
    return response.data;
  }
};