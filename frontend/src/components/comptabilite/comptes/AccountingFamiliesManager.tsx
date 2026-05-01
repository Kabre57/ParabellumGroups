'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Circle, CircleDot, Link2, Pencil, Plus, Save, Search, Settings2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import billingService, { type AccountingAccount, type AccountingFamilyRule } from '@/shared/api/billing';

type FamilyAccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

type FamilyFormState = {
  code: string;
  label: string;
  displayType: string;
  accountType: FamilyAccountType;
  description: string;
};

type PendingRule = {
  accountId: string;
  isPrimary: boolean;
};

interface AccountingFamiliesManagerProps {
  accounts: AccountingAccount[];
  families: AccountingFamilyRule[];
  isLoading?: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const FAMILY_TYPE_OPTIONS: Array<{
  label: string;
  accountType: FamilyAccountType;
  className: string;
}> = [
  { label: 'Charge', accountType: 'EXPENSE', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  { label: 'Produit', accountType: 'REVENUE', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  { label: 'Dette', accountType: 'LIABILITY', className: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
  { label: 'Trésorerie', accountType: 'ASSET', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  { label: 'Créance', accountType: 'ASSET', className: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100' },
  { label: 'Capital', accountType: 'EQUITY', className: 'bg-violet-100 text-violet-800 hover:bg-violet-100' },
];

const ACCOUNT_TYPE_LABELS: Record<FamilyAccountType, string> = {
  ASSET: 'Actif',
  LIABILITY: 'Passif',
  EQUITY: 'Capitaux propres',
  REVENUE: 'Produit',
  EXPENSE: 'Charge',
};

const DEFAULT_FORM: FamilyFormState = {
  code: '',
  label: '',
  displayType: 'Charge',
  accountType: 'EXPENSE',
  description: '',
};

const normalizeFamilyCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');

const typeOptionFor = (family: AccountingFamilyRule | FamilyFormState) => {
  const displayType = String('displayType' in family ? family.displayType : family.type || '').trim();
  const accountType = String((family as any).accountType || (family as any).expectedType || '').toUpperCase();

  return (
    FAMILY_TYPE_OPTIONS.find((option) => option.label.toLowerCase() === displayType.toLowerCase()) ||
    FAMILY_TYPE_OPTIONS.find((option) => option.accountType === accountType) ||
    FAMILY_TYPE_OPTIONS[0]
  );
};

const accountTypeMatches = (account: AccountingAccount, accountType: FamilyAccountType) =>
  account.type.toUpperCase() === accountType;

const linkedAccountCodes = (family: AccountingFamilyRule) =>
  family.rules
    .map((rule) => rule.account?.code)
    .filter(Boolean)
    .join(', ');

export function AccountingFamiliesManager({
  accounts,
  families,
  isLoading = false,
  canCreate,
  canUpdate,
  canDelete,
}: AccountingFamiliesManagerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFamilyCode, setEditingFamilyCode] = useState<string | null>(null);
  const [form, setForm] = useState<FamilyFormState>(DEFAULT_FORM);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [pendingRules, setPendingRules] = useState<PendingRule[]>([]);

  const activeFamily = useMemo(
    () => (editingFamilyCode ? families.find((family) => family.family === editingFamilyCode) || null : null),
    [editingFamilyCode, families]
  );

  const filteredFamilies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return families.filter((family) => {
      const type = family.displayType || family.type || '';
      const matchesType = typeFilter === 'all' || type === typeFilter;
      const matchesSearch =
        !query ||
        family.family.toLowerCase().includes(query) ||
        family.label.toLowerCase().includes(query) ||
        linkedAccountCodes(family).toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [families, search, typeFilter]);

  const usedAccountIds = useMemo(() => {
    const existingIds = activeFamily?.rules.map((rule) => rule.accountId) ?? [];
    const pendingIds = pendingRules.map((rule) => rule.accountId);
    return new Set([...existingIds, ...pendingIds]);
  }, [activeFamily?.rules, pendingRules]);

  const compatibleAccounts = useMemo(() => {
    const query = accountSearch.trim().toLowerCase();
    return accounts
      .filter((account) => {
        if (!accountTypeMatches(account, form.accountType)) return false;
        if (usedAccountIds.has(account.id)) return false;
        if (!query) return true;
        return account.code.toLowerCase().includes(query) || account.label.toLowerCase().includes(query);
      })
      .sort((left, right) => left.code.localeCompare(right.code, 'fr'));
  }, [accounts, accountSearch, form.accountType, usedAccountIds]);

  const invalidateFamilies = () => {
    queryClient.invalidateQueries({ queryKey: ['billing-accounting-family-rules'] });
  };

  const createFamilyMutation = useMutation({
    mutationFn: async () => {
      const created = await billingService.createAccountingFamily({
        code: form.code,
        label: form.label,
        displayType: form.displayType,
        accountType: form.accountType,
        description: form.description || undefined,
      });

      for (const pending of pendingRules) {
        await billingService.addAccountingFamilyRule(form.code, {
          accountId: pending.accountId,
          isPrimary: pending.isPrimary,
        });
      }

      return created;
    },
    onSuccess: () => {
      toast.success('Famille comptable créée.');
      invalidateFamilies();
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création de la famille comptable.');
    },
  });

  const updateFamilyMutation = useMutation({
    mutationFn: () =>
      billingService.updateAccountingFamily(form.code, {
        label: form.label,
        displayType: form.displayType,
        accountType: form.accountType,
        description: form.description || null,
      }),
    onSuccess: () => {
      toast.success('Famille comptable mise à jour.');
      invalidateFamilies();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour de la famille comptable.');
    },
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: (family: string) => billingService.deleteAccountingFamily(family),
    onSuccess: () => {
      toast.success('Famille comptable supprimée.');
      invalidateFamilies();
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression de la famille comptable.');
    },
  });

  const addRuleMutation = useMutation({
    mutationFn: ({ family, accountId }: { family: string; accountId: string }) =>
      billingService.addAccountingFamilyRule(family, { accountId }),
    onSuccess: () => {
      toast.success('Compte réel rattaché.');
      setSelectedAccountId('');
      setAccountSearch('');
      invalidateFamilies();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rattachement du compte.');
    },
  });

  const makePrimaryMutation = useMutation({
    mutationFn: (ruleId: string) => billingService.updateAccountingFamilyRule(ruleId, { isPrimary: true }),
    onSuccess: () => {
      toast.success('Compte par défaut mis à jour.');
      invalidateFamilies();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour du compte par défaut.');
    },
  });

  const removeRuleMutation = useMutation({
    mutationFn: (ruleId: string) => billingService.deleteAccountingFamilyRule(ruleId),
    onSuccess: () => {
      toast.success('Compte retiré de la famille.');
      invalidateFamilies();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du retrait du compte.');
    },
  });

  const openCreateDialog = () => {
    setEditingFamilyCode(null);
    setForm(DEFAULT_FORM);
    setAccountSearch('');
    setSelectedAccountId('');
    setPendingRules([]);
    setDialogOpen(true);
  };

  const openEditDialog = (family: AccountingFamilyRule) => {
    const typeOption = typeOptionFor(family);
    setEditingFamilyCode(family.family);
    setForm({
      code: family.family,
      label: family.label,
      displayType: family.displayType || family.type || typeOption.label,
      accountType: (family.accountType || family.expectedType || typeOption.accountType) as FamilyAccountType,
      description: family.description || '',
    });
    setAccountSearch('');
    setSelectedAccountId('');
    setPendingRules([]);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingFamilyCode(null);
    setForm(DEFAULT_FORM);
    setAccountSearch('');
    setSelectedAccountId('');
    setPendingRules([]);
  };

  const updateForm = <K extends keyof FamilyFormState>(key: K, value: FamilyFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateType = (label: string) => {
    const option = FAMILY_TYPE_OPTIONS.find((item) => item.label === label) || FAMILY_TYPE_OPTIONS[0];
    setForm((current) => ({
      ...current,
      displayType: option.label,
      accountType: option.accountType,
    }));
    setSelectedAccountId('');
  };

  const selectedCompatibleAccount = compatibleAccounts.find((account) => account.id === selectedAccountId) || null;
  const accountIdToAdd = selectedCompatibleAccount?.id || (compatibleAccounts.length === 1 ? compatibleAccounts[0].id : '');

  const addSelectedAccount = () => {
    if (!accountIdToAdd) {
      toast.error('Sélectionnez un compte compatible avant d’ajouter.');
      return;
    }
    if (activeFamily) {
      addRuleMutation.mutate({ family: activeFamily.family, accountId: accountIdToAdd });
      return;
    }

    setPendingRules((current) => [
      ...current,
      {
        accountId: accountIdToAdd,
        isPrimary: current.length === 0,
      },
    ]);
    setSelectedAccountId('');
  };

  const saveFamily = () => {
    const normalizedCode = normalizeFamilyCode(form.code);
    setForm((current) => ({ ...current, code: normalizedCode }));

    if (!normalizedCode || !form.label.trim()) {
      toast.error('Le code famille et l intitulé sont obligatoires.');
      return;
    }

    if (activeFamily) {
      updateFamilyMutation.mutate();
      return;
    }

    createFamilyMutation.mutate();
  };

  const selectedOption = typeOptionFor(form);
  const isSaving = createFamilyMutation.isPending || updateFamilyMutation.isPending;
  const existingRules = activeFamily?.rules ?? [];
  const pendingRuleRows = pendingRules.map((rule) => ({
    ...rule,
    account: accounts.find((account) => account.id === rule.accountId) || null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Familles comptables</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez les familles et leur correspondance avec les comptes réels du plan comptable.
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une famille..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {FAMILY_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.label} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[150px]">Code</TableHead>
              <TableHead>Intitulé famille</TableHead>
              <TableHead className="w-[160px]">Type</TableHead>
              <TableHead>Comptes réels liés</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  Chargement des familles comptables...
                </TableCell>
              </TableRow>
            ) : filteredFamilies.length ? (
              filteredFamilies.map((family) => {
                const option = typeOptionFor(family);
                const linkedCodes = linkedAccountCodes(family);
                return (
                  <TableRow key={family.family}>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                        {family.family}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-950">{family.label}</div>
                      {family.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">{family.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={option.className}>{family.displayType || family.type || option.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {linkedCodes ? (
                        <span className="text-sm text-slate-700">{linkedCodes}</span>
                      ) : (
                        <span className="text-sm text-rose-600">Aucun compte lié</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(family)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </Button>
                        )}
                        {canDelete && !family.isSystem && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(`Supprimer la famille ${family.family} ?`)) {
                                deleteFamilyMutation.mutate(family.family);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  Aucune famille ne correspond aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>{activeFamily ? 'Modifier la famille' : 'Nouvelle famille comptable'}</DialogTitle>
              <Button type="button" onClick={saveFamily} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="family-code">Code famille *</Label>
                <Input
                  id="family-code"
                  value={form.code}
                  disabled={Boolean(activeFamily)}
                  onChange={(event) => updateForm('code', normalizeFamilyCode(event.target.value))}
                  placeholder="ACHAT_M"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="family-label">Intitulé *</Label>
                <Input
                  id="family-label"
                  value={form.label}
                  onChange={(event) => updateForm('label', event.target.value)}
                  placeholder="Achats de marchandises"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={selectedOption.label} onValueChange={updateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label} - {ACCOUNT_TYPE_LABELS[option.accountType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type comptable réel</Label>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <Settings2 className="mr-2 h-4 w-4 text-slate-400" />
                  {ACCOUNT_TYPE_LABELS[form.accountType]}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="family-description">Description</Label>
                <Textarea
                  id="family-description"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Utilisation de cette famille dans les écritures et workflows comptables."
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-5">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">Comptes réels liés</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Associez un ou plusieurs comptes et choisissez le compte par défaut.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[220px_minmax(280px,1fr)_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={accountSearch}
                      onChange={(event) => setAccountSearch(event.target.value)}
                      placeholder="Rechercher compte"
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={selectedCompatibleAccount?.id || ''}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={!compatibleAccounts.length}
                  >
                    <option value="">
                      {compatibleAccounts.length ? 'Compte compatible' : 'Aucun compte compatible'}
                    </option>
                    {compatibleAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSelectedAccount}
                    disabled={!accountIdToAdd || addRuleMutation.isPending}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <div className="mb-3 text-xs text-slate-500">
                {compatibleAccounts.length === 1 && !selectedCompatibleAccount ? (
                  <span>Un seul compte compatible trouvé: cliquez sur Ajouter pour le rattacher directement.</span>
                ) : !compatibleAccounts.length ? (
                  <span>
                    Aucun compte compatible avec le type {ACCOUNT_TYPE_LABELS[form.accountType]}. Vérifiez le type de
                    famille ou créez un compte comptable correspondant.
                  </span>
                ) : (
                  <span>{compatibleAccounts.length} compte(s) compatible(s) disponible(s).</span>
                )}
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[150px]">Numéro compte</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead className="w-[160px]">Par défaut ?</TableHead>
                      <TableHead className="w-[90px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-sm">{rule.account?.code || '-'}</TableCell>
                        <TableCell>{rule.account?.label || 'Compte indisponible'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={rule.isPrimary || makePrimaryMutation.isPending}
                            onClick={() => makePrimaryMutation.mutate(rule.id)}
                          >
                            {rule.isPrimary ? (
                              <CircleDot className="mr-2 h-4 w-4 text-blue-600" />
                            ) : (
                              <Circle className="mr-2 h-4 w-4" />
                            )}
                            {rule.isPrimary ? 'Oui' : 'Non'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={removeRuleMutation.isPending}
                            onClick={() => removeRuleMutation.mutate(rule.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingRuleRows.map((rule) => (
                      <TableRow key={rule.accountId}>
                        <TableCell className="font-mono text-sm">{rule.account?.code || '-'}</TableCell>
                        <TableCell>{rule.account?.label || 'Compte sélectionné'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPendingRules((current) =>
                                current.map((item) => ({
                                  ...item,
                                  isPrimary: item.accountId === rule.accountId,
                                }))
                              )
                            }
                          >
                            {rule.isPrimary ? (
                              <CircleDot className="mr-2 h-4 w-4 text-blue-600" />
                            ) : (
                              <Circle className="mr-2 h-4 w-4" />
                            )}
                            {rule.isPrimary ? 'Oui' : 'Non'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setPendingRules((current) => {
                                const next = current.filter((item) => item.accountId !== rule.accountId);
                                if (!next.some((item) => item.isPrimary) && next[0]) {
                                  next[0] = { ...next[0], isPrimary: true };
                                }
                                return next;
                              })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!existingRules.length && !pendingRuleRows.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                          Aucun compte réel lié à cette famille.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
