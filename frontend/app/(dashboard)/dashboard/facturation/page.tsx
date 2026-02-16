'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingService } from '@/shared/api/billing';
import { analyticsService } from '@/shared/api/analytics/analytics.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function FacturationPage() {
  const router = useRouter();

  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['invoiceStats'],
    queryFn: () => billingService.getInvoiceStats(),
  });

  const { data: invoicesResponse, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: async () => {
      const data = await billingService.getInvoices({ limit: 5, sortBy: "dateFacture", sortOrder: "desc" });
      return data;
    },
  });

  const { data: overviewResponse } = useQuery({
    queryKey: ['overviewDashboard'],
    queryFn: () => analyticsService.getOverviewDashboard(),
  });

  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyRevenue = (overviewResponse?.data?.monthly_revenue || []).map((value: number, idx: number) => ({
    month: monthLabels[idx % 12],
    revenue: value,
  }));

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      BROUILLON: { label: 'Brouillon', variant: 'outline' },
      ENVOYEE: { label: 'Envoyée', variant: 'default' },
      PAYEE: { label: 'Payée', variant: 'success' },
      EN_RETARD: { label: 'En retard', variant: 'destructive' },
      ANNULEE: { label: 'Annulée', variant: 'secondary' },
      PARTIALLY_PAYEE: { label: 'Partiellement payée', variant: 'warning' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
  };

  const stats = statsResponse?.data;
  const invoices = invoicesResponse?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Facturation
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Vue d'ensemble de votre facturation
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/facturation/factures')}>
          Voir toutes les factures
        </Button>
      </div>

      {/* Stats */}
      {isLoadingStats ? (
        <div className="flex justify-center items-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  CA Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatCurrency(stats?.chiffreAffaires || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Factures Payées
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats?.facturesPayees || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En Attente
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {formatCurrency(stats?.montantEnAttente || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En Retard
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(stats?.montantEnRetard || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Graphique CA mensuel */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Chiffre d'affaires mensuel
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Liste derniÃ¨res factures */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              DerniÃ¨res factures
            </h2>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/facturation/factures')}
            >
              Voir tout
            </Button>
          </div>
        </div>
        
        {isLoadingInvoices ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : invoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Ã‰chéance</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.numeroFacture}
                  </TableCell>
                  <TableCell>{invoice.client?.nom || invoice.clientId || 'Client'}</TableCell>
                  <TableCell>{formatDate(invoice.dateFacture)}</TableCell>
                  <TableCell>{formatDate(invoice.dateEcheance)}</TableCell>
                  <TableCell>{formatCurrency(invoice.montantTTC || 0)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/facturation/factures/${invoice.id}`)}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune facture trouvée
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}



