'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useComptes, useCreateCompte, useDeleteCompte, useUpdateCompte } from '@/hooks/comptabilite/comptes/useComptes';
import { AccountingFamiliesManager, ComptesStats, ComptesTable } from '@/components/comptabilite/comptes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { CreateAccountingAccountDialog } from '@/components/accounting/CreateAccountingAccountDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { accountingAccountTypeLabel, formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import billingService, { type AccountingAccount, type AccountingFamilyRule } from '@/shared/api/billing';

export default function ComptesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const [activeView, setActiveView] = useState<'families' | 'accounts'>('accounts');
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['accounting.read', 'accounting.accounts.manage', 'accounting.rules.read', 'accounting.diagnostics.read'].some((p) =>
      permissionSet.has(p)
    );
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['accounting.read', 'accounting.rules.read'],
    create: ['accounting.accounts.manage', 'accounting.rules.update'],
    update: ['accounting.accounts.manage', 'accounting.rules.update'],
    remove: ['accounting.accounts.manage', 'accounting.rules.update'],
  });

  const { data, isLoading } = useComptes(canRead);
  const familyRulesQuery = useQuery({
    queryKey: ['billing-accounting-family-rules'],
    queryFn: () => billingService.getAccountingFamilyRules(),
    enabled: canRead,
  });

  const createMutation = useCreateCompte(() => setCreateDialogOpen(false));
  const updateMutation = useUpdateCompte(() => {
    setEditDialogOpen(false);
    setSelected(null);
  });
  const deleteMutation = useDeleteCompte(() => {
    if (selected?.id) {
      setSelected(null);
    }
  });

  const accounts: AccountingAccount[] = data?.data?.accounts ?? [];
  const familyRules: AccountingFamilyRule[] = familyRulesQuery.data?.data ?? [];
  const filtered = accounts.filter((a) => {
    const matchSearch = a.label.toLowerCase().includes(searchQuery.toLowerCase()) || a.code.includes(searchQuery);
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    return matchSearch && matchType;
  });
  const totals = accounts.reduce(
    (acc, a) => {
      if (a.type === 'asset') acc.assets += a.balance;
      if (a.type === 'liability') acc.liabilities += a.balance;
      if (a.type === 'revenue') acc.revenues += a.balance;
      if (a.type === 'expense') acc.expenses += a.balance;
      return acc;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plan Comptable</h1>
          <p className="mt-2 text-muted-foreground">
            Gestion du plan comptable, des comptes généraux et des familles utilisées par le moteur comptable.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Compte
          </Button>
        )}
      </div>

      <ComptesStats count={accounts.length} totals={totals} />

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'families' | 'accounts')} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="accounts">Plan comptable</TabsTrigger>
            <TabsTrigger value="families">Familles des comptes </TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {activeView === 'accounts'
              ? `${filtered.length} compte(s) visible(s)`
              : `${familyRules.length} famille(s) à configurer`}
          </div>
        </div>

        <TabsContent value="accounts" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
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
                className="h-10 rounded-md border px-4 py-2 dark:border-gray-700 dark:bg-gray-800 lg:w-56"
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

          <ComptesTable
            accounts={filtered}
            isLoading={isLoading}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDetails={(a) => {
              setSelected(a);
              setDetailsOpen(true);
            }}
            onEdit={(a) => {
              setSelected(a);
              setEditDialogOpen(true);
            }}
            onDelete={(a) => {
              const confirmed = window.confirm(`Supprimer le compte ${a.code} - ${a.label} ?`);
              if (!confirmed) return;
              deleteMutation.mutate(a.id);
            }}
          />
        </TabsContent>

        <TabsContent value="families" className="space-y-4">
          <AccountingFamiliesManager
            accounts={accounts}
            families={familyRules}
            isLoading={familyRulesQuery.isLoading}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>

      <CreateAccountingAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (p) => {
          await createMutation.mutateAsync(p);
        }}
        isSubmitting={createMutation.isPending}
      />

      <CreateAccountingAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Modifier le compte comptable"
        submitLabel="Mettre à jour"
        initialValues={{
          code: selected?.code,
          label: selected?.label,
          type: selected?.type?.toUpperCase() as any,
          description: selected?.description || '',
          openingBalance: selected?.openingBalance ?? 0,
        }}
        onSubmit={async (p) => {
          if (!selected) return;
          await updateMutation.mutateAsync({ id: selected.id, values: p });
        }}
        isSubmitting={updateMutation.isPending}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Détails du compte</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Code</div>
                <div className="font-semibold">{selected.code}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Libellé</div>
                <div className="font-semibold">{selected.label}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <div className="font-semibold">{accountingAccountTypeLabel(selected.type)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Solde courant</div>
                <div className="font-semibold">{formatAccountingCurrency(selected.balance)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Dernière transaction</div>
                <div className="font-semibold">{formatAccountingDate(selected.lastTransaction)}</div>
              </div>
              {selected.description && (
                <div>
                  <div className="text-muted-foreground">Description</div>
                  <div className="font-semibold">{selected.description}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Aucun compte sélectionné.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
