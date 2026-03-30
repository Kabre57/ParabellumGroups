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
import { employeesService } from '@/shared/api/hr/employees.service';

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';
type ServiceView = 'all' | 'achats' | 'comptabilite' | 'technique' | 'crm' | 'rh';

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

const serviceOptions: Array<{ value: ServiceView; label: string }> = [
  { value: 'all', label: 'Tous les services' },
  { value: 'achats', label: 'Achats' },
  { value: 'comptabilite', label: 'Comptabilité' },
  { value: 'technique', label: 'Technique' },
  { value: 'crm', label: 'CRM' },
  { value: 'rh', label: 'RH' },
];

const chartMonthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const [serviceView, setServiceView] = useState<ServiceView>('all');

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

  const dashboardQuery = useQuery({
    queryKey: ['enterprise-dashboard', period, isAdmin, canReadFinance, canReadProcurement, canReadTechnical, canReadCustomers, canReadEmployees],
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
        analyticsService.getOverviewDashboard({ period: normalizeAnalyticsPeriod(period), ...rangeParams }),
        canReadFinance
          ? billingService.getAccountingOverview(normalizeAccountingPeriod(period), rangeParams)
          : Promise.resolve(null),
        canReadProcurement ? procurementService.getRequestsStats() : Promise.resolve(null),
        canReadProcurement
          ? procurementService.getRequests({ limit: 5, sortBy: 'dateDemande', sortOrder: 'desc', ...rangeParams })
          : Promise.resolve(null),
        canReadProcurement
          ? procurementService.getOrders({ limit: 5, sortBy: 'dateCommande', sortOrder: 'desc', ...rangeParams })
          : Promise.resolve(null),
        canReadTechnical ? missionsService.getMissionsStats() : Promise.resolve(null),
        canReadCustomers ? clientsService.getClientsStats() : Promise.resolve(null),
        canReadEmployees ? employeesService.getEmployees({ page: 1, pageSize: 1 }) : Promise.resolve(null),
        canReadEmployees ? employeesService.getEmployees({ page: 1, pageSize: 1, filters: { isActive: true } }) : Promise.resolve(null),
      ]);

      return {
        overview: overviewResult.status === 'fulfilled' ? overviewResult.value.data : null,
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
            ? employeesTotalResult.value.pagination?.totalItems ?? employeesTotalResult.value.data.length
            : null,
        employeesActive:
          employeesActiveResult.status === 'fulfilled' && employeesActiveResult.value
            ? employeesActiveResult.value.pagination?.totalItems ?? employeesActiveResult.value.data.length
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
        title: "Chiffre d'affaires",
        value: snapshot?.financeOverview?.summary.totalRevenue ?? snapshot?.overview?.revenue ?? 0,
        format: 'currency' as const,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      {
        title: 'Résultat net',
        value: snapshot?.financeOverview?.summary.netResult ?? snapshot?.overview?.profit ?? 0,
        format: 'currency' as const,
        icon: Wallet,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
      },
      {
        title: 'Devis internes en attente',
        value: snapshot?.procurementStats?.pendingApproval ?? 0,
        format: 'number' as const,
        icon: ClipboardList,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
      },
      {
        title: 'BC en attente',
        value: snapshot?.procurementStats?.pendingOrders ?? 0,
        format: 'number' as const,
        icon: Package,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
      },
      {
        title: 'Missions actives',
        value: snapshot?.missionsStats?.enCours ?? snapshot?.overview?.active_missions ?? 0,
        format: 'number' as const,
        icon: Wrench,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
      },
      {
        title: 'Clients actifs',
        value: snapshot?.clientsStats?.totals.active ?? snapshot?.overview?.clients ?? 0,
        format: 'number' as const,
        icon: Building2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      },
      {
        title: 'Effectif total',
        value: snapshot?.employeesTotal ?? snapshot?.overview?.users ?? 0,
        format: 'number' as const,
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
      },
      {
        title: 'Employés actifs',
        value: snapshot?.employeesActive ?? 0,
        format: 'number' as const,
        icon: UserCheck,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
      },
    ];

    return cards.filter((card) => card.value > 0 || isAdmin);
  }, [isAdmin, snapshot]);

  const serviceDistribution = useMemo(() => {
    const data = [
      snapshot?.procurementStats?.pendingApproval ?? 0,
      snapshot?.procurementStats?.ordersThisMonth ?? 0,
      snapshot?.missionsStats?.enCours ?? snapshot?.overview?.active_missions ?? 0,
      snapshot?.clientsStats?.totals.active ?? 0,
      snapshot?.employeesActive ?? 0,
    ];
    const labels = ['Achats en attente', 'BC du mois', 'Missions actives', 'Clients actifs', 'Employés actifs'];
    return { data, labels };
  }, [snapshot]);

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
    const cards = [
      {
        key: 'achats' as const,
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
        key: 'comptabilite' as const,
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
        key: 'technique' as const,
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
        key: 'crm' as const,
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
        key: 'rh' as const,
        title: 'Ressources humaines',
        icon: Users,
        accent: 'text-purple-600',
        metrics: [
          { label: 'Effectif total', value: String(snapshot?.employeesTotal ?? 0) },
          { label: 'Employés actifs', value: String(snapshot?.employeesActive ?? 0) },
          { label: 'Comptes utilisateurs', value: String(snapshot?.overview?.users ?? 0) },
        ],
      },
    ];

    return serviceView === 'all' ? cards : cards.filter((card) => card.key === serviceView);
  }, [serviceView, snapshot]);

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
              Pilotage consolidé multi-services
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
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
              value={serviceView}
              onChange={(event) => setServiceView(event.target.value as ServiceView)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
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
            <PieChart
              data={serviceDistribution.data}
              labels={serviceDistribution.labels}
              height={320}
              showLegend
            />
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
