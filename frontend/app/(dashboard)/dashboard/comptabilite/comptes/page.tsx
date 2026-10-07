'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, Plus, Search } from 'lucide-react';
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
import { ImportAccountingAccountsDialog } from '@/components/accounting/ImportAccountingAccountsDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { accountingAccountTypeLabel, formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import billingService, { type AccountingAccount, type AccountingFamilyRule } from '@/shared/api/billing';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export default function ComptesPage() {
  const { user } = useAuth();
  const { selectedEnterprise } = useEnterprise();
  const accountingScope = useAccountingEnterpriseScope();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const [activeView, setActiveView] = useState<'families' | 'accounts'>('accounts');
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['accounting.read', 'accounting.accounts.manage', 'accounting.rules.read', 'accounting.diagnostics.read'].some((p) =>
      permissionSet.has(p)
    );
  const crud = getCrudVisibility(user, {
    read: ['accounting.read', 'accounting.rules.read'],
    create: ['accounting.accounts.manage', 'accounting.rules.update'],
    update: ['accounting.accounts.manage', 'accounting.rules.update'],
    remove: ['accounting.accounts.manage', 'accounting.rules.update'],
  });
  const canCreate = crud.canCreate && accountingScope.isReady && !accountingScope.isConsolidated;
  const canImport = (isAdminRole(user) || permissionSet.has('accounting.accounts.manage')) &&
    accountingScope.isReady && !accountingScope.isConsolidated;
  const canUpdate = crud.canUpdate && accountingScope.isReady && !accountingScope.isConsolidated;
  const canDelete = crud.canDelete && accountingScope.isReady && !accountingScope.isConsolidated;

  useEffect(() => {
    if (accountingScope.isConsolidated) setImportDialogOpen(false);
  }, [accountingScope.isConsolidated]);

  const { data, isLoading } = useComptes(accountingScope, canRead && accountingScope.isReady);
  const familyRulesQuery = useQuery({
    queryKey: ['billing-accounting-family-rules', selectedEnterprise?.id],
    queryFn: () => billingService.getAccountingFamilyRules({ enterpriseId: selectedEnterprise?.id }),
    enabled: canRead && Boolean(selectedEnterprise) && !accountingScope.isConsolidated,
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
    setDeleteDialogOpen(false);
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
        {(canCreate || canImport) && (
          <div className="flex flex-wrap items-center gap-2">
            {canImport && (
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Importer Excel
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Compte
              </Button>
            )}
          </div>
        )}
      </div>

      <ComptesStats count={accounts.length} totals={totals} />

      <Tabs value={accountingScope.isConsolidated ? 'accounts' : activeView} onValueChange={(value) => setActiveView(value as 'families' | 'accounts')} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="accounts">Plan comptable</TabsTrigger>
            {!accountingScope.isConsolidated && <TabsTrigger value="families">Familles des comptes </TabsTrigger>}
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
              setSelected(a);
              setDeleteDialogOpen(true);
            }}
          />
        </TabsContent>

        {!accountingScope.isConsolidated && (
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
        )}
      </Tabs>

      <CreateAccountingAccountDialog
        open={createDialogOpen && canCreate}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (p) => {
          await createMutation.mutateAsync(p);
        }}
        isSubmitting={createMutation.isPending}
      />

      <ImportAccountingAccountsDialog
        open={importDialogOpen && canImport}
        onOpenChange={setImportDialogOpen}
        enterpriseId={selectedEnterprise?.id}
        enterpriseName={selectedEnterprise?.name}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
          queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
        }}
      />

      <CreateAccountingAccountDialog
        open={editDialogOpen && canUpdate}
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
            <DialogDescription>
              Consultez les informations principales du compte comptable sélectionné.
            </DialogDescription>
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

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (deleteMutation.isPending) return;
          setDeleteDialogOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce compte comptable ?</DialogTitle>
            <DialogDescription>
              {selected
                ? `Confirmez la suppression du compte ${selected.code} - ${selected.label}.`
                : 'Confirmez la suppression de ce compte.'}{' '}
              Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!selected || deleteMutation.isPending}
              onClick={() => {
                if (selected) deleteMutation.mutate(selected.id);
              }}
            >
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
