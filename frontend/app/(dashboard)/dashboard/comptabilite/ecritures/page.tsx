'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import billingService, { type AccountingEntry } from '@/shared/api/billing';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import { CreateJournalEntryDialog } from '@/components/accounting/CreateJournalEntryDialog';
import { exportEntriesCsv } from '@/components/accounting/accountingExport';

export default function EcrituresPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read'].some(
      (permission) => permissionSet.has(permission)
    );
  const { canCreate } = getCrudVisibility(user, {
    read: ['reports.read_financial', 'invoices.read'],
    create: ['expenses.create', 'payments.create'],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-entries'],
    queryFn: () => billingService.getAccountingOverview('all'),
    enabled: canRead,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['billing-accounting-accounts'],
    queryFn: () => billingService.getAccountingAccounts(),
    enabled: canCreate,
  });

  const createEntryMutation = useMutation({
    mutationFn: billingService.createAccountingEntry,
    onSuccess: () => {
      toast.success('Écriture comptable créée avec succès.');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création de l écriture comptable.');
    },
  });

  const entries = data?.data?.entries ?? [];
  const accounts = accountsData?.data ?? [];

  const filteredEntries = entries.filter((entry: AccountingEntry) =>
    entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.accountDebit.includes(searchQuery) ||
    entry.accountCredit.includes(searchQuery)
  );

  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès aux écritures comptables.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Écritures Comptables</h1>
          <p className="text-muted-foreground mt-2">
            Journal général et écritures comptables
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportEntriesCsv(filteredEntries)}>
              Exporter Excel
            </Button>
            <Button className="flex items-center gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle Écriture
            </Button>
          </div>
        )}
        {!canCreate && (
          <Button variant="outline" onClick={() => exportEntriesCsv(filteredEntries)}>
            <Download className="h-4 w-4" />
            Exporter Excel
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Écritures</p>
              <p className="text-2xl font-bold">{entries.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Débit</p>
              <p className="text-2xl font-bold text-green-600">{formatAccountingCurrency(totalDebit)}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Crédit</p>
              <p className="text-2xl font-bold text-red-600">{formatAccountingCurrency(totalCredit)}</p>
            </div>
            <FileText className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une écriture..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Entries Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Journal</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Compte Débit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Compte Crédit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Libellé</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Débit</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Crédit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Référence</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm">{formatAccountingDate(entry.date)}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {entry.journalCode}
                      </Badge>
                      <div className="mt-1 text-xs text-gray-500">{entry.journalLabel}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                        {entry.accountDebit}
                      </code>
                      <div className="mt-1 text-xs text-gray-500">{entry.accountDebitLabel}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">
                        {entry.accountCredit}
                      </code>
                      <div className="mt-1 text-xs text-gray-500">{entry.accountCreditLabel}</div>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-xs truncate">{entry.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {formatAccountingCurrency(entry.debit)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {formatAccountingCurrency(entry.credit)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{entry.reference}</td>
                    <td className="py-3 px-4">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredEntries.length && (
                  <tr>
                    <td className="py-8 px-4 text-center text-sm text-gray-500" colSpan={9}>
                      Aucune écriture comptable disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Totals Row */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex justify-between items-center font-bold">
                <span className="text-lg">TOTAUX</span>
                <div className="flex gap-8">
                  <div className="text-green-600">
                    Débit: {formatAccountingCurrency(totalDebit)}
                  </div>
                  <div className="text-red-600">
                    Crédit: {formatAccountingCurrency(totalCredit)}
                  </div>
                  <div className={totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}>
                    Écart: {formatAccountingCurrency(Math.abs(totalDebit - totalCredit))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <CreateJournalEntryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        accounts={accounts}
        onSubmit={async (payload) => {
          await createEntryMutation.mutateAsync(payload);
        }}
        isSubmitting={createEntryMutation.isPending}
      />
    </div>
  );
}
