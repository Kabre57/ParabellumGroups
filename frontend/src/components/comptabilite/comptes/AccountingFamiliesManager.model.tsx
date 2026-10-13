'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from 'sonner';








import billingService, { type AccountingAccount, type AccountingFamilyRule } from '@/shared/api/billing';

export type FamilyAccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type FamilyFormState = {
  code: string;
  label: string;
  displayType: string;
  accountType: FamilyAccountType;
  description: string;
};

export type PendingRule = {
  accountId: string;
  isPrimary: boolean;
};

export interface AccountingFamiliesManagerProps {
  accounts: AccountingAccount[];
  families: AccountingFamilyRule[];
  isLoading?: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const FAMILY_TYPE_OPTIONS: Array<{
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

export const ACCOUNT_TYPE_LABELS: Record<FamilyAccountType, string> = {
  ASSET: 'Actif',
  LIABILITY: 'Passif',
  EQUITY: 'Capitaux propres',
  REVENUE: 'Produit',
  EXPENSE: 'Charge',
};

export const SYSTEM_FAMILY_LABELS: Record<string, string> = {
  CUSTOMER_RECEIVABLE: 'Créances clients',
  SUPPLIER_PAYABLE: 'Dettes fournisseurs',
  PURCHASE_EXPENSE: 'Achats et approvisionnements',
  MISC_EXPENSE: 'Charges diverses',
  REVENUE: 'Ventes et prestations',
  TREASURY_BANK: 'Trésorerie — Banque',
  TREASURY_CASH: 'Trésorerie — Caisse',
};

export const getFamilyLabel = (family: AccountingFamilyRule) =>
  SYSTEM_FAMILY_LABELS[family.family] || family.label || 'Famille comptable';

export const DEFAULT_FORM: FamilyFormState = {
  code: '',
  label: '',
  displayType: 'Charge',
  accountType: 'EXPENSE',
  description: '',
};

export const normalizeFamilyCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');

export const typeOptionFor = (family: AccountingFamilyRule | FamilyFormState) => {
  const displayType = String('displayType' in family ? family.displayType : family.type || '').trim();
  const accountType = String((family as any).accountType || (family as any).expectedType || '').toUpperCase();

  return (
    FAMILY_TYPE_OPTIONS.find((option) => option.label.toLowerCase() === displayType.toLowerCase()) ||
    FAMILY_TYPE_OPTIONS.find((option) => option.accountType === accountType) ||
    FAMILY_TYPE_OPTIONS[0]
  );
};

export const accountTypeMatches = (account: AccountingAccount, accountType: FamilyAccountType) =>
  account.type.toUpperCase() === accountType;

export const linkedAccountCodes = (family: AccountingFamilyRule) =>
  family.rules
    .map((rule) => rule.account?.code)
    .filter(Boolean)
    .join(', ');


export function useAccountingFamiliesManagerModel(props: AccountingFamiliesManagerProps) {
  const {
  accounts,
  families,
  isLoading = false,
  canCreate,
  canUpdate,
  canDelete,
} = props;

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
        getFamilyLabel(family).toLowerCase().includes(query) ||
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
        await billingService.addAccountingFamilyRule(created.data.family, {
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
      if (activeFamily.isSystem) {
        closeDialog();
        return;
      }
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

  return {
    queryClient,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    dialogOpen,
    setDialogOpen,
    editingFamilyCode,
    setEditingFamilyCode,
    form,
    setForm,
    accountSearch,
    setAccountSearch,
    selectedAccountId,
    setSelectedAccountId,
    pendingRules,
    setPendingRules,
    activeFamily,
    filteredFamilies,
    usedAccountIds,
    compatibleAccounts,
    invalidateFamilies,
    createFamilyMutation,
    updateFamilyMutation,
    deleteFamilyMutation,
    addRuleMutation,
    makePrimaryMutation,
    removeRuleMutation,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    updateForm,
    updateType,
    selectedCompatibleAccount,
    accountIdToAdd,
    addSelectedAccount,
    saveFamily,
    selectedOption,
    isSaving,
    existingRules,
    pendingRuleRows,
  };
}
