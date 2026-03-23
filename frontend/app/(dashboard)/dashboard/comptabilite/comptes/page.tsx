'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import billingService, { type AccountingAccount } from '@/shared/api/billing';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { CreateAccountingAccountDialog } from '@/components/accounting/CreateAccountingAccountDialog';
import {
  accountingAccountTypeLabel,
  formatAccountingCurrency,
  formatAccountingDate,
} from '@/components/accounting/accountingFormat';

export default function ComptesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    [
      'reports.read_financial',
      'expenses.read',
      'expenses.read_all',
      'expenses.read_own',
      'payments.read',
      'invoices.read',
    ].some((permission) => permissionSet.has(permission));
  const { canCreate, canUpdate } = getCrudVisibility(user, {
    read: ['reports.read_financial', 'invoices.read'],
    create: ['expenses.create'],
    update: ['expenses.update', 'invoices.update'],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['billing-accounting-overview', 'all'],
    queryFn: () => billingService.getAccountingOverview('all'),
    enabled: canRead,
  });

  const createAccountMutation = useMutation({
    mutationFn: billingService.createAccountingAccount,
    onSuccess: () => {
      toast.success('Compte comptable créé avec succès.');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du compte comptable.');
    },
  });

  const accounts = data?.data?.accounts ?? [];

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      asset: { label: 'Actif', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      liability: { label: 'Passif', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      equity: { label: 'Capital', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      revenue: { label: 'Produits', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      expense: { label: 'Charges', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    };
    const badge = badges[type] || badges.asset;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredAccounts = accounts.filter((account: AccountingAccount) => {
    const matchesSearch = account.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.code.includes(searchQuery);
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totals = accounts.reduce(
    (accumulator, account) => {
      if (account.type === 'asset') accumulator.assets += account.balance;
      if (account.type === 'liability') accumulator.liabilities += account.balance;
      if (account.type === 'revenue') accumulator.revenues += account.balance;
      if (account.type === 'expense') accumulator.expenses += account.balance;
      return accumulator;
    },
    { assets: 0, liabilities: 0, revenues: 0, expenses: 0 }
  );

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès au plan comptable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plan Comptable</h1>
          <p className="text-muted-foreground mt-2">
            Gestion du plan comptable et comptes généraux
          </p>
        </div>
        {canCreate && (
          <Button className="flex items-center gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau Compte
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Comptes</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
              <p className="text-2xl font-bold text-blue-600">{formatAccountingCurrency(totals.assets)}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Passifs</p>
              <p className="text-2xl font-bold text-red-600">{formatAccountingCurrency(totals.liabilities)}</p>
            </div>
            <BookOpen className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Résultat Net</p>
              <p className="text-2xl font-bold text-green-600">
                {formatAccountingCurrency(totals.revenues - totals.expenses)}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un compte..."
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les types</option>
            <option value="asset">Actif</option>
            <option value="liability">Passif</option>
            <option value="equity">Capital</option>
            <option value="revenue">Produits</option>
            <option value="expense">Charges</option>
          </select>
        </div>
      </Card>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Libellé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Solde</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Dernière Transaction</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                        {account.code}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium">{account.label}</td>
                    <td className="py-3 px-4">
                      {getTypeBadge(account.type)}
                      <div className="mt-1 text-xs text-gray-500">{accountingAccountTypeLabel(account.type)}</div>
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAccountingCurrency(account.balance)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatAccountingDate(account.lastTransaction)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Détails</Button>
                        {canUpdate && (
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredAccounts.length && (
                  <tr>
                    <td className="py-8 px-4 text-center text-sm text-gray-500" colSpan={6}>
                      Aucun compte comptable disponible pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateAccountingAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (payload) => {
          await createAccountMutation.mutateAsync(payload);
        }}
        isSubmitting={createAccountMutation.isPending}
      />
    </div>
  );
}
