'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, Search, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { accountingAccountTypeLabel, formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import { exportBalanceCsv } from '@/components/accounting/accountingExport';
import billingService, { type AccountingAccount, type AccountingEntry } from '@/shared/api/billing';
import { enterpriseApi, type Enterprise } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { getCrudVisibility } from '@/shared/action-visibility';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';
type ViewMode = 'consolidated' | 'byEnterprise';
type SortMode = 'code' | 'enterprise' | 'label' | 'debit' | 'credit' | 'balance';
type ScopeValue = 'all' | 'parent' | 'subsidiaries' | `enterprise:${string}`;

interface BalanceRow {
  id: string;
  accountId?: string;
  code: string;
  label: string;
  type: AccountingAccount['type'] | string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  balanceDebit: number;
  balanceCredit: number;
  movementCount: number;
  lastTransaction?: string | null;
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
  { value: 'week', label: '7 derniers jours' },
  { value: 'all', label: 'Tout l\'exercice' },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'code', label: 'Compte' },
  { value: 'enterprise', label: 'Entreprise' },
  { value: 'label', label: 'Intitulé' },
  { value: 'debit', label: 'Débit décroissant' },
  { value: 'credit', label: 'Crédit décroissant' },
  { value: 'balance', label: 'Solde décroissant' },
];

const normalizeEnterpriseId = (value: string | number | null | undefined): string | null => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value);
  return normalized.trim() ? normalized : null;
};

const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inferAccountType = (code: string): AccountingAccount['type'] => {
  if (code.startsWith('6')) return 'expense';
  if (code.startsWith('7')) return 'revenue';
  if (code.startsWith('1')) return 'equity';
  if (code.startsWith('4')) return 'liability';
  return 'asset';
};

const openingSides = (account: AccountingAccount) => {
  const opening = amount(account.openingBalance);
  if (!opening) return { openingDebit: 0, openingCredit: 0 };

  const debitNormal = account.type === 'asset' || account.type === 'expense';
  if (opening > 0) {
    return debitNormal
      ? { openingDebit: opening, openingCredit: 0 }
      : { openingDebit: 0, openingCredit: opening };
  }

  return debitNormal
    ? { openingDebit: 0, openingCredit: Math.abs(opening) }
    : { openingDebit: Math.abs(opening), openingCredit: 0 };
};

const finalizeRow = (row: BalanceRow): BalanceRow => {
  const debitTotal = row.openingDebit + row.debit;
  const creditTotal = row.openingCredit + row.credit;
  const net = debitTotal - creditTotal;

  return {
    ...row,
    balanceDebit: net > 0 ? net : 0,
    balanceCredit: net < 0 ? Math.abs(net) : 0,
  };
};

const isRowEmpty = (row: BalanceRow) =>
  row.openingDebit === 0 &&
  row.openingCredit === 0 &&
  row.debit === 0 &&
  row.credit === 0 &&
  row.balanceDebit === 0 &&
  row.balanceCredit === 0;

const buildParentMap = (enterprises: Enterprise[]) => {
  const parentById = new Map<string, string | null>();
  enterprises.forEach((enterprise) => {
    const enterpriseId = normalizeEnterpriseId(enterprise.id);
    if (!enterpriseId) return;
    parentById.set(enterpriseId, normalizeEnterpriseId(enterprise.parentEnterpriseId));
  });
  return parentById;
};

const isDescendantOf = (enterpriseId: string | null, rootId: string | null, parentById: Map<string, string | null>) => {
  if (!enterpriseId || !rootId || enterpriseId === rootId) return false;

  let cursor = parentById.get(enterpriseId);
  while (cursor) {
    if (cursor === rootId) return true;
    cursor = parentById.get(cursor) || null;
  }

  return false;
};

const enterpriseLabel = (
  enterprise: Enterprise,
  currentEnterpriseId: string | null,
  descendantIds: Set<string>,
  enterprises: Enterprise[]
) => {
  const enterpriseId = normalizeEnterpriseId(enterprise.id);
  const hasChildren = enterprises.some((candidate) => normalizeEnterpriseId(candidate.parentEnterpriseId) === enterpriseId);
  if (enterpriseId === currentEnterpriseId && hasChildren) return `${enterprise.name} · mère`;
  if (enterpriseId && descendantIds.has(enterpriseId)) return `${enterprise.name} · filiale`;
  return enterprise.name;
};

