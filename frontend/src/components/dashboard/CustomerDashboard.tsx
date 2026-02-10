'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { Users, TrendingUp, Building2 } from 'lucide-react';

export function CustomerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'customer'],
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

  const dashboardData = data?.data;
  const customerStats = {
    total: dashboardData?.clients ?? 0,
    active: dashboardData?.clients ?? 0,
  };

  const customerGrowth = dashboardData?.monthly_revenue ?? [];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const topCustomers = dashboardData?.top_clients ?? [];

  const statsCards = [
    {
      title: 'Total clients',
      value: customerStats.total,
      icon: Users,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Clients actifs',
      value: customerStats.active,
      icon: Building2,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
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
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Chiffre d'affaires mensuel (clients)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerGrowth.length > 0 ? (
            <LineChart
              data={customerGrowth}
              labels={months}
              label="CA mensuel"
              color="rgb(34, 197, 94)"
              backgroundColor="rgba(34, 197, 94, 0.1)"
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
        <Card>
          <CardHeader>
            <CardTitle>Top 5 clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={customer.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {customer.revenue.toLocaleString()} F
                    </span>
                  </div>
                  {index < topCustomers.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Aucun client disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
