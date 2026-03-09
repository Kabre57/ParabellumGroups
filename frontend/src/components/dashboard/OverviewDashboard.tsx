'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { Users, DollarSign, Briefcase, Building2, TrendingUp, AlertTriangle } from 'lucide-react';

export function OverviewDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => analyticsService.getOverviewDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des données
          </p>
        </div>
      </div>
    );
  }

  // Real data from API
  const dashboardData = data?.data;
  const monthlyRevenue = dashboardData?.monthly_revenue ?? [];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const topClients = dashboardData?.top_clients ?? [];

  const overdueInvoices = dashboardData?.overdue_invoices ?? [];

  const stats = [
    {
      title: 'Utilisateurs',
      value: dashboardData?.users ?? 0,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Clients',
      value: dashboardData?.clients ?? 0,
      icon: Building2,
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Chiffre d\'affaires',
      value: `${((dashboardData?.revenue ?? 0) / 1000).toFixed(0)}KF`,
      icon: DollarSign,
      color: 'orange',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Missions actives',
      value: dashboardData?.active_missions ?? 0,
      icon: Briefcase,
      color: 'purple',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Chiffre d'affaires mensuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length > 0 ? (
            <LineChart
              data={monthlyRevenue}
              labels={months}
              label="CA (F)"
              color="rgb(59, 130, 246)"
              backgroundColor="rgba(59, 130, 246, 0.1)"
              fill={true}
              height={300}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Aucune donnée disponible
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {client.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {client.revenue.toLocaleString()} F
                  </span>
                </div>
              ))}
              {topClients.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Aucun client disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Factures en retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Aucune facture en retard
                </p>
              ) : (
                overdueInvoices.map((invoice) => (
                  <div key={invoice.client} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.client}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        En retard de {invoice.days} jours
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {invoice.amount.toLocaleString()} F
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
