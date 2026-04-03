'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Calendar, PlusCircle } from 'lucide-react';
import billingService, { type AccountingMovement } from '@/shared/api/billing';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import { useAuth } from '@/shared/hooks/useAuth';
import { AccountingDateRangeDialog } from '@/components/accounting/AccountingDateRangeDialog';
import { exportTreasuryCsv } from '@/components/accounting/accountingExport';
import { CreateTreasuryAccountDialog } from '@/components/accounting/CreateTreasuryAccountDialog';
import { toast } from 'sonner';

export default function TresoreriePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read'].some(
      (permission) => permissionSet.has(permission)
    );

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flows', period, customRange?.startDate || null, customRange?.endDate || null],
    queryFn: () => billingService.getAccountingOverview(period, customRange || undefined),
    enabled: canRead,
  });

  const cashFlows = data?.data?.treasuryMovements ?? [];
  const report = data?.data?.reports?.treasury;
  const treasuryAccounts = report?.accounts ?? [];
  const totalIncome = report?.inflows || 0;
  const totalExpense = report?.outflows || 0;
  const currentBalance = report?.closingBalance || 0;

  const createAccountMutation = useMutation({
    mutationFn: billingService.createTreasuryAccount,
    onSuccess: () => {
      toast.success('Compte de trésorerie créé.');
      setAccountDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['cash-flows'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de créer le compte.');
    },
  });

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès à la trésorerie.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trésorerie</h1>
          <p className="text-muted-foreground mt-2">
            Suivi des flux de trésorerie, soldes multi-banques et sous-caisses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAccountDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau compte
          </Button>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as 'week' | 'month' | 'quarter' | 'year' | 'all');
              setCustomRange(null);
            }}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button variant="outline" onClick={() => exportTreasuryCsv(cashFlows)}>
            Exporter Excel
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setDialogOpen(true)}>
            <Calendar className="h-4 w-4" />
            {customRange?.startDate || customRange?.endDate ? 'Plage active' : 'Personnalisé'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Comptes de trésorerie</h2>
            <p className="text-sm text-muted-foreground">
              Banque principale, sous-caisses et comptes dédiés.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {treasuryAccounts.map((account) => (
            <Card key={account.id} className="p-4 border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{account.type === 'BANK' ? 'Banque' : 'Caisse'}</p>
                  <p className="text-lg font-semibold">{account.name}</p>
                  {account.bankName && <p className="text-xs text-muted-foreground">{account.bankName}</p>}
                  {account.accountNumber && <p className="text-xs text-muted-foreground">{account.accountNumber}</p>}
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                  {account.isDefault ? 'Par défaut' : 'Actif'}
                </span>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">Solde</div>
              <div className="text-xl font-bold">
                {formatAccountingCurrency(account.balance ?? account.currentBalance ?? 0)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Encaissements: {formatAccountingCurrency(account.inflows || 0)} · Décaissements:{' '}
                {formatAccountingCurrency(account.outflows || 0)}
              </div>
            </Card>
          ))}
          {!treasuryAccounts.length && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Aucun compte de trésorerie enregistré.
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Solde Actuel</p>
              <p className="text-2xl font-bold">{formatAccountingCurrency(currentBalance)}</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Encaissements</p>
              <p className="text-2xl font-bold text-green-600">+{formatAccountingCurrency(totalIncome)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Décaissements</p>
              <p className="text-2xl font-bold text-red-600">-{formatAccountingCurrency(totalExpense)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Solde Net</p>
              <p className="text-2xl font-bold">{formatAccountingCurrency(totalIncome - totalExpense)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries((report?.byPaymentMethod || {}) as Record<string, number>).map(([method, amount]) => (
          <Card className="p-4" key={method}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{method}</p>
                <p className="text-xl font-bold">{formatAccountingCurrency(amount)}</p>
              </div>
              <CreditCard className="h-7 w-7 text-slate-500" />
            </div>
          </Card>
        ))}
      </div>

      {/* Cash Flow Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Mouvements de Trésorerie</h2>
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Catégorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Montant</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Solde</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((flow: AccountingMovement) => (
                  <tr key={flow.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm">{formatAccountingDate(flow.date)}</td>
                    <td className="py-3 px-4">
                      {flow.type === 'income' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Encaissement
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          Décaissement
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">{flow.category}</td>
                    <td className="py-3 px-4 text-sm">{flow.description}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${flow.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {flow.type === 'income' ? '+' : '-'}
                      {formatAccountingCurrency(flow.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatAccountingCurrency(flow.balance)}</td>
                  </tr>
                ))}
                {!cashFlows.length && (
                  <tr>
                    <td className="py-8 px-4 text-center text-sm text-gray-500" colSpan={6}>
                      Aucun mouvement de trésorerie sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AccountingDateRangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultRange={customRange}
        onApply={(range) => {
          setCustomRange(range.startDate || range.endDate ? range : null);
        }}
      />

      <CreateTreasuryAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        isSubmitting={createAccountMutation.isPending}
        onSubmit={(payload) => createAccountMutation.mutateAsync(payload)}
      />
    </div>
  );
}
