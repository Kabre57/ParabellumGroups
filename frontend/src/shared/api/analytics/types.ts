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
  _source: string;
  _timestamp: string;
  _realData: boolean;
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
  _source: string;
  _timestamp: string;
  _realData: boolean;
}

export interface HRDashboard {
  periode: {
    dateDebut: string;
    dateFin: string;
  };
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
  _source: string;
  _timestamp: string;
  _realData: boolean;
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
