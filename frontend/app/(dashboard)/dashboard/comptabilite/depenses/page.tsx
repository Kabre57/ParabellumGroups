'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, Search, Wallet, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import billingService, { type CashVoucher, type PurchaseCommitment } from '@/shared/api/billing';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { CreateCashVoucherDialog } from '@/components/accounting/CreateCashVoucherDialog';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import CashVoucherPrint from '@/components/printComponents/CashVoucherPrint';
import { formatFCFA, textOrDash } from '@/components/printComponents/printUtils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};

const sourceLabels: Record<string, string> = {
  PURCHASE_ORDER: 'Bon de commande',
  PURCHASE_QUOTE: 'Demande validée',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  EXPENSE: 'Dépense diverse',
  OTHER: 'Autre dépense',
};

export default function DepensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read'].some((permission) =>
      permissionSet.has(permission)
    );
  const canCreateVoucher = isAdminRole(user) || permissionSet.has('expenses.create');
  const canApproveVoucher =
    isAdminRole(user) || permissionSet.has('expenses.approve') || permissionSet.has('payments.validate');

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<PurchaseCommitment | null>(null);
  const [printVoucher, setPrintVoucher] = useState<CashVoucher | null>(null);
  const [printListOpen, setPrintListOpen] = useState(false);

  const range = useMemo(() => {
    if (period === 'all') return {};
    const now = new Date();
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period]);

  const { data, isLoading } = useQuery({
    queryKey: ['billing-spending-overview', period],
    queryFn: () => billingService.getSpendingOverview(range),
    enabled: canRead,
  });

  const createVoucherMutation = useMutation({
    mutationFn: billingService.createCashVoucher,
    onSuccess: () => {
      toast.success('Bon de caisse créé avec succès.');
      setDialogOpen(false);
      setSelectedCommitment(null);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du bon de caisse.');
    },
  });

  const updateVoucherMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CashVoucher['status'] }) =>
      billingService.updateCashVoucherStatus(id, { status }),
    onSuccess: (_, variables) => {
      const label =
        variables.status === 'VALIDE'
          ? 'Bon de caisse validé.'
          : variables.status === 'DECAISSE'
          ? 'Décaissement enregistré.'
          : 'Bon de caisse mis à jour.';
      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour du bon de caisse.');
    },
  });

  const commitments = useMemo(() => data?.data?.commitments ?? [], [data]);
  const vouchers = useMemo(() => data?.data?.cashVouchers ?? [], [data]);

  const filteredCommitments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return commitments;
    return commitments.filter((item) =>
      [
        item.sourceNumber,
        item.serviceName,
        item.supplierName,
        sourceLabels[item.sourceType] || item.sourceType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [commitments, search]);

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vouchers;
    return vouchers.filter((item) =>
      [
        item.voucherNumber,
        item.sourceNumber,
        item.beneficiaryName,
        item.supplierName,
        item.description,
        item.serviceName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [vouchers, search]);

  const consolidatedRows = useMemo(() => {
    const commitmentRows = filteredCommitments.map((item) => ({
      id: `commitment-${item.id}`,
      kind: 'commitment' as const,
      date: item.createdAt || null,
      number: item.sourceNumber,
      label: sourceLabels[item.sourceType] || item.sourceType,
      serviceName: item.serviceName || '-',
      thirdParty: item.supplierName || '-',
      amount: item.amountTTC,
      status: item.status,
    }));

    const voucherRows = filteredVouchers.map((item) => ({
      id: `voucher-${item.id}`,
      kind: 'voucher' as const,
      date: item.issueDate,
      number: item.voucherNumber,
      label: 'Bon de caisse',
      serviceName: item.serviceName || '-',
      thirdParty: item.beneficiaryName,
      amount: item.amountTTC,
      status: item.status,
    }));

    return [...voucherRows, ...commitmentRows].sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : 0;
      const rightTime = right.date ? new Date(right.date).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filteredCommitments, filteredVouchers]);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas accès au module comptable des dépenses et bons de caisse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bons de caisse et dépenses</h1>
          <p className="mt-2 text-muted-foreground">
            Suivi des engagements d&apos;achat, des bons de caisse et des décaissements comptables de l&apos;entreprise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
            <option value="all">Toutes les périodes</option>
          </select>
          <Button variant="outline" onClick={() => setPrintListOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer la liste
          </Button>
          {canCreateVoucher && (
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setSelectedCommitment(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouveau bon de caisse
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Engagements achats</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(data?.data?.totals.totalCommitted || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Bons de caisse saisis</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(data?.data?.totals.totalVouchered || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Décaissements réalisés</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(data?.data?.totals.totalDisbursed || 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Bons en attente / validés</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(data?.data?.totals.pendingVouchersAmount || 0)}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par numéro, bénéficiaire, fournisseur ou service..."
            className="pl-9"
          />
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue consolidée</TabsTrigger>
          <TabsTrigger value="vouchers">Bons de caisse</TabsTrigger>
          <TabsTrigger value="commitments">Engagements achats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Tiers</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3 text-right">Montant TTC</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={8}>
                        Chargement...
                      </td>
                    </tr>
                  ) : consolidatedRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={8}>
                        Aucun mouvement à afficher.
                      </td>
                    </tr>
                  ) : (
                    consolidatedRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 font-medium">{row.number || '-'}</td>
                        <td className="px-4 py-3 text-sm">{row.label}</td>
                        <td className="px-4 py-3 text-sm">{row.serviceName}</td>
                        <td className="px-4 py-3 text-sm">{row.thirdParty}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.kind === 'voucher'
                            ? textOrDash(vouchers.find((item) => `voucher-${item.id}` === row.id)?.reference)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3">
                          {row.kind === 'voucher' ? (
                            <CashVoucherStatusBadge status={row.status as CashVoucher['status']} />
                          ) : (
                            <Badge variant="outline">{row.status}</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="vouchers">
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Bon de caisse</th>
                    <th className="px-4 py-3">Origine</th>
                    <th className="px-4 py-3">Bénéficiaire</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Compte</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3 text-right">Montant TTC</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={9}>
                        Chargement...
                      </td>
                    </tr>
                  ) : filteredVouchers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={9}>
                        Aucun bon de caisse enregistré.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((voucher) => (
                      <tr key={voucher.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{voucher.voucherNumber}</div>
                          <div className="text-xs text-gray-500">{formatDate(voucher.issueDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>{sourceLabels[voucher.sourceType] || voucher.sourceType}</div>
                          <div className="text-xs text-gray-500">{voucher.sourceNumber || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>{voucher.beneficiaryName}</div>
                          <div className="text-xs text-gray-500">{voucher.serviceName || voucher.supplierName || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {voucher.paymentMethod === 'CHEQUE'
                            ? 'Chèque'
                            : voucher.paymentMethod === 'CARTE'
                            ? 'Carte'
                            : voucher.paymentMethod === 'VIREMENT'
                            ? 'Virement'
                            : 'Espèces'}
                        </td>
                        <td className="px-4 py-3 text-sm">{voucher.treasuryAccountName || '-'}</td>
                        <td className="px-4 py-3 text-sm">{voucher.reference || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(voucher.amountTTC)}</td>
                        <td className="px-4 py-3">
                          <CashVoucherStatusBadge status={voucher.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPrintVoucher(voucher)}>
                              Imprimer
                            </Button>
                            {canApproveVoucher && voucher.status === 'EN_ATTENTE' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateVoucherMutation.mutate({ id: voucher.id, status: 'VALIDE' })}
                              >
                                Valider
                              </Button>
                            )}
                            {canApproveVoucher && voucher.status === 'VALIDE' && (
                              <Button
                                size="sm"
                                onClick={() => updateVoucherMutation.mutate({ id: voucher.id, status: 'DECAISSE' })}
                              >
                                Décaisser
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="commitments">
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Document source</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Fournisseur</th>
                    <th className="px-4 py-3 text-right">Montant TTC</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                        Chargement...
                      </td>
                    </tr>
                  ) : filteredCommitments.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                        Aucun engagement achat disponible.
                      </td>
                    </tr>
                  ) : (
                    filteredCommitments.map((commitment) => (
                      <tr key={commitment.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{commitment.sourceNumber}</div>
                          <div className="text-xs text-gray-500">{formatDate(commitment.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{sourceLabels[commitment.sourceType] || commitment.sourceType}</td>
                        <td className="px-4 py-3 text-sm">{commitment.serviceName || '-'}</td>
                        <td className="px-4 py-3 text-sm">{commitment.supplierName || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(commitment.amountTTC)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{commitment.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {canCreateVoucher && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCommitment(commitment);
                                  setDialogOpen(true);
                                }}
                              >
                                <Wallet className="mr-2 h-4 w-4" />
                                Bon de caisse
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateCashVoucherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCommitment={selectedCommitment}
        isSubmitting={createVoucherMutation.isPending}
        onSubmit={async (payload) => {
          await createVoucherMutation.mutateAsync(payload);
        }}
      />

      {printVoucher && (
        <CashVoucherPrint voucher={printVoucher} onClose={() => setPrintVoucher(null)} />
      )}

      {printListOpen && (
        <TabularListPrint
          title="Bons de caisse"
          subtitle="Liste des bons de caisse et décaissements"
          columns={[
            { key: 'number', label: 'Bon de caisse' },
            { key: 'date', label: 'Date' },
            { key: 'beneficiary', label: 'Bénéficiaire' },
            { key: 'service', label: 'Service' },
            { key: 'account', label: 'Compte' },
            { key: 'reference', label: 'Référence' },
            { key: 'amount', label: 'Montant TTC', align: 'right' },
            { key: 'status', label: 'Statut' },
          ]}
          rows={filteredVouchers.map((voucher) => ({
            number: voucher.voucherNumber,
            date: formatDate(voucher.issueDate),
            beneficiary: textOrDash(voucher.beneficiaryName),
            service: textOrDash(voucher.serviceName),
            account: textOrDash(voucher.treasuryAccountName),
            reference: textOrDash(voucher.reference),
            amount: formatFCFA(voucher.amountTTC),
            status: voucher.status,
          }))}
          summary={[
            {
              label: 'Total TTC',
              value: formatFCFA(filteredVouchers.reduce((sum, item) => sum + (item.amountTTC || 0), 0)),
            },
          ]}
          onClose={() => setPrintListOpen(false)}
        />
      )}
    </div>
  );
}
