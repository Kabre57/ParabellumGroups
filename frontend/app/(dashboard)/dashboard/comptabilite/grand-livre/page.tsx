'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, RefreshCw, Search } from 'lucide-react';
import billingService from '@/shared/api/billing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';

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

export default function GrandLivrePage() {
  const { user } = useAuth();
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead = isAdminRole(user) || permissionSet.has('accounting.read') || permissionSet.has('reports.read_financial');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [enterpriseId, setEnterpriseId] = useState('all');

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'grand-livre'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: canRead,
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounting-general-ledger', startDate, endDate, enterpriseId],
    queryFn: () =>
      billingService.getGeneralLedger({
        startDate,
        endDate,
        enterpriseId: enterpriseId !== 'all' ? enterpriseId : undefined,
      }),
    enabled: canRead,
  });

  const accounts = data?.data?.rows ?? [];
  const filteredAccounts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return accounts;
    return accounts.filter((account) =>
      [account.code, account.label, account.type]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [accounts, searchQuery]);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès au grand livre.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Grand livre</h1>
            <p className="mt-1 text-muted-foreground">
              Consultation détaillée des mouvements comptables persistés par compte.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={enterpriseId}
            onChange={(event) => setEnterpriseId(event.target.value)}
          >
            <option value="all">Toutes les entreprises</option>
            {accessibleEnterprises.map((enterprise) => (
              <option key={String(enterprise.id)} value={String(enterprise.id)}>
                {enterprise.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un compte..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <Card key={account.accountId} className="overflow-hidden">
              <div className="border-b bg-muted/30 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {account.code} · {account.label}
                      </h2>
                      <Badge variant="outline">{account.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ouverture {formatAccountingCurrency(account.openingBalance)} · Débit {formatAccountingCurrency(account.totalDebit)} · Crédit{' '}
                      {formatAccountingCurrency(account.totalCredit)} · Clôture {formatAccountingCurrency(account.closingBalance)}
                    </p>
                  </div>
                  <Badge variant="secondary">{account.movements.length} mouvements</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-background">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Pièce</th>
                      <th className="px-4 py-3 text-left">Journal</th>
                      <th className="px-4 py-3 text-left">Libellé</th>
                      <th className="px-4 py-3 text-left">Référence</th>
                      <th className="px-4 py-3 text-right">Débit</th>
                      <th className="px-4 py-3 text-right">Crédit</th>
                      <th className="px-4 py-3 text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.movements.map((movement) => (
                      <tr key={movement.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{formatAccountingDate(movement.entryDate)}</td>
                        <td className="px-4 py-3 font-medium">{movement.entryNumber}</td>
                        <td className="px-4 py-3">
                          <div>{movement.journalCode}</div>
                          <div className="text-xs text-muted-foreground">{movement.journalLabel}</div>
                        </td>
                        <td className="px-4 py-3">{movement.description}</td>
                        <td className="px-4 py-3">{movement.reference}</td>
                        <td className="px-4 py-3 text-right">{movement.debit ? formatAccountingCurrency(movement.debit) : '-'}</td>
                        <td className="px-4 py-3 text-right">{movement.credit ? formatAccountingCurrency(movement.credit) : '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatAccountingCurrency(movement.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {!filteredAccounts.length && (
            <Card className="p-8 text-center text-muted-foreground">Aucun mouvement comptable trouvé sur cette période.</Card>
          )}
        </div>
      )}
    </div>
  );
}
