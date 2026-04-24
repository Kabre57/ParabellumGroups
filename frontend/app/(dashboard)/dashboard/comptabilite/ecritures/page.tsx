'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEcritures, useAccountsForEntry, useCreateEntry } from '@/hooks/comptabilite/ecritures/useEcritures';
import { EcrituresStats, EcrituresTable } from '@/components/comptabilite/ecritures';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Download, Search } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { CreateJournalEntryDialog } from '@/components/accounting/CreateJournalEntryDialog';
import { exportEntriesCsv } from '@/components/accounting/accountingExport';
import type { AccountingEntry } from '@/shared/api/billing';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';

export default function EcrituresPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [enterpriseFilter, setEnterpriseFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read'].some((p) =>
      permissionSet.has(p)
    );
  const { canCreate } = getCrudVisibility(user, {
    read: ['reports.read_financial', 'invoices.read'],
    create: ['expenses.create', 'payments.create'],
  });

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'ecritures'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: canRead,
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const { data, isLoading } = useEcritures(canRead, enterpriseFilter !== 'all' ? enterpriseFilter : undefined);
  const { data: accountsData } = useAccountsForEntry(canCreate);
  const createEntryMutation = useCreateEntry(() => setCreateDialogOpen(false));

  const entries: AccountingEntry[] = data?.data?.entries ?? [];
  const accounts = accountsData?.data ?? [];
  const filtered = entries.filter(
    (entry) =>
      entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.enterpriseName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.accountDebit.includes(searchQuery) ||
      entry.accountCredit.includes(searchQuery)
  );
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas acces aux ecritures comptables.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ecritures Comptables</h1>
          <p className="mt-2 text-muted-foreground">Journal general et ecritures comptables</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportEntriesCsv(filtered)}>
            <Download className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Ecriture
            </Button>
          )}
        </div>
      </div>

      <EcrituresStats total={entries.length} totalDebit={totalDebit} totalCredit={totalCredit} />

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher une ecriture..."
              className="pl-10"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={enterpriseFilter}
            onChange={(event) => setEnterpriseFilter(event.target.value)}
          >
            <option value="all">Toutes les entreprises</option>
            {accessibleEnterprises.map((enterprise) => (
              <option key={String(enterprise.id)} value={String(enterprise.id)}>
                {enterprise.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <EcrituresTable
        entries={filtered}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isLoading={isLoading}
      />

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
