'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { TrendingUp, DollarSign, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

export function FinancialDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'financial'],
    queryFn: () => analyticsService.getFinancialDashboard(),
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

  // Mock data for demonstration
  const revenue12Months = data?.revenue_trend || [
    65000, 72000, 68000, 75000, 82000, 88000, 95000, 92000, 98000, 105000, 112000, 118000
  ];
  const months12 = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const revenueBreakdown = data?.revenue_breakdown || {
    labels: ['Prestations', 'Maintenance', 'Formation', 'Consulting'],
    data: [450000, 180000, 95000, 125000],
  };

  const invoiceStats = {
    total: data?.total_invoices || 156,
    paid: data?.paid_invoices || 124,
    pending: data?.pending_invoices || 28,
    overdue: data?.overdue_invoices || 4,
    totalAmount: data?.total_amount || 1250000,
    paidAmount: data?.paid_amount || 985000,
    pendingAmount: data?.pending_amount || 245000,
    overdueAmount: data?.overdue_amount || 20000,
  };

  const topClients = data?.top_clients || [
    { name: 'TechCorp SA', revenue: 185000, invoices: 12 },
    { name: 'Industries Modernes', revenue: 145000, invoices: 8 },
    { name: 'Services Plus', revenue: 128000, invoices: 15 },
    { name: 'Digital Solutions', revenue: 98000, invoices: 7 },
    { name: 'Innovation Group', revenue: 87000, invoices: 10 },
  ];

  const statsCards = [
    {
      title: 'CA Total',
      value: `${(invoiceStats.totalAmount / 1000).toFixed(0)}KF`,
      icon: DollarSign,
      color: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Factures payées',
      value: invoiceStats.paid,
      subValue: `${(invoiceStats.paidAmount / 1000).toFixed(0)}KF`,
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'En attente',
      value: invoiceStats.pending,
      subValue: `${(invoiceStats.pendingAmount / 1000).toFixed(0)}KF`,
      icon: Clock,
      color: 'bg-orange-100 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'En retard',
      value: invoiceStats.overdue,
      subValue: `${(invoiceStats.overdueAmount / 1000).toFixed(0)}KF`,
      icon: XCircle,
      color: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
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
                    {stat.subValue && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {stat.subValue}
                      </p>
                    )}
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

      {/* Revenue Trend 12 Months */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Évolution du CA sur 12 mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={revenue12Months}
            labels={months12}
            label="Chiffre d'affaires (F)"
            color="rgb(34, 197, 94)"
            backgroundColor="rgba(34, 197, 94, 0.1)"
            fill={true}
            height={320}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart
              data={revenueBreakdown.data}
              labels={revenueBreakdown.labels}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Top 5 Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 clients par CA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {client.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {client.invoices} factures
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {client.revenue.toLocaleString()} F
                    </span>
                  </div>
                  {index < topClients.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
