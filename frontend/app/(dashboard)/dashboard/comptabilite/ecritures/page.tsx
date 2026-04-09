'use client';
import { useMemo, useState } from 'react';
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

export default function EcrituresPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead = isAdminRole(user) || ['reports.read_financial','expenses.read','expenses.read_all','payments.read','invoices.read'].some(p => permissionSet.has(p));
  const { canCreate } = getCrudVisibility(user, { read: ['reports.read_financial','invoices.read'], create: ['expenses.create','payments.create'] });

  const { data, isLoading } = useEcritures(canRead);
  const { data: accountsData } = useAccountsForEntry(canCreate);
  const createEntryMutation = useCreateEntry(() => setCreateDialogOpen(false));

  const entries: AccountingEntry[] = data?.data?.entries ?? [];
  const accounts = accountsData?.data ?? [];
  const filtered = entries.filter(e =>
    e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.accountDebit.includes(searchQuery) || e.accountCredit.includes(searchQuery)
  );
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  if (!canRead) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">Vous n&apos;avez pas accès aux écritures comptables.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Écritures Comptables</h1>
          <p className="text-muted-foreground mt-2">Journal général et écritures comptables</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportEntriesCsv(filtered)}><Download className="h-4 w-4 mr-2" />Exporter Excel</Button>
          {canCreate && <Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouvelle Écriture</Button>}
        </div>
      </div>

      <EcrituresStats total={entries.length} totalDebit={totalDebit} totalCredit={totalCredit} />

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher une écriture..." className="pl-10" />
        </div>
      </Card>

      <EcrituresTable entries={filtered} totalDebit={totalDebit} totalCredit={totalCredit} isLoading={isLoading} />

      <CreateJournalEntryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        accounts={accounts}
        onSubmit={async (payload) => { await createEntryMutation.mutateAsync(payload); }}
        isSubmitting={createEntryMutation.isPending}
      />
    </div>
  );
}
