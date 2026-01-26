import { apiClient } from '../client';

export interface OverviewDashboard {
  revenue: number;
  expenses: number;
  active_projects: number;
  employees: number;
  [key: string]: any;
}

export interface TechnicalDashboard {
  projects_by_status: Record<string, number>;
  resource_utilization: number;
  upcoming_milestones: any[];
  [key: string]: any;
}

export interface FinancialDashboard {
  revenue_trend: any[];
  expense_trend: any[];
  cash_flow: number;
  profitability: number;
  [key: string]: any;
}

export interface HRDashboard {
  headcount: number;
  attendance_rate: number;
  turnover_rate: number;
  pending_leaves: number;
  [key: string]: any;
}

export interface CustomerDashboard {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  customer_satisfaction: number;
  [key: string]: any;
}

export interface KPI {
  key: string;
  value: number;
  trend: string;
  [key: string]: any;
}

export interface Report {
  report_id: number;
  report_type: string;
  generated_at: string;
  data: any;
  [key: string]: any;
}

export interface Alert {
  alert_id: number;
  severity: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
  [key: string]: any;
}

export interface Metric {
  key: string;
  value: number;
  timestamp: string;
  [key: string]: any;
}

export const analyticsService = {
  async getOverviewDashboard(): Promise<OverviewDashboard> {
    const response = await apiClient.get('/analytics/dashboard/overview');
    return response.data;
  },

  async getTechnicalDashboard(): Promise<TechnicalDashboard> {
    const response = await apiClient.get('/analytics/dashboard/technical');
    return response.data;
  },

  async getFinancialDashboard(): Promise<FinancialDashboard> {
    const response = await apiClient.get('/analytics/dashboard/financial');
    return response.data;
  },

  async getHRDashboard(): Promise<HRDashboard> {
    const response = await apiClient.get('/analytics/dashboard/hr');
    return response.data;
  },

  async getCustomerDashboard(): Promise<CustomerDashboard> {
    const response = await apiClient.get('/analytics/dashboard/customer');
    return response.data;
  },

  async getKPIs(period?: string): Promise<KPI[]> {
    const response = await apiClient.get('/analytics/kpis', {
      params: { period },
    });
    return response.data;
  },

  async getReports(params?: Record<string, any>): Promise<Report[]> {
    const response = await apiClient.get('/analytics/reports', { params });
    return response.data;
  },

  async generateReport(type: string, params?: Record<string, any>): Promise<Report> {
    const response = await apiClient.post('/analytics/reports/generate', {
      type,
      ...params,
    });
    return response.data;
  },

  async getAlerts(params?: Record<string, any>): Promise<Alert[]> {
    const response = await apiClient.get('/analytics/alerts', { params });
    return response.data;
  },

  async acknowledgeAlert(id: number): Promise<void> {
    await apiClient.post(`/analytics/alerts/${id}/acknowledge`);
  },

  async getMetrics(keys: string[]): Promise<Metric[]> {
    const response = await apiClient.get('/analytics/metrics', {
      params: { keys: keys.join(',') },
    });
    return response.data;
  },
};
