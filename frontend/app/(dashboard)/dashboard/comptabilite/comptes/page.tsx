'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useComptes, useCreateCompte, useDeleteCompte, useUpdateCompte } from '@/hooks/comptabilite/comptes/useComptes';
import { ComptesStats, ComptesTable } from '@/components/comptabilite/comptes';
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

const FAMILY_ORDER: AccountingFamilyRule['family'][] = [
  'CUSTOMER_RECEIVABLE',
  'SUPPLIER_PAYABLE',
  'PURCHASE_EXPENSE',
  'MISC_EXPENSE',
  'REVENUE',
  'TREASURY_BANK',
  'TREASURY_CASH',
];

export default function ComptesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const [familySelections, setFamilySelections] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<'families' | 'accounts'>('accounts');
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read', 'invoices.read'].some((p) =>
      permissionSet.has(p)
    );
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['reports.read_financial', 'invoices.read'],
    create: ['expenses.create'],
    update: ['expenses.update', 'invoices.update'],
    remove: ['expenses.delete', 'expenses.update'],
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
  const familyRuleMutation = useMutation({
    mutationFn: ({ family, accountId }: { family: AccountingFamilyRule['family']; accountId: string }) =>
      billingService.upsertAccountingFamilyRule(family, { accountId }),
    onSuccess: () => {
      toast.success('Règle de famille comptable mise à jour.');
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-family-rules'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour de la famille comptable.');
    },
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
  const accountsByType = useMemo(
    () => ({
      asset: accounts.filter((account) => account.type === 'asset'),
      liability: accounts.filter((account) => account.type === 'liability'),
      expense: accounts.filter((account) => account.type === 'expense'),
      revenue: accounts.filter((account) => account.type === 'revenue'),
    }),
    [accounts]
  );
  const orderedFamilyRules = useMemo(() => {
    const ruleMap = new Map(familyRules.map((rule) => [rule.family, rule]));
    return FAMILY_ORDER.map((family) => ruleMap.get(family)).filter(Boolean) as AccountingFamilyRule[];
  }, [familyRules]);

  const accountsForFamily = (family: AccountingFamilyRule['family']) => {
    switch (family) {
      case 'CUSTOMER_RECEIVABLE':
        return accountsByType.asset;
      case 'SUPPLIER_PAYABLE':
        return accountsByType.liability;
      case 'PURCHASE_EXPENSE':
      case 'MISC_EXPENSE':
        return accountsByType.expense;
      case 'REVENUE':
        return accountsByType.revenue;
      case 'TREASURY_BANK':
      case 'TREASURY_CASH':
        return accountsByType.asset;
      default:
        return accounts;
    }
  };

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
            <TabsTrigger value="families">Familles dynamiques</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {activeView === 'accounts'
              ? `${filtered.length} compte(s) visible(s)`
              : `${orderedFamilyRules.length} famille(s) à configurer`}
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
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="text-lg font-semibold">Familles comptables dynamiques</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cette configuration remplace les anciens codes hardcodés. Chaque famille doit pointer vers un compte réel
                du plan comptable.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {orderedFamilyRules.map((rule) => {
                const selectedValue = familySelections[rule.family] ?? rule.accountId ?? '';
                const availableAccounts = accountsForFamily(rule.family);
                return (
                  <div key={rule.family} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{rule.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {rule.description || 'Famille comptable configurable.'}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {rule.account ? rule.account.code : 'Non configuré'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={selectedValue}
                        onChange={(e) =>
                          setFamilySelections((current) => ({
                            ...current,
                            [rule.family]: e.target.value,
                          }))
                        }
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Sélectionner un compte</option>
                        {availableAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!selectedValue || familyRuleMutation.isPending}
                        onClick={() => familyRuleMutation.mutate({ family: rule.family, accountId: selectedValue })}
                      >
                        Enregistrer
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Compte actuel : {rule.account ? `${rule.account.code} - ${rule.account.label}` : 'Non configuré'}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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
