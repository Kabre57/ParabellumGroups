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
  evolutionTemporelle?: Array<{
    date: string;
    valeur?: number;
    value?: number;
  }>;
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

export interface FinancialDashboardResponse {
  data: FinancialDashboard;
  source: string;
  timestamp: string;
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
  total_loans?: number;
  active_loans?: number;
  total_loan_amount?: number;
  remaining_loan_amount?: number;
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
    try {
      const [financeRes, projectRes, hrRes, salesRes] = await Promise.allSettled([
        apiClient.get('/analytics/finance', { params }),
        apiClient.get('/analytics/projects', { params }),
        apiClient.get('/analytics/hr', { params }),
        apiClient.get('/analytics/sales', { params: { ...params, groupBy: 'month' } }),
      ]);

      const finance = financeRes.status === 'fulfilled' ? financeRes.value.data : undefined;
      const projects = projectRes.status === 'fulfilled' ? projectRes.value.data : undefined;
      const hr = hrRes.status === 'fulfilled' ? hrRes.value.data : undefined;
      const sales = salesRes.status === 'fulfilled' ? salesRes.value.data : undefined;

      const monthlyRevenue = sales?.evolutionTemporelle?.map((item: any) => item.valeur) || undefined;

      const dashboard: any = {
        periode: {
          dateDebut: params?.dateDebut || finance?.periode?.dateDebut || sales?.periode?.dateDebut || '',
          dateFin: params?.dateFin || finance?.periode?.dateFin || sales?.periode?.dateFin || '',
        },
        revenue: finance?.revenus?.total || sales?.chiffreAffaires?.total || undefined,
        expenses: finance?.depenses?.total || undefined,
        profit: finance?.resultat?.net || undefined,
        margin: finance?.resultat?.marge || undefined,
        active_missions: projects?.nombreProjets?.enCours || undefined,
        users: hr?.effectifs?.total || undefined,
        clients: undefined,
        monthly_revenue: monthlyRevenue && monthlyRevenue.length ? monthlyRevenue : undefined,
        top_clients: undefined,
        overdue_invoices: undefined,
        _source: 'analytics',
        _timestamp: new Date().toISOString(),
        _realData: Boolean(finance || projects || hr || sales),
        _fallback: !(finance || projects || hr || sales),
      };

      return dashboard as OverviewDashboard;
    } catch (error) {
      return {
        periode: {
          dateDebut: params?.dateDebut || '',
          dateFin: params?.dateFin || '',
        },
        revenue: 0,
        expenses: 0,
        profit: 0,
        margin: 0,
        active_missions: 0,
        users: 0,
        clients: 0,
        monthly_revenue: undefined as any,
        top_clients: undefined as any,
        overdue_invoices: undefined as any,
        _source: 'fallback',
        _timestamp: new Date().toISOString(),
        _realData: false,
        _fallback: true,
      } as OverviewDashboard;
    }
  },

  async getFinancialDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<FinancialDashboardResponse> {
    try {
      const response = await apiClient.get('/analytics/finance', { params });
      return {
        data: response.data,
        source: 'analytics/finance',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        data: {
          periode: { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
          revenus: { total: 0, variation: 0, tendance: 'STABLE' },
          depenses: { total: 0, variation: 0, tendance: 'STABLE' },
          resultat: { net: 0, marge: 0, variation: 0 },
          factures: { total: 0, payees: 0, enAttente: 0, enRetard: 0, tauxRecouvrement: 0 },
          devis: { total: 0, convertis: 0, tauxConversion: 0 },
          tresorerie: { disponible: 0, variation: 0, joursCA: 0 },
          revenue_trend: [],
          expense_trend: [],
          revenue_breakdown: { labels: [], data: [] },
          top_clients: [],
          _source: 'fallback',
          _timestamp: new Date().toISOString(),
          _realData: false,
          _fallback: true,
        },
        source: 'fallback',
        timestamp: new Date().toISOString(),
      };
    }
  },

  async getTechnicalDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<TechnicalDashboard> {
    try {
      const response = await apiClient.get('/analytics/projects', { params });
      const data = response.data;
      const total = data?.nombreProjets?.total || 0;
      const ongoing = data?.nombreProjets?.enCours || 0;
      const completed = data?.nombreProjets?.termines || 0;
      const planned = Math.max(0, total - ongoing - completed);

      const dashboard: any = {
        periode: data?.periode || { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
        total_missions: total || undefined,
        ongoing_missions: ongoing || undefined,
        completed_missions: completed || undefined,
        planned_missions: planned || undefined,
        total_technicians: undefined,
        available_technicians: undefined,
        on_mission_technicians: undefined,
        utilization_rate: data?.ressourcesUtilisation?.developpeurs || undefined,
        total_equipment: undefined,
        low_stock_items: undefined,
        out_of_stock_items: undefined,
        maintenance_needed: undefined,
        upcoming_missions: undefined,
        missions_per_month: undefined,
        _source: 'analytics/projects',
        _timestamp: new Date().toISOString(),
        _realData: true,
        _fallback: false,
      };

      return dashboard as TechnicalDashboard;
    } catch (error) {
      return {
        periode: { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
        total_missions: 0,
        ongoing_missions: 0,
        completed_missions: 0,
        planned_missions: 0,
        total_technicians: 0,
        available_technicians: 0,
        on_mission_technicians: 0,
        utilization_rate: 0,
        total_equipment: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        maintenance_needed: 0,
        upcoming_missions: undefined as any,
        missions_per_month: undefined as any,
        _source: 'fallback',
        _timestamp: new Date().toISOString(),
        _realData: false,
        _fallback: true,
      } as TechnicalDashboard;
    }
  },

  async getHRDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
    year?: number;
  }): Promise<HRDashboard> {
    try {
      const response = await apiClient.get('/analytics/hr', { params });
      const data = response.data;

      const dashboard: any = {
        periode: data?.periode || { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
        headcount: data?.effectifs?.total || undefined,
        new_hires: data?.turnover?.entrees || undefined,
        departures: data?.turnover?.sorties || undefined,
        turnover_rate: data?.turnover?.taux || undefined,
        total_payroll: undefined,
        average_salary: undefined,
        benefits: undefined,
        taxes: undefined,
        leave_stats: undefined,
        department_breakdown: undefined,
        _source: 'analytics/hr',
        _timestamp: new Date().toISOString(),
        _realData: true,
        _fallback: false,
      };

      return dashboard as HRDashboard;
    } catch (error) {
      return {
        periode: { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
        headcount: 0,
        new_hires: 0,
        departures: 0,
        turnover_rate: 0,
        total_payroll: 0,
        average_salary: 0,
        benefits: 0,
        taxes: 0,
        leave_stats: undefined as any,
        department_breakdown: undefined as any,
        _source: 'fallback',
        _timestamp: new Date().toISOString(),
        _realData: false,
        _fallback: true,
      } as HRDashboard;
    }
  },

  async getCustomerDashboard(params?: {
    dateDebut?: string;
    dateFin?: string;
  }): Promise<CustomerDashboard> {
    return {
      periode: { dateDebut: params?.dateDebut || '', dateFin: params?.dateFin || '' },
      total_customers: 0,
      active_customers: 0,
      new_customers: 0,
      churn_rate: 0,
      customer_satisfaction: 0,
      customer_growth: undefined as any,
      customer_by_type: undefined as any,
      top_customers: undefined as any,
      recent_customers: undefined as any,
      _source: 'fallback',
      _timestamp: new Date().toISOString(),
      _realData: false,
      _fallback: true,
    } as CustomerDashboard;
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
