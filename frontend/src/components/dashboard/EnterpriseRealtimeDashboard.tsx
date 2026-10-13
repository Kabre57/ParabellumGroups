'use client';
import { useEnterpriseRealtimeDashboardData } from './useEnterpriseRealtimeDashboardData';
import { useEnterpriseRealtimeDashboardMetrics } from './useEnterpriseRealtimeDashboardMetrics';
import { chartMonthLabels, formatCurrency, periodOptions } from './EnterpriseRealtimeDashboard.utils';
import type { DashboardPeriod, EnterpriseRealtimeDashboardProps } from './EnterpriseRealtimeDashboard.utils';

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

export function EnterpriseRealtimeDashboard({
  title = "Cockpit entreprise",
  description = 'Pilotage temps réel des KPI et graphes de tous les services.',
  showQuickActions = false,
  period = 'month',
  onPeriodChange,
}: EnterpriseRealtimeDashboardProps) {

  const dashboardData = useEnterpriseRealtimeDashboardData(period);
  const { user, isAdmin, enterpriseView, setEnterpriseView, serviceView, setServiceView, canReadFinance, canReadProcurement, canReadTechnical, canReadCustomers, canReadEmployees, rangeParams, selectedEnterpriseId, selectedServiceId, hasEnterpriseScope, hasServiceScope, supportsStrictScope, enterprisesQuery, servicesQuery, accessibleEnterprises, availableServices, selectedEnterprise, selectedService, scopeLabel, hiddenModules, dashboardQuery } = dashboardData;
  const dashboardMetrics = useEnterpriseRealtimeDashboardMetrics(dashboardData);
  const { snapshot, kpis, serviceDistribution, activityItems, executiveServiceCards, lastRefresh } = dashboardMetrics;

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
