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
import billingService, { type AccountingEntry } from '@/shared/api/billing';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export default function EcrituresPage() {
  const { user } = useAuth();
  const { selectedEnterprise } = useEnterprise();
  const accountingScope = useAccountingEnterpriseScope();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['accounting.read', 'accounting.entries.create', 'accounting.journals.manage', 'accounting.diagnostics.read'].some((p) =>
      permissionSet.has(p)
    );
  const crud = getCrudVisibility(user, {
    read: ['accounting.read', 'accounting.diagnostics.read'],
    create: ['accounting.entries.create'],
  });
  const canCreate = crud.canCreate && !accountingScope.isConsolidated;

  const { data, isLoading } = useEcritures(canRead && accountingScope.isReady, accountingScope);
  const writeScope = { enterpriseId: selectedEnterprise?.id };
  const { data: accountsData } = useAccountsForEntry(writeScope, canCreate && Boolean(selectedEnterprise));
  const { data: familyRulesResponse } = useQuery({
    queryKey: ['billing-accounting-family-rules', 'entry-dialog', selectedEnterprise?.id],
    queryFn: () => billingService.getAccountingFamilyRules(writeScope),
    enabled: canCreate && Boolean(selectedEnterprise),
  });
  const createEntryMutation = useCreateEntry(() => setCreateDialogOpen(false));

  const entries: AccountingEntry[] = data?.data ?? [];
  const accounts = accountsData?.data ?? [];
  const familyRules = familyRulesResponse?.data ?? [];
  const entrySearchText = (entry: AccountingEntry) =>
    [
      entry.label,
      entry.reference,
      entry.enterpriseName,
      entry.accountDebit,
      entry.accountCredit,
      ...(entry.lines ?? []).flatMap((line) => [line.accountCode, line.accountLabel, line.description]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  const filtered = entries.filter(
    (entry) => entrySearchText(entry).includes(searchQuery.toLowerCase())
  );
  const totalDebit = entries.reduce((sum, entry) => sum + (entry.totalDebit ?? entry.debit), 0);
  const totalCredit = entries.reduce((sum, entry) => sum + (entry.totalCredit ?? entry.credit), 0);

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
          <Button variant="outline" onClick={() => exportEntriesCsv(filtered, undefined, accountingScope.isConsolidated)}>
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
        <div className="grid gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher une ecriture..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <EcrituresTable
        entries={filtered}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isLoading={isLoading}
        showEnterpriseColumn={accountingScope.isConsolidated}
      />

      <CreateJournalEntryDialog
        open={createDialogOpen && canCreate}
        onOpenChange={setCreateDialogOpen}
        accounts={accounts}
        familyRules={familyRules}
        onSubmit={async (payload) => {
          await createEntryMutation.mutateAsync(payload);
        }}
        isSubmitting={createEntryMutation.isPending}
      />
    </div>
  );
}
