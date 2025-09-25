import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  FileText, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Calendar,
  Filter,
  RefreshCw,
  Package,
  Eye
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createCrudService } from '../services/api';
import { SalesChart } from '../components/Charts/SalesChart';
import { PipelineChart } from '../components/Charts/PipelineChart';
import { RevenueChart } from '../components/Charts/RevenueChart';
import { StockChart } from '../components/Charts/StockChart';
import { KPICard } from '../components/Dashboard/KPICard';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import { QuickActions } from '../components/Dashboard/QuickActions';

const reportService = createCrudService('reports');

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 secondes
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Données du dashboard avec rafraîchissement automatique
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', dateRange],
    queryFn: () => reportService.getAll({ endpoint: 'dashboard', period: dateRange }),
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true
  });

  // Pipeline CRM
  const { data: pipelineData } = useQuery({
    queryKey: ['pipeline', dateRange],
    queryFn: () => reportService.getAll({ endpoint: 'pipeline', period: dateRange }),
    enabled: hasPermission('quotes.read'),
    refetchInterval: refreshInterval
  });

  // Données de ventes
  const { data: salesData } = useQuery({
    queryKey: ['sales-analytics', dateRange],
    queryFn: () => reportService.getAll({ endpoint: 'sales', period: dateRange }),
    enabled: hasPermission('reports.sales'),
    refetchInterval: refreshInterval
  });

  // Rafraîchissement manuel
  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  // Auto-refresh timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const stats = dashboardData?.data || {};
  const pipeline = pipelineData?.data || {};
  const sales = salesData?.data || {};

  const kpiData = [
    {
      title: 'Chiffre d\'Affaires',
      value: stats.revenue?.total || 0,
      format: 'currency',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: stats.revenue?.change || 0,
      permission: 'reports.financial'
    },
    {
      title: 'Clients Actifs',
      value: stats.customers?.active || 0,
      format: 'number',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: stats.customers?.change || 0,
      permission: 'customers.read'
    },
    {
      title: 'Devis en Cours',
      value: stats.quotes?.pending || 0,
      format: 'number',
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: stats.quotes?.change || 0,
      permission: 'quotes.read'
    },
    {
      title: 'Factures Impayées',
      value: stats.invoices?.unpaid || 0,
      format: 'number',
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: stats.invoices?.change || 0,
      permission: 'invoices.read'
    },
    {
      title: 'Taux de Conversion',
      value: stats.conversion?.rate || 0,
      format: 'percentage',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: stats.conversion?.change || 0,
      permission: 'reports.sales'
    },
    {
      title: 'Projets Actifs',
      value: stats.projects?.active || 0,
      format: 'number',
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: stats.projects?.change || 0,
      permission: 'quotes.read'
    }
  ];

  const visibleKPIs = kpiData.filter(kpi => !kpi.permission || hasPermission(kpi.permission));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tableau de Bord
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bonjour {user?.firstName}, voici un aperçu de votre activité
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              Dernière mise à jour : {lastRefresh.toLocaleTimeString()}
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
              <option value="1y">Cette année</option>
            </select>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {visibleKPIs.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Alertes et actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes importantes */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
              Alertes et Notifications
            </h3>
            <div className="space-y-3">
              {/* Alertes stock */}
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-orange-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-orange-800 dark:text-orange-200">Stock faible</div>
                    <div className="text-xs text-orange-600 dark:text-orange-300">3 articles sous le seuil d'alerte</div>
                  </div>
                </div>
                <button className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              
              {/* Interventions en cours */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Interventions en cours</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">5 interventions actives</div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              
              {/* Rapports en attente */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Rapports en attente</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-300">2 rapports à valider</div>
                  </div>
                </div>
                <button className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline CRM */}
        {hasPermission('quotes.read') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Target className="h-5 w-5 text-blue-500 mr-2" />
                Pipeline des Opportunités
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {pipeline.totalValue ? `${(pipeline.totalValue / 1000000).toFixed(1)}M FCFA` : '0 FCFA'}
              </div>
            </div>
            <PipelineChart data={pipeline.stages || []} />
          </div>
        )}

        {/* Évolution du CA */}
        {hasPermission('reports.financial') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                Évolution du Chiffre d'Affaires
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Tendance : {stats.revenue?.trend > 0 ? '+' : ''}{stats.revenue?.trend || 0}%
              </div>
            </div>
            <RevenueChart data={sales.monthlyRevenue || []} />
          </div>
        )}
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventes par Commercial */}
        {hasPermission('reports.sales') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
              Ventes par Commercial
            </h3>
            <SalesChart data={sales.bySalesperson || []} type="bar" />
          </div>
        )}

        {/* Répartition par Service */}
        {hasPermission('reports.sales') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <PieChart className="h-5 w-5 text-indigo-500 mr-2" />
              Répartition par Service
            </h3>
            <SalesChart data={sales.byService || []} type="pie" />
          </div>
        )}

        {/* Alertes Stock */}
        {hasPermission('products.read') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
              Alertes Stock
            </h3>
            <StockChart data={stats.stock?.alerts || []} />
          </div>
        )}
      </div>

      {/* Section inférieure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={stats.recentActivities || []} />
        </div>

        {/* Actions rapides */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Métriques détaillées */}
      {hasPermission('reports.financial') && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Métriques Financières Détaillées
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(stats.financial?.revenue || 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Revenus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(stats.financial?.expenses || 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Dépenses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(stats.financial?.profit || 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Bénéfice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {((stats.financial?.profit || 0) / (stats.financial?.revenue || 1) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Marge</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};