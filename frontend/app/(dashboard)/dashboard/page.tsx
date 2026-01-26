'use client';

import React, { useState } from 'react';
import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Package,
  Eye,
  Target,
  Activity,
  Wrench
} from 'lucide-react';
import { KPICard } from '@/components/Dashboard/KPICard';
import { ActivityFeed } from '@/components/Dashboard/ActivityFeed';
import { QuickActions } from '@/components/Dashboard/QuickActions';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  // Données KPI
  const kpiData = [
    {
      title: "Chiffre d'Affaires",
      value: 45_000_000,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: 12.5,
    },
    {
      title: 'Clients Actifs',
      value: 42,
      format: 'number' as const,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: 8.2,
    },
    {
      title: 'Projets en Cours',
      value: 18,
      format: 'number' as const,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: -3.1,
    },
    {
      title: 'Factures Impayées',
      value: 7,
      format: 'number' as const,
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: -15.3,
    },
    {
      title: 'Taux de Conversion',
      value: 68.5,
      format: 'percentage' as const,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: 5.7,
    },
    {
      title: 'Interventions Actives',
      value: 27,
      format: 'number' as const,
      icon: Wrench,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: 11.2,
    }
  ];

  // Activités récentes
  const recentActivities = [
    {
      id: 1,
      type: 'quote',
      message: 'Nouveau devis créé pour SCI Les Plateaux',
      time: 'Il y a 2 heures',
      user: 'Jean Dupont',
      amount: 5_500_000
    },
    {
      id: 2,
      type: 'payment',
      message: 'Paiement reçu',
      time: 'Il y a 3 heures',
      user: 'Marie Martin',
      amount: 2_300_000
    },
    {
      id: 3,
      type: 'customer',
      message: 'Nouveau client ajouté',
      time: 'Il y a 5 heures',
      user: 'Paul Bernard'
    },
    {
      id: 4,
      type: 'invoice',
      message: 'Facture envoyée',
      time: 'Hier',
      user: 'Aya Kouadio',
      amount: 1_800_000
    }
  ];

  // Statistiques stock
  const stockAlerts = [
    { id: 1, name: 'Câbles électriques 2.5mm', stockQuantity: 8, stockAlertThreshold: 15 },
    { id: 2, name: 'Disjoncteurs 32A', stockQuantity: 3, stockAlertThreshold: 10 }
  ];

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
              Bonjour, voici un aperçu de votre activité
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR')}
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
        {kpiData.map((kpi, index) => (
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
              {stockAlerts.map((alert) => (
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
              ))}

              {/* Interventions en cours */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Interventions en cours</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      27 interventions actives
                    </div>
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
                    <div className="text-xs text-yellow-600 dark:text-yellow-300">
                      5 rapports à valider
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

        {/* Actions rapides */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Section inférieure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={recentActivities} />
        </div>

        {/* Métriques détaillées */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Métriques Financières
          </h3>
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact',
                  maximumFractionDigits: 0
                }).format(45_000_000)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenus</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact',
                  maximumFractionDigits: 0
                }).format(28_000_000)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dépenses</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact',
                  maximumFractionDigits: 0
                }).format(17_000_000)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bénéfice</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                37.8%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Marge</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
