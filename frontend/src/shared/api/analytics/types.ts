export interface OverviewDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
  revenue: number;
  revenue_change?: number;
  expenses: number;
  profit: number;
  margin: number;
  active_missions: number;
  missions_change?: number;
  active_projects?: number;
  projects_change?: number;
  users: number;
  clients: number;
  clients_change?: number;
  invoices?: number;
  invoices_change?: number;
  conversion_rate?: number;
  conversion_change?: number;
  monthly_revenue: number[];
  top_clients: Array<{ name: string; revenue: number }>;
  overdue_invoices: Array<{ client: string; amount: number; days: number }>;
  recent_activities?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  stock_alerts?: Array<{
    id: string | number;
    name: string;
    stockQuantity: number;
    stockAlertThreshold: number;
  }>;
  pending_reports?: number;
  new_clients_this_month?: number;
  pending_quotes?: number;
  active_employees?: number;
  available_technicians?: number;
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
