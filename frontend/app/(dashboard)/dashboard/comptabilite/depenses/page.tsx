'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { enterpriseApi } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import billingService, {
  type PurchaseCommitment,
} from '@/shared/api/billing';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { CreateEncaissementDialog } from '@/components/accounting/CreateEncaissementDialog';
import { CreateDecaissementDialog } from '@/components/accounting/CreateDecaissementDialog';
import { CreateFactureFournisseurDialog } from '@/components/accounting/CreateFactureFournisseurDialog';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import CashVoucherPrint from '@/components/printComponents/CashVoucherPrint';
import { formatFCFA } from '@/components/printComponents/printUtils';
import { AccountingDateRangeDialog } from '@/components/accounting/AccountingDateRangeDialog';
import {
  DepensesHeader,
  DepensesStats,
  DepensesTable,
  DepensesWorkflowGuide,
} from '@/components/comptabilite/depenses';

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
  PURCHASE_QUOTE: 'DPA / proforma retenue',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  EXPENSE: 'Depense diverse',
  OTHER: 'Autre depense',
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
  const canImportVoucher = canCreateVoucher || isAdminRole(user) || permissionSet.has('expenses.import');
  const canApproveVoucher =
    isAdminRole(user) || permissionSet.has('expenses.approve') || permissionSet.has('payments.validate');

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string } | null>(null);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [enterpriseFilter, setEnterpriseFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [encaissementOpen, setEncaissementOpen] = useState(false);
  const [decaissementOpen, setDecaissementOpen] = useState(false);
  const [liquidationOpen, setLiquidationOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importEnterpriseId, setImportEnterpriseId] = useState('all');
  const [importDefaultFlowType, setImportDefaultFlowType] = useState<'ENCAISSEMENT' | 'DECAISSEMENT'>('DECAISSEMENT');
  const [importDefaultStatus, setImportDefaultStatus] = useState<'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE'>('VALIDE');
  const [selectedCommitment, setSelectedCommitment] = useState<PurchaseCommitment | null>(null);
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);
  const [printListOpen, setPrintListOpen] = useState(false);

  const range = useMemo(() => {
    if (customRange) return customRange;
    if (period === 'all') return {};
    const now = new Date();
    if (period === 'day') {
      const day = selectedDay ? new Date(`${selectedDay}T00:00:00`) : now;
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
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
  }, [customRange, period, selectedDay]);

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'depenses'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    enabled: canRead,
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const selectedEnterpriseLabel =
    enterpriseFilter === 'all'
      ? null
      : accessibleEnterprises.find((enterprise) => String(enterprise.id) === enterpriseFilter)?.name || null;

  const { data, isLoading } = useQuery({
    queryKey: ['billing-spending-overview', period, selectedDay, customRange?.startDate ?? null, customRange?.endDate ?? null, enterpriseFilter],
    queryFn: () =>
      billingService.getSpendingOverview(
        enterpriseFilter !== 'all'
          ? { ...range, enterpriseId: enterpriseFilter }
          : range
      ),
    enabled: canRead,
  });

  const createEncaissementMutation = useMutation({
    mutationFn: billingService.createEncaissement,
    onSuccess: (response) => {
      toast.success("Encaissement enregistré. Il est maintenant en attente de validation comptable.");
      setPrintVoucher({
        ...response.data,
        flowType: 'ENCAISSEMENT',
      });
      setEncaissementOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Erreur lors de la creation de l'encaissement.");
    },
  });

  const createDecaissementMutation = useMutation({
    mutationFn: billingService.createDecaissement,
    onSuccess: (response) => {
      toast.success('Décaissement enregistré. Il sera comptabilisé après confirmation.');
      setPrintVoucher({
        ...response.data,
        flowType: 'DECAISSEMENT',
      });
      setDecaissementOpen(false);
      setSelectedCommitment(null);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la creation du decaissement.');
    },
  });

  const createLiquidationMutation = useMutation({
    mutationFn: billingService.createFactureFournisseur,
    onSuccess: () => {
      toast.success('Facture fournisseur (liquidation) enregistree.');
      setLiquidationOpen(false);
      setSelectedCommitment(null);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la liquidation.');
    },
  });

  const validateCommitmentMutation = useMutation({
    mutationFn: (commitmentId: string) => billingService.validatePurchaseCommitment(commitmentId),
    onSuccess: () => {
      toast.success('Engagement achat validé par la comptabilité.');
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitments'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitmentStats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Erreur lors de la validation de l'engagement.");
    },
  });

  const validateEncaissementMutation = useMutation({
    mutationFn: (encaissementId: string) =>
      billingService.updateEncaissementStatus(encaissementId, { status: 'VALIDE' }),
    onSuccess: () => {
      toast.success("Encaissement validé et transmis en écritures comptables.");
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-balance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Erreur lors de la validation de l'encaissement.");
    },
  });

  const validateDecaissementMutation = useMutation({
    mutationFn: (decaissementId: string) =>
      billingService.updateDecaissementStatus(decaissementId, { status: 'DECAISSE' }),
    onSuccess: () => {
      toast.success('Décaissement confirmé et comptabilisé.');
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-balance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la comptabilisation du décaissement.');
    },
  });

  const updateVoucherMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      billingService.updateCashVoucherStatus(id, { status } as any),
    onSuccess: (_, variables) => {
      const label =
        variables.status === 'VALIDE'
          ? 'Bon de caisse valide.'
          : variables.status === 'DECAISSE'
            ? 'Decaissement enregistre.'
            : 'Bon de caisse mis a jour.';
      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la mise a jour du bon de caisse.');
    },
  });

  const importCashVouchersMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) {
        throw new Error('Veuillez selectionner un fichier Excel.');
      }
      return billingService.importCashVouchers(importFile, {
        enterpriseId: importEnterpriseId !== 'all' ? importEnterpriseId : undefined,
        defaultEnterpriseName:
          importEnterpriseId !== 'all'
            ? accessibleEnterprises.find((enterprise) => String(enterprise.id) === importEnterpriseId)?.name
            : undefined,
        defaultFlowType: importDefaultFlowType,
        defaultStatus: importDefaultStatus,
      });
    },
    onSuccess: (response) => {
      const summary = response.data;
      toast.success(`${summary.imported} bon(s) de caisse importe(s), ${summary.skipped} ligne(s) ignoree(s).`);
      if (summary.errors.length > 0) {
        toast.warning(`${summary.errors.length} ligne(s) contiennent des erreurs. Consulte le retour d'import.`);
      }
      setImportOpen(false);
      setImportFile(null);
      setImportEnterpriseId('all');
      setImportDefaultFlowType('DECAISSEMENT');
      setImportDefaultStatus('VALIDE');
      queryClient.invalidateQueries({ queryKey: ['billing-spending-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Erreur lors de l'import du fichier.");
    },
  });

  const commitments = useMemo(() => data?.data?.commitments ?? [], [data]);
  const vouchers = useMemo(() => data?.data?.cashVouchers ?? [], [data]);
  const encaissements = useMemo(() => data?.data?.encaissements ?? [], [data]);
  const decaissements = useMemo(() => data?.data?.decaissements ?? [], [data]);

  const filteredCommitments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return commitments.filter((item: any) =>
      [item.sourceNumber, item.enterpriseName, item.serviceName, item.supplierName]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [commitments, search]);

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vouchers.filter((item: any) =>
      [item.voucherNumber, item.sourceNumber, item.beneficiaryName, item.description]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [vouchers, search]);

  const filteredEncaissements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return encaissements.filter((item: any) =>
      [item.numeroPiece, item.clientName, item.description, item.enterpriseName, item.serviceName]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [encaissements, search]);

  const filteredDecaissements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return decaissements.filter((item: any) =>
      [item.numeroPiece, item.beneficiaryName, item.description, item.enterpriseName, item.serviceName]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [decaissements, search]);

  const consolidatedRows = useMemo(() => {
    const commitmentRows = filteredCommitments.map((item: any) => ({
      id: `commitment-${item.id}`,
      kind: 'commitment' as const,
      entity: item,
      date: item.createdAt || null,
      number: item.sourceNumber,
      label: sourceLabels[item.sourceType] || item.sourceType,
      enterpriseName: item.enterpriseName || item.serviceName || '-',
      thirdParty: item.supplierName || '-',
      amount: item.amountTTC,
      status: item.status,
      sourceStatus: item.sourceStatus,
    }));

    const voucherRows = filteredVouchers.map((item: any) => ({
      id: `voucher-${item.id}`,
      kind: 'voucher' as const,
      entity: item,
      date: item.issueDate,
      number: item.voucherNumber,
      label: 'Piece de caisse',
      enterpriseName: item.enterpriseName || item.serviceName || '-',
      thirdParty: item.beneficiaryName,
      amount: item.amountTTC,
      status: item.status,
      reference: item.reference,
    }));

    const encaissementRows = filteredEncaissements.map((item: any) => ({
      id: `encaissement-${item.id}`,
      kind: 'encaissement' as const,
      entity: item,
      date: item.dateEncaissement,
      number: item.numeroPiece,
      label: 'Paiement client recu',
      enterpriseName: item.enterpriseName || item.serviceName || '-',
      thirdParty: item.clientName,
      amount: item.amountTTC,
      status: item.status || 'EN_ATTENTE',
      reference: item.reference,
    }));

    const decaissementRows = filteredDecaissements.map((item: any) => ({
      id: `decaissement-${item.id}`,
      kind: 'decaissement' as const,
      entity: item,
      date: item.dateDecaissement,
      number: item.numeroPiece,
      label: item.commitmentId ? 'Paiement fournisseur saisi' : 'Decaissement saisi',
      enterpriseName: item.enterpriseName || item.serviceName || '-',
      thirdParty: item.beneficiaryName,
      amount: item.amountTTC,
      status: item.status || 'DECAISSE',
      reference: item.reference,
    }));

    return [...voucherRows, ...commitmentRows, ...encaissementRows, ...decaissementRows].sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : 0;
      const rightTime = right.date ? new Date(right.date).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements]);

  if (!canRead) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Vous n&apos;avez pas acces au module comptable des depenses et bons de caisse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DepensesHeader
        period={period}
        selectedDay={selectedDay}
        hasCustomRange={Boolean(customRange)}
        onPeriodChange={(nextPeriod) => {
          setPeriod(nextPeriod);
          setCustomRange(null);
        }}
        onSelectedDayChange={(day) => {
          setSelectedDay(day);
          setCustomRange(null);
        }}
        onCustomRange={() => setRangeDialogOpen(true)}
        onPrintList={() => setPrintListOpen(true)}
        onImport={() => setImportOpen(true)}
        onNewEncaissement={() => setEncaissementOpen(true)}
        onNewDecaissement={() => {
          setSelectedCommitment(null);
          setDecaissementOpen(true);
        }}
        canCreate={canCreateVoucher}
        canImport={canImportVoucher}
      />

      <AccountingDateRangeDialog
        open={rangeDialogOpen}
        onOpenChange={setRangeDialogOpen}
        defaultRange={customRange}
        onApply={(nextRange) => {
          setCustomRange(nextRange.startDate || nextRange.endDate ? nextRange : null);
        }}
      />

      <DepensesStats
        totalCommitted={data?.data?.totals?.totalCommitted || 0}
        totalVouchered={data?.data?.totals?.totalVouchered || 0}
        totalDisbursed={data?.data?.totals?.totalDisbursed || 0}
        totalReceived={data?.data?.totals?.totalReceived || 0}
        pendingVouchersAmount={data?.data?.totals?.pendingVouchersAmount || 0}
      />

      <DepensesWorkflowGuide />

      <Card className="p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par piece, client, fournisseur, beneficiaire ou reference..."
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={enterpriseFilter}
            onChange={(event) => setEnterpriseFilter(event.target.value)}
          >
            <option value="all">Toutes les entreprises</option>
            {accessibleEnterprises.map((enterprise) => (
              <option key={String(enterprise.id)} value={String(enterprise.id)}>
                {enterprise.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {accessibleEnterprises.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {enterpriseFilter === 'all'
            ? `Vue consolidee groupe : ${accessibleEnterprises.length} entreprises visibles pour cette entreprise mere.`
            : `Filtre actif : ${selectedEnterpriseLabel || 'Entreprise selectionnee'}.`}
        </div>
      )}

      <DepensesTable
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredCommitments={filteredCommitments}
        filteredVouchers={filteredVouchers}
        filteredEncaissements={filteredEncaissements}
        filteredDecaissements={filteredDecaissements}
        consolidatedRows={consolidatedRows}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        sourceLabels={sourceLabels}
        canApprove={canApproveVoucher}
        onValidateCommitment={(commitment) => validateCommitmentMutation.mutate(commitment.id)}
        onValidateEncaissement={(encaissement) => validateEncaissementMutation.mutate(encaissement.id)}
        onValidateDecaissement={(decaissement) => validateDecaissementMutation.mutate(decaissement.id)}
        onUpdateVoucher={(id, status) => updateVoucherMutation.mutate({ id, status })}
        onPrintVoucher={setPrintVoucher}
        onLiquider={(commitment) => {
          setSelectedCommitment(commitment);
          setLiquidationOpen(true);
        }}
        onPayer={(commitment) => {
          setSelectedCommitment(commitment);
          setDecaissementOpen(true);
        }}
      />

      <CreateEncaissementDialog
        open={encaissementOpen}
        onOpenChange={setEncaissementOpen}
        isSubmitting={createEncaissementMutation.isPending}
        onSubmit={async (payload) => {
          await createEncaissementMutation.mutateAsync(payload);
        }}
      />

      <CreateDecaissementDialog
        open={decaissementOpen}
        onOpenChange={setDecaissementOpen}
        defaultCommitment={selectedCommitment}
        isSubmitting={createDecaissementMutation.isPending}
        onSubmit={async (payload) => {
          await createDecaissementMutation.mutateAsync(payload);
        }}
      />

      {selectedCommitment && (
        <CreateFactureFournisseurDialog
          open={liquidationOpen}
          onOpenChange={setLiquidationOpen}
          commitment={selectedCommitment}
          isSubmitting={createLiquidationMutation.isPending}
          onSubmit={async (payload) => {
            await createLiquidationMutation.mutateAsync(payload);
          }}
        />
      )}

      {canImportVoucher && (
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importer des bons de caisse historiques</DialogTitle>
              <DialogDescription>
                Importez un fichier Excel `.xlsx` contenant vos bons de caisse saisis manuellement en 2024 ou sur une autre période.
                Colonnes reconnues: `numeroPiece`, `beneficiaire`, `description`, `montantTTC`, `modePaiement`, `date`,
                `reference`, `notes`, `entrepriseId`, `entrepriseName`, `typeFlux`, `statut`.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier Excel</label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entreprise par défaut</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={importEnterpriseId}
                    onChange={(event) => setImportEnterpriseId(event.target.value)}
                  >
                    <option value="all">Depuis le fichier / sinon entreprise connectee</option>
                    {accessibleEnterprises.map((enterprise) => (
                      <option key={String(enterprise.id)} value={String(enterprise.id)}>
                        {enterprise.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Flux par défaut</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={importDefaultFlowType}
                    onChange={(event) => setImportDefaultFlowType(event.target.value as 'ENCAISSEMENT' | 'DECAISSEMENT')}
                  >
                    <option value="DECAISSEMENT">Décaissement</option>
                    <option value="ENCAISSEMENT">Encaissement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut par défaut</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={importDefaultStatus}
                    onChange={(event) => setImportDefaultStatus(event.target.value as any)}
                  >
                    <option value="BROUILLON">Brouillon</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="VALIDE">Valide</option>
                    <option value="DECAISSE">Décaisse</option>
                    <option value="ANNULE">Annule</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importCashVouchersMutation.isPending}>
                Annuler
              </Button>
              <Button onClick={() => void importCashVouchersMutation.mutateAsync()} disabled={!importFile || importCashVouchersMutation.isPending}>
                {importCashVouchersMutation.isPending ? 'Import en cours...' : 'Importer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {printVoucher && (
        <CashVoucherPrint voucher={printVoucher} onClose={() => setPrintVoucher(null)} />
      )}

      {printListOpen && (
        <TabularListPrint
          title="Flux de caisse et depenses"
          subtitle={
            enterpriseFilter === 'all'
              ? 'Liste consolidee des engagements, encaissements, decaissements et pieces de caisse'
              : `Liste des flux comptables - ${selectedEnterpriseLabel || 'Entreprise'}`
          }
          columns={[
            { key: 'number', label: 'N° Piece' },
            { key: 'date', label: 'Date' },
            { key: 'label', label: 'Type' },
            { key: 'thirdParty', label: 'Tiers' },
            { key: 'amount', label: 'Montant TTC', align: 'right' },
            { key: 'status', label: 'Statut' },
          ]}
          rows={consolidatedRows.map((row) => ({
            number: row.number,
            date: formatDate(row.date),
            label: row.label,
            thirdParty: row.thirdParty,
            amount: formatFCFA(row.amount),
            status: row.status,
          }))}
          summary={[
            {
              label: 'Total Encaissements',
              value: formatFCFA(data?.data?.totals?.totalReceived || 0),
            },
            {
              label: 'Total Decaissements',
              value: formatFCFA(data?.data?.totals?.totalDisbursed || 0),
            },
            {
              label: 'Net Tresorerie',
              value: formatFCFA((data?.data?.totals?.totalReceived || 0) - (data?.data?.totals?.totalDisbursed || 0)),
            },
          ]}
          onClose={() => setPrintListOpen(false)}
        />
      )}
    </div>
  );
}