const buildBalanceRows = ({
  accounts,
  entries,
  viewMode,
  includeEmptyAccounts,
  useOpeningBalances,
}: {
  accounts: AccountingAccount[];
  entries: AccountingEntry[];
  viewMode: ViewMode;
  includeEmptyAccounts: boolean;
  useOpeningBalances: boolean;
}) => {
  const accountByCode = new Map(accounts.map((account) => [account.code, account]));
  const rows = new Map<string, BalanceRow>();

  const ensureRow = ({
    code,
    label,
    enterpriseId,
    enterpriseName,
  }: {
    code: string;
    label?: string;
    enterpriseId?: number | null;
    enterpriseName?: string | null;
  }) => {
    const account = accountByCode.get(code);
    const rowKey = viewMode === 'byEnterprise' ? `${enterpriseId ?? 'none'}:${code}` : code;
    const existing = rows.get(rowKey);
    if (existing) return existing;

    const opening = account && useOpeningBalances ? openingSides(account) : { openingDebit: 0, openingCredit: 0 };
    const row: BalanceRow = {
      id: rowKey,
      accountId: account?.id,
      code,
      label: account?.label || label || 'Compte non référencé',
      type: account?.type || inferAccountType(code),
      enterpriseId: viewMode === 'byEnterprise' ? enterpriseId ?? null : null,
      enterpriseName: viewMode === 'byEnterprise' ? enterpriseName || 'Entreprise non renseignée' : null,
      openingDebit: opening.openingDebit,
      openingCredit: opening.openingCredit,
      debit: 0,
      credit: 0,
      balanceDebit: 0,
      balanceCredit: 0,
      movementCount: 0,
      lastTransaction: account?.lastTransaction || null,
    };
    rows.set(rowKey, row);
    return row;
  };

  if (viewMode === 'consolidated' && includeEmptyAccounts) {
    accounts.forEach((account) => {
      ensureRow({ code: account.code, label: account.label });
    });
  }

  const touchRow = (row: BalanceRow, entry: AccountingEntry) => {
    row.movementCount += 1;
    if (!row.lastTransaction || new Date(entry.date).getTime() > new Date(row.lastTransaction).getTime()) {
      row.lastTransaction = entry.date;
    }
  };

  entries.forEach((entry) => {
    const enterpriseId = entry.enterpriseId ?? null;
    const enterpriseName = entry.enterpriseName || null;

    if (entry.accountDebit) {
      const row = ensureRow({
        code: entry.accountDebit,
        label: entry.accountDebitLabel,
        enterpriseId,
        enterpriseName,
      });
      row.debit += amount(entry.debit);
      touchRow(row, entry);
    }

    if (entry.accountCredit) {
      const row = ensureRow({
        code: entry.accountCredit,
        label: entry.accountCreditLabel,
        enterpriseId,
        enterpriseName,
      });
      row.credit += amount(entry.credit);
      touchRow(row, entry);
    }
  });

  return Array.from(rows.values())
    .map(finalizeRow)
    .filter((row) => includeEmptyAccounts || !isRowEmpty(row));
};

