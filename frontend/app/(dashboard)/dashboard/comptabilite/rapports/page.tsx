'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import billingService from '@/shared/api/billing';
import { formatAccountingCurrency, formatAccountingPercent } from '@/components/accounting/accountingFormat';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';

export default function RapportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const permissionSet = buildPermissionSet(user);
  const canRead = isAdminRole(user) || permissionSet.has('reports.read_financial');
  const { canExport } = getCrudVisibility(user, {
    read: ['reports.read_financial'],
    export: ['reports.export'],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['billing-accounting-reports', period],
    queryFn: () => billingService.getAccountingOverview(period),
    enabled: canRead,
  });

  const reports = data?.data?.reports;
  const balanceSheet = reports?.balanceSheet;
  const incomeStatement = reports?.incomeStatement;
  const treasury = reports?.treasury;
  const commitments = reports?.commitments;
  const kpis = reports?.kpis;

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès aux rapports comptables.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports Financiers</h1>
          <p className="text-muted-foreground mt-2">
            Bilans, comptes de résultat et analyses financières
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter' | 'year')}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          {canExport && (
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exporter PDF
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <Card className="p-6 text-center text-sm text-gray-500">
          Chargement des rapports comptables...
        </Card>
      )}

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            {canExport && <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>}
          </div>
          <h3 className="font-semibold mb-1">Bilan Comptable</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {formatAccountingCurrency(balanceSheet?.totalAssets || 0)} d&apos;actifs
          </p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            {canExport && <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>}
          </div>
          <h3 className="font-semibold mb-1">Compte de Résultat</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Résultat net: {formatAccountingCurrency(incomeStatement?.netResult || 0)}
          </p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            {canExport && <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>}
          </div>
          <h3 className="font-semibold mb-1">Tableau de Trésorerie</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Solde: {formatAccountingCurrency(treasury?.closingBalance || 0)}
          </p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <FileText className="h-8 w-8 text-orange-500" />
            {canExport && <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>}
          </div>
          <h3 className="font-semibold mb-1">Analyse Financière</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Marge nette: {formatAccountingPercent(kpis?.netMargin || 0)}
          </p>
        </Card>
      </div>

      {/* Bilan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Actif (Assets)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Actifs circulants et fiscaux</span>
              <span className="font-bold text-blue-600">{formatAccountingCurrency(balanceSheet?.totalAssets || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Créances clients</span>
              <span className="font-bold text-blue-600">
                {formatAccountingCurrency(data?.data?.summary.clientReceivables || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
              <span className="font-bold">TOTAL ACTIF</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                {formatAccountingCurrency(balanceSheet?.totalAssets || 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Passif (Liabilities)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Capitaux Propres</span>
              <span className="font-bold text-green-600">{formatAccountingCurrency(balanceSheet?.totalEquity || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Dettes</span>
              <span className="font-bold text-red-600">{formatAccountingCurrency(balanceSheet?.totalLiabilities || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
              <span className="font-bold">TOTAL PASSIF</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                {formatAccountingCurrency((balanceSheet?.totalLiabilities || 0) + (balanceSheet?.totalEquity || 0))}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Compte de Résultat */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Compte de Résultat (Période: {period === 'month' ? 'Ce mois' : period === 'quarter' ? 'Ce trimestre' : 'Cette année'})
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">PRODUITS</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Prestations de services</span>
                <span className="font-semibold text-green-600">
                  {formatAccountingCurrency(incomeStatement?.totalRevenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Encaissements clients</span>
                <span className="font-semibold text-green-600">
                  {formatAccountingCurrency(data?.data?.summary.totalReceived || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                <span className="font-bold">Total Produits</span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {formatAccountingCurrency(incomeStatement?.totalRevenue || 0)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">CHARGES</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Bons de caisse et dépenses</span>
                <span className="font-semibold text-red-600">
                  {formatAccountingCurrency(incomeStatement?.totalExpenses || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Engagements d&apos;achat en cours</span>
                <span className="font-semibold text-red-600">
                  {formatAccountingCurrency(commitments?.pendingCommitted || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Décaissements réalisés</span>
                <span className="font-semibold text-red-600">
                  {formatAccountingCurrency(data?.data?.summary.totalDisbursed || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                <span className="font-bold">Total Charges</span>
                <span className="font-bold text-red-700 dark:text-red-400">
                  {formatAccountingCurrency(incomeStatement?.totalExpenses || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
            <span className="text-lg font-bold">RÉSULTAT NET</span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {formatAccountingCurrency(incomeStatement?.netResult || 0)}
            </span>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Marge Nette</p>
              <p className="text-2xl font-bold text-green-600">{formatAccountingPercent(kpis?.netMargin || 0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux d'Endettement</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatAccountingPercent(
                  balanceSheet?.totalAssets
                    ? ((balanceSheet.totalLiabilities || 0) / balanceSheet.totalAssets) * 100
                    : 0
                )}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux de couverture des décaissements</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatAccountingPercent(kpis?.disbursementCoverage || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}
