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
import { DashboardPeriod, DashboardScopeCapability, DashboardModuleKey, EnterpriseDashboardSnapshot, EnterpriseRealtimeDashboardProps, periodOptions, chartMonthLabels, MODULE_SCOPE_CAPABILITIES, formatCurrency, normalizeAccountingPeriod, normalizeAnalyticsPeriod, toIsoDate, buildRangeParams, buildActivityType } from './EnterpriseRealtimeDashboard.utils';
import type { EnterpriseRealtimeDashboardData } from './useEnterpriseRealtimeDashboardData';

export function useEnterpriseRealtimeDashboardMetrics(dashboardData: EnterpriseRealtimeDashboardData) {
  const { user, isAdmin, enterpriseView, setEnterpriseView, serviceView, setServiceView, canReadFinance, canReadProcurement, canReadTechnical, canReadCustomers, canReadEmployees, rangeParams, selectedEnterpriseId, selectedServiceId, hasEnterpriseScope, hasServiceScope, supportsStrictScope, enterprisesQuery, servicesQuery, accessibleEnterprises, availableServices, selectedEnterprise, selectedService, scopeLabel, hiddenModules, dashboardQuery } = dashboardData;

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

  return {
    snapshot,
    kpis,
    serviceDistribution,
    activityItems,
    executiveServiceCards,
    lastRefresh,
  };
}
