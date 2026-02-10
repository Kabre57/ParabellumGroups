'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  AlertCircle,
  Calendar,
  RefreshCw,
  Package,
  Eye,
  Target,
  Wrench,
  Loader2
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { analyticsService, type OverviewDashboard } from '@/shared/api/analytics';

type ExtendedOverview = OverviewDashboard & {
  revenue_change?: number;
  clients_change?: number;
  active_projects?: number;
  projects_change?: number;
  invoices_change?: number;
  conversion_rate?: number;
  conversion_change?: number;
  missions_change?: number;
  recent_activities?: Array<{ id: string; type: string; description: string; timestamp: string; user?: string }>;
  stock_alerts?: Array<{ id: string | number; name: string; stockQuantity: number; stockAlertThreshold: number }>;
  pending_reports?: number;
  new_clients_this_month?: number;
  pending_quotes?: number;
  active_employees?: number;
  available_technicians?: number;
};

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setHasToken(!!token);
  }, [isAuthenticated]);

  const { data: overviewData, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-overview', dateRange],
    queryFn: () => analyticsService.getOverviewDashboard({ period: dateRange }),
    staleTime: 1000 * 60 * 5,
    enabled: isAuthenticated && hasToken,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = overviewData?.data as ExtendedOverview | undefined;
  
  const kpiData = [
    {
      title: "Chiffre d'Affaires",
      value: stats?.revenue || 0,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: stats?.revenue_change || 0,
    },
    {
      title: 'Clients Actifs',
      value: stats?.clients || 0,
      format: 'number' as const,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: stats?.clients_change || 0,
    },
    {
      title: 'Projets en Cours',
      value: stats?.active_projects || 0,
      format: 'number' as const,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: stats?.projects_change || 0,
    },
    {
      title: 'Factures Impayees',
      value: Array.isArray(stats?.overdue_invoices) ? stats.overdue_invoices.length : 0,
      format: 'number' as const,
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: stats?.invoices_change || 0,
    },
    {
      title: 'Taux de Conversion',
      value: stats?.conversion_rate || 0,
      format: 'percentage' as const,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: stats?.conversion_change || 0,
    },
    {
      title: 'Interventions Actives',
      value: stats?.active_missions || 0,
      format: 'number' as const,
      icon: Wrench,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: stats?.missions_change || 0,
    }
  ];

  const recentActivities = (stats?.recent_activities || []).map(activity => ({
    id: parseInt(activity.id),
    type: activity.type,
    message: activity.description,
    time: new Date(activity.timestamp).toLocaleString('fr-FR'),
    user: activity.user || 'Système'
  }));
  const stockAlerts = stats?.stock_alerts || [];

  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tableau de Bord
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bonjour, voici un apercu de votre activite
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              Derniere mise a jour : {lastRefresh.toLocaleTimeString('fr-FR')}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">3 derniers mois</option>
              <option value="1y">Cette annee</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiData.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                  Alertes et Notifications
                </h3>
                <div className="space-y-3">
                  {stockAlerts.length > 0 ? (
                    stockAlerts.map((alert: { id: string | number; name: string; stockQuantity: number; stockAlertThreshold: number }) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-orange-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              Stock faible: {alert.name}
                            </div>
                            <div className="text-xs text-orange-600 dark:text-orange-300">
                              Stock: {alert.stockQuantity} (seuil: {alert.stockAlertThreshold})
                            </div>
                          </div>
                        </div>
                        <button className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Aucune alerte de stock
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Interventions en cours</div>
                        <div className="text-xs text-blue-600 dark:text-blue-300">
                          {stats?.active_missions || 0} interventions actives
                        </div>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-yellow-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Rapports en attente</div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-300">
                          {stats?.pending_reports || 0} rapports a valider
                        </div>
                      </div>
                    </div>
                    <button className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <QuickActions />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityFeed activities={recentActivities} />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Statistiques rapides
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Clients ce mois</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats?.new_clients_this_month || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Devis en attente</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats?.pending_quotes || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Employes actifs</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats?.active_employees || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Techniciens disponibles</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats?.available_technicians || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
