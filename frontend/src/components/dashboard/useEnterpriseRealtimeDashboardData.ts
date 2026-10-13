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

export function useEnterpriseRealtimeDashboardData(period: DashboardPeriod) {
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

  return {
    user,
    isAdmin,
    enterpriseView,
    setEnterpriseView,
    serviceView,
    setServiceView,
    canReadFinance,
    canReadProcurement,
    canReadTechnical,
    canReadCustomers,
    canReadEmployees,
    rangeParams,
    selectedEnterpriseId,
    selectedServiceId,
    hasEnterpriseScope,
    hasServiceScope,
    supportsStrictScope,
    enterprisesQuery,
    servicesQuery,
    accessibleEnterprises,
    availableServices,
    selectedEnterprise,
    selectedService,
    scopeLabel,
    hiddenModules,
    dashboardQuery,
  };
}

export type EnterpriseRealtimeDashboardData = ReturnType<typeof useEnterpriseRealtimeDashboardData>;
