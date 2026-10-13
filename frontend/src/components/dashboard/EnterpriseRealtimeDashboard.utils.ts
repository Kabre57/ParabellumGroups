/** Types, options et fonctions pures du tableau de bord entreprise. */
import type { OverviewDashboard } from '@/shared/api/analytics';
import type { AccountingOverview } from '@/shared/api/billing';
import type { ProcurementStats, PurchaseOrder, PurchaseRequest } from '@/shared/api/procurement/types';
import type { ClientsStats } from '@/shared/api/crm/types';

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export type DashboardScopeCapability = {
  enterprise: boolean;
  service: boolean;
};

export type DashboardModuleKey = 'overview' | 'finance' | 'procurement' | 'technical' | 'crm' | 'employees';

export type EnterpriseDashboardSnapshot = {
  overview: OverviewDashboard | null;
  financeOverview: AccountingOverview | null;
  procurementStats: ProcurementStats | null;
  recentRequests: PurchaseRequest[];
  recentOrders: PurchaseOrder[];
  missionsStats: {
    planifiees: number;
    enCours: number;
    terminees: number;
    annulees: number;
    total: number;
  } | null;
  clientsStats: ClientsStats | null;
  employeesTotal: number | null;
  employeesActive: number | null;
  refreshedAt: string;
};

export interface EnterpriseRealtimeDashboardProps {
  title?: string;
  description?: string;
  showQuickActions?: boolean;
  period?: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
}

export const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export const chartMonthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MODULE_SCOPE_CAPABILITIES: Record<DashboardModuleKey, DashboardScopeCapability> = {
  overview: { enterprise: false, service: false },
  finance: { enterprise: true, service: false },
  procurement: { enterprise: true, service: true },
  technical: { enterprise: true, service: true },
  crm: { enterprise: true, service: true },
  employees: { enterprise: true, service: true },
};

export const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)} F CFA`;

export const normalizeAccountingPeriod = (period: DashboardPeriod): 'week' | 'month' | 'quarter' | 'year' => {
  switch (period) {
    case 'day':
    case 'week':
      return 'week';
    case 'year':
      return 'year';
    default:
      return 'month';
  }
};

export const normalizeAnalyticsPeriod = (period: DashboardPeriod) => {
  switch (period) {
    case 'day':
      return '1d';
    case 'week':
      return '7d';
    case 'year':
      return '1y';
    default:
      return '30d';
  }
};

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const buildRangeParams = (period: DashboardPeriod) => {
  const end = new Date();
  const start = new Date(end);

  switch (period) {
    case 'day':
      break;
    case 'week':
      start.setDate(end.getDate() - 6);
      break;
    case 'year':
      start.setFullYear(end.getFullYear(), 0, 1);
      break;
    default:
      start.setMonth(end.getMonth() - 1);
      break;
  }

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
};

export const buildActivityType = (status: string) => {
  if (status.includes('REJET')) return 'rejection';
  if (status.includes('APPROUV')) return 'approval';
  if (status.includes('COMMANDE') || status.includes('CONFIRME') || status.includes('LIVRE')) return 'invoice';
  return 'quote';
};