export default function BalanceComptesPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('all');
  const [scope, setScope] = useState<ScopeValue>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [sortMode, setSortMode] = useState<SortMode>('code');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeEmptyAccounts, setIncludeEmptyAccounts] = useState(true);

  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read', 'invoices.read'].some((permission) =>
      permissionSet.has(permission)
    );
  const { canExport } = getCrudVisibility(user, {
    read: ['reports.read_financial', 'expenses.read'],
    export: ['reports.export'],
  });

  const currentEnterpriseId = normalizeEnterpriseId(user?.enterpriseId);

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'balance-comptes'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: canRead,
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const parentById = useMemo(() => buildParentMap(accessibleEnterprises), [accessibleEnterprises]);
  const descendantEnterpriseIds = useMemo(() => {
    const ids = accessibleEnterprises
      .map((enterprise) => normalizeEnterpriseId(enterprise.id))
      .filter((enterpriseId): enterpriseId is string => isDescendantOf(enterpriseId, currentEnterpriseId, parentById));
    return new Set(ids);
  }, [accessibleEnterprises, currentEnterpriseId, parentById]);

  const currentEnterprise = useMemo(
    () => accessibleEnterprises.find((enterprise) => normalizeEnterpriseId(enterprise.id) === currentEnterpriseId),
    [accessibleEnterprises, currentEnterpriseId]
  );

  const queryEnterpriseId = useMemo(() => {
    if (scope === 'parent') return currentEnterpriseId || undefined;
    if (scope.startsWith('enterprise:')) return scope.replace('enterprise:', '') || undefined;
    return undefined;
  }, [currentEnterpriseId, scope]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounting-balance', period, queryEnterpriseId || 'all'],
    queryFn: () =>
      billingService.getAccountingOverview(period, queryEnterpriseId ? { enterpriseId: queryEnterpriseId } : undefined),
    enabled: canRead,
  });

  const overview = data?.data;
  const rawEntries = overview?.entries ?? [];
  const accounts = overview?.accounts ?? [];

  const scopedEntries = useMemo(() => {
    if (scope !== 'subsidiaries') return rawEntries;

    return rawEntries.filter((entry) => {
      const enterpriseId = normalizeEnterpriseId(entry.enterpriseId);
      return enterpriseId ? descendantEnterpriseIds.has(enterpriseId) : false;
    });
  }, [descendantEnterpriseIds, rawEntries, scope]);

  const useOpeningBalances = viewMode === 'consolidated' && scope !== 'subsidiaries';

  const balanceRows = useMemo(
    () =>
      buildBalanceRows({
        accounts,
        entries: scopedEntries,
        viewMode,
        includeEmptyAccounts,
        useOpeningBalances,
      }),
    [accounts, includeEmptyAccounts, scopedEntries, useOpeningBalances, viewMode]
  );

  const visibleRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchedRows = normalizedSearch
      ? balanceRows.filter((row) =>
          [
            row.code,
            row.label,
            accountingAccountTypeLabel(row.type),
            row.enterpriseName || '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        )
      : balanceRows;

    return [...searchedRows].sort((left, right) => {
      if (sortMode === 'enterprise') {
        return `${left.enterpriseName || ''}${left.code}`.localeCompare(`${right.enterpriseName || ''}${right.code}`, 'fr');
      }
      if (sortMode === 'label') return left.label.localeCompare(right.label, 'fr');
      if (sortMode === 'debit') return right.debit - left.debit;
      if (sortMode === 'credit') return right.credit - left.credit;
      if (sortMode === 'balance') {
        return Math.max(right.balanceDebit, right.balanceCredit) - Math.max(left.balanceDebit, left.balanceCredit);
      }
      return left.code.localeCompare(right.code, 'fr', { numeric: true });
    });
  }, [balanceRows, searchQuery, sortMode]);

  const totals = useMemo(
    () =>
      visibleRows.reduce(
        (accumulator, row) => {
          accumulator.openingDebit += row.openingDebit;
          accumulator.openingCredit += row.openingCredit;
          accumulator.debit += row.debit;
          accumulator.credit += row.credit;
          accumulator.balanceDebit += row.balanceDebit;
          accumulator.balanceCredit += row.balanceCredit;
          return accumulator;
        },
        { openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, balanceDebit: 0, balanceCredit: 0 }
      ),
    [visibleRows]
  );

  const movementGap = Math.abs(totals.debit - totals.credit);
  const scopeLabel = useMemo(() => {
    if (scope === 'subsidiaries') return 'Filiales uniquement';
    if (scope === 'parent') return currentEnterprise?.name || 'Entreprise mère';
    if (scope.startsWith('enterprise:')) {
      const enterpriseId = scope.replace('enterprise:', '');
      return accessibleEnterprises.find((enterprise) => normalizeEnterpriseId(enterprise.id) === enterpriseId)?.name || 'Entreprise';
    }
    return descendantEnterpriseIds.size > 0 ? 'Mère + filiales' : 'Toutes les entreprises';
  }, [accessibleEnterprises, currentEnterprise?.name, descendantEnterpriseIds.size, scope]);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès à la balance des comptes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Balance des comptes</h1>
              <p className="mt-1 text-muted-foreground">Débits, crédits et soldes par compte comptable.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {canExport && (
            <Button onClick={() => exportBalanceCsv(visibleRows, `balance-des-comptes-${period}.csv`)}>
              <Download className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Périmètre</p>
          <p className="mt-2 text-xl font-semibold">{scopeLabel}</p>
          <p className="mt-2 text-xs text-muted-foreground">{visibleRows.length} comptes affichés</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Mouvements débit</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{formatAccountingCurrency(totals.debit)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Sur la période sélectionnée</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Mouvements crédit</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatAccountingCurrency(totals.credit)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Sur la période sélectionnée</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Écart mouvements</p>
          <p className={`mt-2 text-2xl font-bold ${movementGap < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
            {formatAccountingCurrency(movementGap)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{movementGap < 0.01 ? 'Balance équilibrée' : 'À contrôler'}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_240px_180px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un compte ou une entreprise..."
              className="pl-10"
            />
          </div>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as ScopeValue)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">{descendantEnterpriseIds.size > 0 ? 'Mère + filiales' : 'Toutes les entreprises'}</option>
            {currentEnterpriseId && (
              <option value="parent">{currentEnterprise?.name || 'Entreprise courante'} uniquement</option>
            )}
            {descendantEnterpriseIds.size > 0 && <option value="subsidiaries">Filiales uniquement</option>}
            {accessibleEnterprises.length > 0 && <option disabled>──────────</option>}
            {accessibleEnterprises.map((enterprise) => (
              <option key={String(enterprise.id)} value={`enterprise:${enterprise.id}`}>
                {enterpriseLabel(enterprise, currentEnterpriseId, descendantEnterpriseIds, accessibleEnterprises)}
              </option>
            ))}
          </select>

          <select
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="consolidated">Vue consolidée</option>
            <option value="byEnterprise">Par entreprise</option>
          </select>

          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Trier par {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeEmptyAccounts}
            onChange={(event) => setIncludeEmptyAccounts(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Inclure les comptes sans mouvement
        </label>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                  {viewMode === 'byEnterprise' && <th className="px-4 py-3 font-semibold">Entreprise</th>}
                  <th className="px-4 py-3 font-semibold">Numéro de compte</th>
                  <th className="px-4 py-3 font-semibold">Intitulé des comptes</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">À-nouveaux débit</th>
                  <th className="px-4 py-3 text-right font-semibold">À-nouveaux crédit</th>
                  <th className="px-4 py-3 text-right font-semibold">Mouvements débit</th>
                  <th className="px-4 py-3 text-right font-semibold">Mouvements crédit</th>
                  <th className="px-4 py-3 text-right font-semibold">Solde débit</th>
                  <th className="px-4 py-3 text-right font-semibold">Solde crédit</th>
                  <th className="px-4 py-3 font-semibold">Dernière écriture</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-slate-50">
                    {viewMode === 'byEnterprise' && (
                      <td className="px-4 py-3 text-sm font-medium">{row.enterpriseName || '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 text-sm font-semibold">{row.code}</code>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{accountingAccountTypeLabel(row.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatAccountingCurrency(row.openingDebit)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatAccountingCurrency(row.openingCredit)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatAccountingCurrency(row.debit)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">{formatAccountingCurrency(row.credit)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatAccountingCurrency(row.balanceDebit)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatAccountingCurrency(row.balanceCredit)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatAccountingDate(row.lastTransaction)}</td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr>
                    <td colSpan={viewMode === 'byEnterprise' ? 11 : 10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune ligne de balance disponible pour ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
              {visibleRows.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-slate-50 font-bold">
                    {viewMode === 'byEnterprise' && <td className="px-4 py-4">Totaux</td>}
                    <td className="px-4 py-4" colSpan={viewMode === 'byEnterprise' ? 3 : 3}>
                      Totaux de la balance
                    </td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(totals.openingDebit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(totals.openingCredit)}</td>
                    <td className="px-4 py-4 text-right text-green-700">{formatAccountingCurrency(totals.debit)}</td>
                    <td className="px-4 py-4 text-right text-red-700">{formatAccountingCurrency(totals.credit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(totals.balanceDebit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(totals.balanceCredit)}</td>
                    <td className="px-4 py-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
