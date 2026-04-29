'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, RefreshCw, Search, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { accountingAccountTypeLabel, formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import { exportBalanceCsv } from '@/components/accounting/accountingExport';
import billingService, { type AccountingBalanceRow } from '@/shared/api/billing';
import { enterpriseApi, type Enterprise } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { getCrudVisibility } from '@/shared/action-visibility';
import AccountingBalancePrint from '@/components/printComponents/AccountingBalancePrint';

type ViewMode = 'consolidated' | 'enterprise';
type SortMode = 'code' | 'enterprise' | 'label' | 'debit' | 'credit' | 'balance';
type ScopeValue = 'all' | 'parent' | 'subsidiaries' | `enterprise:${string}`;

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

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultStartDate = () => {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
};

const defaultEndDate = () => toDateInputValue(new Date());

const getScopeRequest = (scope: ScopeValue, currentEnterpriseId: string | null) => {
  if (scope === 'parent') {
    return {
      scope: 'parent' as const,
      enterpriseId: currentEnterpriseId || undefined,
    };
  }
  if (scope === 'subsidiaries') {
    return {
      scope: 'subsidiaries' as const,
      enterpriseId: currentEnterpriseId || undefined,
    };
  }
  if (scope.startsWith('enterprise:')) {
    return {
      scope: 'single' as const,
      enterpriseId: scope.replace('enterprise:', '') || undefined,
    };
  }

  return {
    scope: 'all' as const,
    enterpriseId: undefined,
  };
};

export default function BalanceComptesPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [scope, setScope] = useState<ScopeValue>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [sortMode, setSortMode] = useState<SortMode>('code');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeZeroRows, setIncludeZeroRows] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead = isAdminRole(user) || permissionSet.has('accounting.read') || permissionSet.has('reports.read_financial');
  const { canExport } = getCrudVisibility(user, {
    read: ['accounting.read', 'reports.read_financial'],
    export: ['reports.export'],
  });
  const canPrint = isAdminRole(user) || permissionSet.has('reports.export');

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

  const scopeRequest = useMemo(() => getScopeRequest(scope, currentEnterpriseId), [scope, currentEnterpriseId]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounting-balance-v2', startDate, endDate, scopeRequest.scope, scopeRequest.enterpriseId || 'all', viewMode, includeZeroRows],
    queryFn: () =>
      billingService.getAccountingBalance({
        startDate,
        endDate,
        scope: scopeRequest.scope,
        enterpriseId: scopeRequest.enterpriseId,
        groupBy: viewMode,
        includeZeroRows,
      }),
    enabled: canRead,
  });

  const balance = data?.data;
  const rawRows = balance?.rows ?? [];

  const visibleRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchedRows = normalizedSearch
      ? rawRows.filter((row) =>
          [row.code, row.label, accountingAccountTypeLabel(row.type), row.enterpriseName || '']
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        )
      : rawRows;

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
  }, [rawRows, searchQuery, sortMode]);

  const visibleTotals = useMemo(
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

  const movementGap = Math.abs(visibleTotals.debit - visibleTotals.credit);
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
              <p className="mt-1 text-muted-foreground">Balance calculée par période, avec ouverture, mouvements et soldes cumulés.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={() => setIsPrintOpen(true)} disabled={!visibleRows.length || !canPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canExport && (
            <Button onClick={() => exportBalanceCsv(visibleRows, `balance-des-comptes-${startDate}-${endDate}.csv`)}>
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
          <p className="mt-2 text-2xl font-bold text-green-700">{formatAccountingCurrency(visibleTotals.debit)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Du {formatAccountingDate(balance?.period.startDate)} au {formatAccountingDate(balance?.period.endDate)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Mouvements crédit</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatAccountingCurrency(visibleTotals.credit)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Période sélectionnée</p>
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_220px_170px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un compte ou une entreprise..."
              className="pl-10"
            />
          </div>

          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />

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
            <option value="enterprise">Par entreprise</option>
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
            checked={includeZeroRows}
            onChange={(event) => setIncludeZeroRows(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Inclure les comptes sans activité sur la période
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
                  {viewMode === 'enterprise' && <th className="px-4 py-3 font-semibold">Entreprise</th>}
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
                {visibleRows.map((row: AccountingBalanceRow) => (
                  <tr key={row.id} className="border-b hover:bg-slate-50">
                    {viewMode === 'enterprise' && (
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
                    <td colSpan={viewMode === 'enterprise' ? 11 : 10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune ligne de balance disponible pour cette période et ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
              {visibleRows.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-slate-50 font-bold">
                    {viewMode === 'enterprise' && <td className="px-4 py-4">Totaux</td>}
                    <td className="px-4 py-4" colSpan={viewMode === 'enterprise' ? 3 : 3}>
                      Totaux de la balance
                    </td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(visibleTotals.openingDebit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(visibleTotals.openingCredit)}</td>
                    <td className="px-4 py-4 text-right text-green-700">{formatAccountingCurrency(visibleTotals.debit)}</td>
                    <td className="px-4 py-4 text-right text-red-700">{formatAccountingCurrency(visibleTotals.credit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(visibleTotals.balanceDebit)}</td>
                    <td className="px-4 py-4 text-right">{formatAccountingCurrency(visibleTotals.balanceCredit)}</td>
                    <td className="px-4 py-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {isPrintOpen && (
        <AccountingBalancePrint
          rows={visibleRows}
          totals={visibleTotals}
          scopeLabel={scopeLabel}
          groupBy={viewMode}
          startDate={balance?.period.startDate || startDate}
          endDate={balance?.period.endDate || endDate}
          generatedAt={balance?.generatedAt}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
