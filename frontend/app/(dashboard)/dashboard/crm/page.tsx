'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Users, TrendingUp, DollarSign, Briefcase, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboardResponse, isLoading } = useQuery({
    queryKey: ['overview-dashboard'],
    queryFn: () => analyticsService.getOverviewDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  const dashboard = dashboardResponse?.data;
  const stats = [
    {
      title: "Chiffre d'Affaires",
      value: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dashboard?.revenue || 0),
      icon: DollarSign,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: 'Clients Actifs',
      value: dashboard?.clients || 0,
      icon: Users,
      trend: '+3',
      trendUp: true,
    },
    {
      title: 'Missions en cours',
      value: dashboard?.active_missions || 0,
      icon: Briefcase,
      trend: '-2',
      trendUp: false,
    },
    {
      title: 'Profit Net',
      value: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dashboard?.profit || 0),
      icon: TrendingUp,
      trend: '+8.2%',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de Bord</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Vue d ensemble de votre activite CRM et ERP
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {stat.trendUp ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stat.trendUp ? 'text-green-500' : 'text-red-500'}>
                  {stat.trend}
                </span>
                {' '}par rapport au mois dernier
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.top_clients?.map((client, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-sm font-medium">{client.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(client.revenue)}
                  </div>
                </div>
              ))}
              {(!dashboard?.top_clients || dashboard.top_clients.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune donnee disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Factures en retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.overdue_invoices?.map((invoice, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{invoice.client}</div>
                    <div className="text-xs text-red-500">{invoice.days} jours de retard</div>
                  </div>
                  <div className="text-sm font-bold">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.amount)}
                  </div>
                </div>
              ))}
              {(!dashboard?.overdue_invoices || dashboard.overdue_invoices.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune facture en retard</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
