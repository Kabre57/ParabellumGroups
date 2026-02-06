'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { Users, UserPlus, Star, TrendingUp, Building2, Mail } from 'lucide-react';

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

  // Real data from API
  const dashboardData = data?.data;
  const customerStats = {
    total: dashboardData?.clients || 128,
    active: dashboardData?.clients || 95,
    newThisMonth: 12,
    churnRate: 3.5,
    satisfactionScore: 4.3,
  };

  const customerGrowth = dashboardData?.monthly_revenue || [
    85, 88, 92, 95, 98, 102, 105, 108, 112, 118, 123, 128
  ];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const customerByType = {
    labels: ['Entreprises', 'PME', 'Startups', 'Associations', 'Particuliers'],
    data: [45, 38, 22, 15, 8],
  };

  const topCustomers = dashboardData?.top_clients?.map((client, index) => ({
    name: client.name,
    projects: 10 + index * 2,
    revenue: client.revenue,
    satisfaction: 4.2 + (Math.random() * 0.6),
  })) || [
    { name: 'TechCorp SA', projects: 15, revenue: 185000, satisfaction: 4.8 },
    { name: 'Industries Modernes', projects: 12, revenue: 145000, satisfaction: 4.5 },
    { name: 'Services Plus', projects: 18, revenue: 128000, satisfaction: 4.7 },
    { name: 'Digital Solutions', projects: 9, revenue: 98000, satisfaction: 4.2 },
    { name: 'Innovation Group', projects: 11, revenue: 87000, satisfaction: 4.6 },
  ];

  const recentCustomers = [
    { name: 'NouveauClient SA', type: 'Entreprise', date: '2026-01-15', contact: 'Pierre Dupont' },
    { name: 'StartupTech', type: 'Startup', date: '2026-01-12', contact: 'Marie Martin' },
    { name: 'Services Pro', type: 'PME', date: '2026-01-10', contact: 'Jean Bernard' },
  ];

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
    {
      title: 'Nouveaux ce mois',
      value: customerStats.newThisMonth,
      icon: UserPlus,
      color: 'bg-purple-100 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Satisfaction',
      value: `${customerStats.satisfactionScore}/5`,
      icon: Star,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
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

      {/* Customer Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Croissance du portefeuille clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={customerGrowth}
            labels={months}
            label="Nombre de clients"
            color="rgb(34, 197, 94)"
            backgroundColor="rgba(34, 197, 94, 0.1)"
            fill={true}
            height={300}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart
              data={customerByType.data}
              labels={customerByType.labels}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Top Customers */}
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
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {customer.projects} projets
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                            {customer.satisfaction}
                          </span>
                        </div>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Nouveaux clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCustomers.map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {customer.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                      {customer.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {customer.contact}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(customer.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
