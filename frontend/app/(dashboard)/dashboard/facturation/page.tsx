'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingService } from '@/shared/api/billing';
import { analyticsService } from '@/shared/api/analytics/analytics.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_COLORS = ['#2563eb', '#f97316', '#dc2626'];

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

export default function FacturationPage() {
  const router = useRouter();

  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['invoiceStats'],
    queryFn: () => billingService.getInvoiceStats(),
  });

  const { data: overviewResponse, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['overviewDashboard'],
    queryFn: () => analyticsService.getOverviewDashboard(),
  });

  const stats = statsResponse?.data;
  const monthlyRevenue = (overviewResponse?.data?.monthly_revenue || []).map((value: number, idx: number) => ({
    month: monthLabels[idx % 12],
    revenue: value,
  }));

  const montantEncaisse = Math.max(
    0,
    (stats?.chiffreAffaires || 0) - (stats?.montantEnAttente || 0) - (stats?.montantEnRetard || 0)
  );

  const statusData = [
    { name: 'Encaisse', value: montantEncaisse },
    { name: 'En attente', value: stats?.montantEnAttente || 0 },
    { name: 'En retard', value: stats?.montantEnRetard || 0 },
  ];

  const kpis = [
    {
      label: 'CA total',
      value: formatCurrency(stats?.chiffreAffaires || 0),
      helper: 'Factures emises sur la periode',
    },
    {
      label: 'Encaissements',
      value: formatCurrency(montantEncaisse),
      helper: 'Montants deja encaisses',
    },
    {
      label: 'Montant en attente',
      value: formatCurrency(stats?.montantEnAttente || 0),
      helper: 'Factures a encaisser',
    },
    {
      label: 'Montant en retard',
      value: formatCurrency(stats?.montantEnRetard || 0),
      helper: 'Creances en retard',
    },
    {
      label: 'Factures emises',
      value: String(stats?.totalFactures || 0),
      helper: `${stats?.emises || 0} emis / ${stats?.brouillon || 0} brouillon`,
    },
    {
      label: 'Factures payees',
      value: String(stats?.facturesPayees || 0),
      helper: `${stats?.facturesEnRetard || 0} en retard`,
    },
  ];

  const isLoading = isLoadingStats || isLoadingOverview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Facturation</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Cockpit de pilotage des factures, encaissements, retards et tendance du chiffre d&apos;affaires.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/facturation/paiements')}>
            Voir les paiements
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/facturation/avoirs')}>
            Voir les avoirs
          </Button>
          <Button onClick={() => router.push('/dashboard/facturation/factures')}>
            Voir les factures
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {kpis.map((item) => (
              <Card key={item.label} className="p-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</div>
                <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{item.value}</div>
                <div className="mt-2 text-xs text-muted-foreground">{item.helper}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chiffre d&apos;affaires mensuel</h2>
                <p className="text-sm text-muted-foreground">Evolution mensuelle des factures et revenus emis.</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Repartition encours</h2>
                <p className="text-sm text-muted-foreground">Montants encaisses, en attente et en retard.</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={4}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => String(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3">
                {statusData.map((item, index) => (
                  <div key={item.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      {item.name}
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {formatCurrency(Number(item.value) || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
