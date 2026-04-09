'use client';
import { useMemo, useState } from 'react';
import { useComptes, useCreateCompte, useUpdateCompte } from '@/hooks/comptabilite/comptes/useComptes';
import { ComptesStats, ComptesTable } from '@/components/comptabilite/comptes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { CreateAccountingAccountDialog } from '@/components/accounting/CreateAccountingAccountDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { accountingAccountTypeLabel, formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import type { AccountingAccount } from '@/shared/api/billing';

export default function ComptesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead = isAdminRole(user) || ['reports.read_financial','expenses.read','expenses.read_all','expenses.read_own','payments.read','invoices.read'].some(p => permissionSet.has(p));
  const { canCreate, canUpdate } = getCrudVisibility(user, { read: ['reports.read_financial','invoices.read'], create: ['expenses.create'], update: ['expenses.update','invoices.update'] });

  const { data, isLoading } = useComptes(canRead);
  const createMutation = useCreateCompte(() => setCreateDialogOpen(false));
  const updateMutation = useUpdateCompte(() => { setEditDialogOpen(false); setSelected(null); });

  const accounts: AccountingAccount[] = data?.data?.accounts ?? [];
  const filtered = accounts.filter(a => {
    const matchSearch = a.label.toLowerCase().includes(searchQuery.toLowerCase()) || a.code.includes(searchQuery);
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    return matchSearch && matchType;
  });
  const totals = accounts.reduce((acc, a) => {
    if (a.type === 'asset') acc.assets += a.balance;
    if (a.type === 'liability') acc.liabilities += a.balance;
    if (a.type === 'revenue') acc.revenues += a.balance;
    if (a.type === 'expense') acc.expenses += a.balance;
    return acc;
  }, { assets: 0, liabilities: 0, revenues: 0, expenses: 0 });

  if (!canRead) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">Vous n&apos;avez pas accès au plan comptable.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Plan Comptable</h1><p className="text-muted-foreground mt-2">Gestion du plan comptable et comptes généraux</p></div>
        {canCreate && <Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouveau Compte</Button>}
      </div>

      <ComptesStats count={accounts.length} totals={totals} />

      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher un compte..." className="pl-10" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
            <option value="all">Tous les types</option>
            <option value="asset">Actif</option>
            <option value="liability">Passif</option>
            <option value="equity">Capital</option>
            <option value="revenue">Produits</option>
            <option value="expense">Charges</option>
          </select>
        </div>
      </Card>

      <ComptesTable accounts={filtered} isLoading={isLoading} canUpdate={canUpdate}
        onDetails={a => { setSelected(a); setDetailsOpen(true); }}
        onEdit={a => { setSelected(a); setEditDialogOpen(true); }}
      />

      <CreateAccountingAccountDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}
        onSubmit={async p => { await createMutation.mutateAsync(p); }} isSubmitting={createMutation.isPending} />

      <CreateAccountingAccountDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}
        title="Modifier le compte comptable" submitLabel="Mettre à jour"
        initialValues={{ code: selected?.code, label: selected?.label, type: selected?.type?.toUpperCase() as any, description: selected?.description || '', openingBalance: selected?.openingBalance ?? 0 }}
        onSubmit={async p => { if (!selected) return; await updateMutation.mutateAsync({ id: selected.id, values: p }); }}
        isSubmitting={updateMutation.isPending} />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Détails du compte</DialogTitle></DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div><div className="text-muted-foreground">Code</div><div className="font-semibold">{selected.code}</div></div>
              <div><div className="text-muted-foreground">Libellé</div><div className="font-semibold">{selected.label}</div></div>
              <div><div className="text-muted-foreground">Type</div><div className="font-semibold">{accountingAccountTypeLabel(selected.type)}</div></div>
              <div><div className="text-muted-foreground">Solde courant</div><div className="font-semibold">{formatAccountingCurrency(selected.balance)}</div></div>
              <div><div className="text-muted-foreground">Dernière transaction</div><div className="font-semibold">{formatAccountingDate(selected.lastTransaction)}</div></div>
              {selected.description && <div><div className="text-muted-foreground">Description</div><div className="font-semibold">{selected.description}</div></div>}
            </div>
          ) : <div className="text-sm text-muted-foreground">Aucun compte sélectionné.</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
