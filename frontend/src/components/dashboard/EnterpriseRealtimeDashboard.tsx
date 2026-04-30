'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  DollarSign,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, isAdminRole } from '@/shared/permissions';
import { analyticsService, type OverviewDashboard } from '@/shared/api/analytics';
import { billingService, type AccountingOverview } from '@/shared/api/billing';
import { procurementService } from '@/shared/api/procurement/procurement.service';
import type {
  ProcurementStats,
  PurchaseOrder,
  PurchaseRequest,
} from '@/shared/api/procurement/types';
import { missionsService } from '@/shared/api/technical/missions.service';
import { clientsService } from '@/shared/api/crm/clients.service';
import type { ClientsStats } from '@/shared/api/crm/types';
import { adminUsersService } from '@/shared/api/admin/admin.service';
import { enterpriseApi, serviceApi, type Enterprise, type Service } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';
type DashboardScopeCapability = {
  enterprise: boolean;
  service: boolean;
};

type DashboardModuleKey = 'overview' | 'finance' | 'procurement' | 'technical' | 'crm' | 'employees';
type EnterpriseDashboardSnapshot = {
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

interface EnterpriseRealtimeDashboardProps {
  title?: string;
  description?: string;
  showQuickActions?: boolean;
  period?: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
}

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

const chartMonthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const MODULE_SCOPE_CAPABILITIES: Record<DashboardModuleKey, DashboardScopeCapability> = {
  overview: { enterprise: false, service: false },
  finance: { enterprise: true, service: false },
  procurement: { enterprise: true, service: true },
  technical: { enterprise: true, service: true },
  crm: { enterprise: true, service: true },
  employees: { enterprise: true, service: true },
};

const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)} F CFA`;

const normalizeAccountingPeriod = (period: DashboardPeriod): 'week' | 'month' | 'quarter' | 'year' => {
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

const normalizeAnalyticsPeriod = (period: DashboardPeriod) => {
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

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const buildRangeParams = (period: DashboardPeriod) => {
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

const buildActivityType = (status: string) => {
  if (status.includes('REJET')) return 'rejection';
  if (status.includes('APPROUV')) return 'approval';
  if (status.includes('COMMANDE') || status.includes('CONFIRME') || status.includes('LIVRE')) return 'invoice';
  return 'quote';
};

export function EnterpriseRealtimeDashboard({
  title = "Cockpit entreprise",
  description = 'Pilotage temps réel des KPI et graphes de tous les services.',
  showQuickActions = false,
  period = 'month',
  onPeriodChange,
}: EnterpriseRealtimeDashboardProps) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);
  const [enterpriseView, setEnterpriseView] = useState<string>(
    user?.enterpriseId ? String(user.enterpriseId) : 'all'
  );
  const [serviceView, setServiceView] = useState<string>('all');

  const canReadFinance = isAdmin || hasPermission(user, 'reports.read_financial');
  const canReadProcurement =
    isAdmin ||
    hasPermission(user, 'purchase_requests.read') ||
    hasPermission(user, 'purchase_requests.read_all') ||
    hasPermission(user, 'purchase_orders.read');
  const canReadTechnical = isAdmin || hasPermission(user, 'missions.read');
  const canReadCustomers = isAdmin || hasPermission(user, 'customers.read');
  const canReadEmployees = isAdmin || hasPermission(user, 'employees.read');
  const rangeParams = useMemo(() => buildRangeParams(period), [period]);
  const selectedEnterpriseId = enterpriseView !== 'all' ? enterpriseView : undefined;
  const selectedServiceId = serviceView !== 'all' ? serviceView : undefined;
  const hasEnterpriseScope = Boolean(selectedEnterpriseId);
  const hasServiceScope = Boolean(selectedServiceId);

  const supportsStrictScope = (moduleKey: DashboardModuleKey) => {
    const capability = MODULE_SCOPE_CAPABILITIES[moduleKey];
    if (hasServiceScope && !capability.service) return false;
    if (hasEnterpriseScope && !capability.enterprise) return false;
    return true;
  };

  const enterprisesQuery = useQuery({
    queryKey: ['dashboard-enterprises'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: isAdmin || Boolean(user?.enterpriseId),
    staleTime: 60_000,
  });

  const servicesQuery = useQuery({
    queryKey: ['dashboard-services'],
    queryFn: () => serviceApi.getAll({ limit: 200, actif: true }),
    enabled: isAdmin || hasPermission(user, 'services.read'),
    staleTime: 60_000,
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises((enterprisesQuery.data?.data ?? []) as Enterprise[], user?.enterpriseId),
    [enterprisesQuery.data?.data, user?.enterpriseId]
  );

  const availableServices = useMemo(() => {
    const services = (servicesQuery.data?.data ?? []) as Service[];
    const normalizedEnterpriseId = selectedEnterpriseId ? String(selectedEnterpriseId) : null;

    return services
      .filter((service) => {
        if (!normalizedEnterpriseId) return true;
        return String(service.enterpriseId ?? '') === normalizedEnterpriseId;
      })
      .sort((left, right) => (left.nom || '').localeCompare(right.nom || '', 'fr'));
  }, [selectedEnterpriseId, servicesQuery.data?.data]);

  const selectedEnterprise = useMemo(
    () => accessibleEnterprises.find((enterprise) => String(enterprise.id) === String(enterpriseView)) || null,
    [accessibleEnterprises, enterpriseView]
  );
  const selectedService = useMemo(
    () => availableServices.find((service) => String(service.id) === String(serviceView)) || null,
    [availableServices, serviceView]
  );

  const scopeLabel = useMemo(() => {
    const enterpriseLabel = selectedEnterprise?.name || 'Toutes les entreprises';
    const serviceLabel = selectedService?.nom || 'Tous les services';
    return `${enterpriseLabel} · ${serviceLabel}`;
  }, [selectedEnterprise?.name, selectedService?.nom]);

  const hiddenModules = useMemo(() => {
    const labels: Record<DashboardModuleKey, string> = {
      overview: 'Cockpit global',
      finance: 'Comptabilité',
      procurement: 'Achats',
      technical: 'Technique',
      crm: 'CRM',
      employees: 'Ressources humaines',
    };

    return (Object.keys(MODULE_SCOPE_CAPABILITIES) as DashboardModuleKey[])
      .filter((moduleKey) => !supportsStrictScope(moduleKey))
      .map((moduleKey) => labels[moduleKey]);
  }, [hasEnterpriseScope, hasServiceScope]);

  const dashboardQuery = useQuery({
    queryKey: [
      'enterprise-dashboard',
      period,
      enterpriseView,
      serviceView,
      isAdmin,
      canReadFinance,
      canReadProcurement,
      canReadTechnical,
      canReadCustomers,
      canReadEmployees,
    ],
    queryFn: async (): Promise<EnterpriseDashboardSnapshot> => {
      const [
        overviewResult,
        financeResult,
        procurementStatsResult,
        recentRequestsResult,
        recentOrdersResult,
        missionsResult,
        clientsResult,
        employeesTotalResult,
        employeesActiveResult,
      ] = await Promise.allSettled([
        analyticsService.getOverviewDashboard({
          period: normalizeAnalyticsPeriod(period),
          ...rangeParams,
          enterpriseId: selectedEnterpriseId,
          serviceId: selectedServiceId,
        }),
        canReadFinance && supportsStrictScope('finance')
          ? billingService.getAccountingOverview(normalizeAccountingPeriod(period), {
              ...rangeParams,
              enterpriseId: selectedEnterpriseId,
            })
          : Promise.resolve(null),
        canReadProcurement && supportsStrictScope('procurement')
          ? procurementService.getRequestsStats({
              enterpriseId: selectedEnterpriseId,
              serviceId: selectedServiceId,
              ...rangeParams,
            })
          : Promise.resolve(null),
        canReadProcurement && supportsStrictScope('procurement')
          ? procurementService.getRequests({
              limit: 5,
              sortBy: 'dateDemande',
              sortOrder: 'desc',
              enterpriseId: selectedEnterpriseId,
              serviceId: selectedServiceId,
              ...rangeParams,
            })
          : Promise.resolve(null),
        canReadProcurement && supportsStrictScope('procurement')
          ? procurementService.getOrders({
              limit: 5,
              sortBy: 'dateCommande',
              sortOrder: 'desc',
              enterpriseId: selectedEnterpriseId,
              serviceId: selectedServiceId,
              ...rangeParams,
            })
          : Promise.resolve(null),
        canReadTechnical && supportsStrictScope('technical')
          ? missionsService.getMissionsStats({
              enterpriseId: selectedEnterpriseId,
              serviceId: selectedServiceId,
            })
          : Promise.resolve(null),
        canReadCustomers && supportsStrictScope('crm')
          ? clientsService.getClientsStats({
              ...rangeParams,
              enterpriseId: selectedEnterpriseId,
              serviceId: selectedServiceId,
            })
          : Promise.resolve(null),
        canReadEmployees && supportsStrictScope('employees')
          ? adminUsersService.getUsers({
              page: 1,
              limit: 1,
              enterpriseId: selectedEnterpriseId ? Number(selectedEnterpriseId) : undefined,
              serviceId: selectedServiceId ? Number(selectedServiceId) : undefined,
            })
          : Promise.resolve(null),
        canReadEmployees && supportsStrictScope('employees')
          ? adminUsersService.getUsers({
              page: 1,
              limit: 1,
              isActive: true,
              enterpriseId: selectedEnterpriseId ? Number(selectedEnterpriseId) : undefined,
              serviceId: selectedServiceId ? Number(selectedServiceId) : undefined,
            })
          : Promise.resolve(null),
      ]);

      return {
        overview:
          overviewResult.status === 'fulfilled' && supportsStrictScope('overview')
            ? overviewResult.value.data
            : null,
        financeOverview:
          financeResult.status === 'fulfilled' && financeResult.value
            ? financeResult.value.data
            : null,
        procurementStats:
          procurementStatsResult.status === 'fulfilled' && procurementStatsResult.value
            ? procurementStatsResult.value.data
            : null,
        recentRequests:
          recentRequestsResult.status === 'fulfilled' && recentRequestsResult.value
            ? recentRequestsResult.value.data
            : [],
        recentOrders:
          recentOrdersResult.status === 'fulfilled' && recentOrdersResult.value
            ? recentOrdersResult.value.data
            : [],
        missionsStats:
          missionsResult.status === 'fulfilled' && missionsResult.value ? missionsResult.value : null,
        clientsStats:
          clientsResult.status === 'fulfilled' && clientsResult.value ? clientsResult.value.data : null,
        employeesTotal:
          employeesTotalResult.status === 'fulfilled' && employeesTotalResult.value
            ? employeesTotalResult.value.pagination?.total ?? employeesTotalResult.value.data.length
            : null,
        employeesActive:
          employeesActiveResult.status === 'fulfilled' && employeesActiveResult.value
            ? employeesActiveResult.value.pagination?.total ?? employeesActiveResult.value.data.length
            : null,
        refreshedAt: new Date().toISOString(),
      };
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const snapshot = dashboardQuery.data;

  const kpis = useMemo(() => {
    const cards = [
      {
        key: 'revenue',
        moduleKey: 'finance' as DashboardModuleKey,
        title: "Chiffre d'affaires",
        value: snapshot?.financeOverview?.summary.totalRevenue ?? snapshot?.overview?.revenue ?? 0,
        format: 'currency' as const,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      {
        key: 'net-result',
        moduleKey: 'finance' as DashboardModuleKey,
        title: 'Résultat net',
        value: snapshot?.financeOverview?.summary.netResult ?? snapshot?.overview?.profit ?? 0,
        format: 'currency' as const,
        icon: Wallet,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
      },
      {
        key: 'pending-quotes',
        moduleKey: 'procurement' as DashboardModuleKey,
        title: 'Devis internes en attente',
        value: snapshot?.procurementStats?.pendingApproval ?? 0,
        format: 'number' as const,
        icon: ClipboardList,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
      },
      {
        key: 'pending-orders',
        moduleKey: 'procurement' as DashboardModuleKey,
        title: 'BC en attente',
        value: snapshot?.procurementStats?.pendingOrders ?? 0,
        format: 'number' as const,
        icon: Package,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
      },
      {
        key: 'active-missions',
        moduleKey: 'technical' as DashboardModuleKey,
        title: 'Missions actives',
        value: snapshot?.missionsStats?.enCours ?? snapshot?.overview?.active_missions ?? 0,
        format: 'number' as const,
        icon: Wrench,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
      },
      {
        key: 'active-clients',
        moduleKey: 'crm' as DashboardModuleKey,
        title: 'Clients actifs',
        value: snapshot?.clientsStats?.totals.active ?? snapshot?.overview?.clients ?? 0,
        format: 'number' as const,
        icon: Building2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      },
      {
        key: 'employees-total',
        moduleKey: 'employees' as DashboardModuleKey,
        title: 'Effectif total',
        value: snapshot?.employeesTotal ?? snapshot?.overview?.users ?? 0,
        format: 'number' as const,
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
      },
      {
        key: 'employees-active',
        moduleKey: 'employees' as DashboardModuleKey,
        title: 'Employés actifs',
        value: snapshot?.employeesActive ?? 0,
        format: 'number' as const,
        icon: UserCheck,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
      },
    ];

    return cards.filter((card) => supportsStrictScope(card.moduleKey) && (card.value > 0 || isAdmin));
  }, [isAdmin, snapshot, hasEnterpriseScope, hasServiceScope]);

  const serviceDistribution = useMemo(() => {
    const items = [
      supportsStrictScope('procurement')
        ? { label: 'Achats en attente', value: snapshot?.procurementStats?.pendingApproval ?? 0 }
        : null,
      supportsStrictScope('procurement')
        ? { label: 'BC du mois', value: snapshot?.procurementStats?.ordersThisMonth ?? 0 }
        : null,
      supportsStrictScope('technical')
        ? { label: 'Missions actives', value: snapshot?.missionsStats?.enCours ?? snapshot?.overview?.active_missions ?? 0 }
        : null,
      supportsStrictScope('crm')
        ? { label: 'Clients actifs', value: snapshot?.clientsStats?.totals.active ?? 0 }
        : null,
      supportsStrictScope('employees')
        ? { label: 'Employés actifs', value: snapshot?.employeesActive ?? 0 }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: number }>;

    if (items.length === 0) {
      return { data: [], labels: [] };
    }
    const data = items.map((item) => item.value);
    const labels = items.map((item) => item.label);
    return { data, labels };
  }, [snapshot, hasEnterpriseScope, hasServiceScope]);

  const activityItems = useMemo(() => {
    const requestActivities = (snapshot?.recentRequests ?? []).map((request, index) => ({
      id: Number(request.id?.replace(/\D/g, '').slice(-6) || index + 1),
      type: buildActivityType(request.status),
      message: `Devis interne ${request.numeroDemande || request.number || request.title} - ${request.serviceName || 'Service'}`,
      time: new Date(request.date || request.submittedAt || request.approvedAt || new Date().toISOString()).toLocaleString('fr-FR'),
      user: request.requesterEmail || request.serviceName || 'Service',
      amount: request.montantTTC || request.estimatedAmount,
      sortDate: new Date(request.date || request.submittedAt || request.approvedAt || 0).getTime(),
    }));

    const orderActivities = (snapshot?.recentOrders ?? []).map((order, index) => ({
      id: Number(order.id?.replace(/\D/g, '').slice(-6) || index + 100),
      type: buildActivityType(order.status),
      message: `BC ${order.numeroBon || order.number} - ${order.fournisseurNom || order.supplier || 'Fournisseur'}`,
      time: new Date(order.date || new Date().toISOString()).toLocaleString('fr-FR'),
      user: order.serviceName || 'Achats',
      amount: order.montantTotal || order.amount,
      sortDate: new Date(order.date || 0).getTime(),
    }));

    return [...requestActivities, ...orderActivities]
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 8)
      .map(({ sortDate: _sortDate, ...activity }) => activity);
  }, [snapshot]);

  const executiveServiceCards = useMemo(() => {
    return [
      {
        key: 'achats',
        moduleKey: 'procurement' as DashboardModuleKey,
        title: 'Achats',
        icon: ClipboardList,
        accent: 'text-amber-600',
        metrics: [
          { label: 'Devis internes en attente', value: String(snapshot?.procurementStats?.pendingApproval ?? 0) },
          { label: 'BC du mois', value: String(snapshot?.procurementStats?.ordersThisMonth ?? 0) },
          { label: 'Budget restant', value: formatCurrency(snapshot?.procurementStats?.budgetRemaining ?? 0) },
        ],
      },
      {
        key: 'comptabilite',
        moduleKey: 'finance' as DashboardModuleKey,
        title: 'Comptabilité',
        icon: Receipt,
        accent: 'text-green-600',
        metrics: [
          { label: 'Décaissements', value: formatCurrency(snapshot?.financeOverview?.summary.totalDisbursed ?? 0) },
          { label: 'Recouvrements', value: formatCurrency(snapshot?.financeOverview?.summary.totalReceived ?? 0) },
          { label: 'Résultat net', value: formatCurrency(snapshot?.financeOverview?.summary.netResult ?? 0) },
        ],
      },
      {
        key: 'technique',
        moduleKey: 'technical' as DashboardModuleKey,
        title: 'Technique',
        icon: Wrench,
        accent: 'text-indigo-600',
        metrics: [
          { label: 'Missions planifiées', value: String(snapshot?.missionsStats?.planifiees ?? 0) },
          { label: 'Missions en cours', value: String(snapshot?.missionsStats?.enCours ?? 0) },
          { label: 'Missions terminées', value: String(snapshot?.missionsStats?.terminees ?? 0) },
        ],
      },
      {
        key: 'crm',
        moduleKey: 'crm' as DashboardModuleKey,
        title: 'CRM',
        icon: Building2,
        accent: 'text-blue-600',
        metrics: [
          { label: 'Clients actifs', value: String(snapshot?.clientsStats?.totals.active ?? 0) },
          { label: 'Nouveaux clients', value: String(snapshot?.clientsStats?.totals.newThisMonth ?? 0) },
          { label: 'CA total HT', value: formatCurrency(snapshot?.clientsStats?.revenue.totalHT ?? 0) },
        ],
      },
      {
        key: 'rh',
        moduleKey: 'employees' as DashboardModuleKey,
        title: 'Ressources humaines',
        icon: Users,
        accent: 'text-purple-600',
        metrics: [
          { label: 'Effectif total', value: String(snapshot?.employeesTotal ?? 0) },
          { label: 'Employés actifs', value: String(snapshot?.employeesActive ?? 0) },
          { label: 'Comptes utilisateurs', value: String(snapshot?.overview?.users ?? 0) },
        ],
      },
    ].filter((card) => supportsStrictScope(card.moduleKey));
  }, [snapshot, hasEnterpriseScope, hasServiceScope]);

  const lastRefresh = snapshot?.refreshedAt ? new Date(snapshot.refreshedAt) : null;

  if (dashboardQuery.isLoading && !snapshot) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <Activity className="h-4 w-4" />
              Pilotage ERP multi-entreprises et multi-services
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
            <div className="text-sm font-medium text-slate-700">
              Périmètre actif : {scopeLabel}
            </div>
            {lastRefresh ? (
              <div className="text-sm text-gray-500">
                Dernière synchronisation : {lastRefresh.toLocaleTimeString('fr-FR')}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={(event) => onPeriodChange?.(event.target.value as DashboardPeriod)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={enterpriseView}
              onChange={(event) => {
                const nextEnterprise = event.target.value;
                setEnterpriseView(nextEnterprise);
                setServiceView('all');
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Toutes les entreprises</option>
              {accessibleEnterprises.map((enterprise) => (
                <option key={String(enterprise.id)} value={String(enterprise.id)}>
                  {enterprise.name}
                </option>
              ))}
            </select>
            <select
              value={serviceView}
              onChange={(event) => setServiceView(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tous les services</option>
              {availableServices.map((service) => (
                <option key={String(service.id)} value={String(service.id)}>
                  {service.nom}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
              {dashboardQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualiser
            </Button>
          </div>
        </div>
        {hiddenModules.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Certaines vues sont masquées pour respecter strictement le périmètre {scopeLabel} :
            {' '}
            <strong>{hiddenModules.join(', ')}</strong>.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ key, moduleKey: _moduleKey, ...kpi }) => (
          <KPICard key={key} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendances globales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supportsStrictScope('finance') || supportsStrictScope('overview') ? (
              <>
                <LineChart
                  data={snapshot?.overview?.monthly_revenue ?? []}
                  labels={chartMonthLabels}
                  label="Chiffre d'affaires"
                  color="rgb(37, 99, 235)"
                  backgroundColor="rgba(37, 99, 235, 0.12)"
                  fill
                  height={320}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Marge</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {Number(snapshot?.overview?.margin ?? snapshot?.financeOverview?.reports.kpis.netMargin ?? 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Créances clients</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatCurrency(snapshot?.financeOverview?.summary.clientReceivables ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Engagements en cours</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatCurrency(snapshot?.financeOverview?.summary.pendingCommitted ?? 0)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-sm text-slate-600">
                Les tendances financières ne sont affichées que lorsque le module peut respecter strictement le périmètre choisi.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              Répartition opérationnelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceDistribution.data.length > 0 ? (
              <PieChart
                data={serviceDistribution.data}
                labels={serviceDistribution.labels}
                height={320}
                showLegend
              />
            ) : (
              <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-sm text-slate-600">
                Aucune répartition opérationnelle strictement compatible avec le périmètre actif.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Vue exécutive par service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${executiveServiceCards.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {executiveServiceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className="rounded-xl border bg-slate-50 p-4">
                    <div className={`flex items-center gap-2 text-sm font-semibold text-slate-700 ${card.accent}`}>
                      <Icon className={`h-4 w-4 ${card.accent}`} />
                      {card.title}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {card.metrics.map((metric) => (
                        <div key={`${card.key}-${metric.label}`} className="flex items-center justify-between">
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {showQuickActions ? <QuickActions /> : <ActivityFeed activities={activityItems} />}
      </div>

      {showQuickActions ? (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <ActivityFeed activities={activityItems} />
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-slate-700" />
                Points de pilotage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Commerce</div>
                <div className="mt-2">CA consolidé : {formatCurrency(snapshot?.overview?.revenue ?? 0)}</div>
                <div>Top clients suivis : {(snapshot?.overview?.top_clients ?? []).length}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Achats</div>
                <div className="mt-2">Budget restant : {formatCurrency(snapshot?.procurementStats?.budgetRemaining ?? 0)}</div>
                <div>Devis internes approuvés ce mois : {snapshot?.procurementStats?.approvedThisMonth ?? 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default EnterpriseRealtimeDashboard;
