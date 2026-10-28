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
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import billingService, {
  type PurchaseCommitment,
} from '@/shared/api/billing';
import { useAccountingEnterpriseScope } from '@/hooks/comptabilite/useAccountingEnterpriseScope';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
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
} from '@/components/comptabilite/depenses';

// État, chargement et actions du parcours d'interface.

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};

export const sourceLabels: Record<string, string> = {
  PURCHASE_ORDER: 'Bon de commande',
  PURCHASE_QUOTE: 'DPA / proforma retenue',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  EXPENSE: 'Depense diverse',
  OTHER: 'Autre depense',
};

export function useDepensesPageModel() {

  const { user } = useAuth();
  const { selectedEnterprise } = useEnterprise();
  const accountingScope = useAccountingEnterpriseScope();
  const queryClient = useQueryClient();
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canRead =
    isAdminRole(user) ||
    ['expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read'].some((permission) =>
      permissionSet.has(permission)
    );
  const canMutate = !accountingScope.isConsolidated;
  const canCreateVoucher = canMutate && (isAdminRole(user) || permissionSet.has('expenses.create'));
  const canImportVoucher = canMutate && (canCreateVoucher || isAdminRole(user) || permissionSet.has('expenses.import'));
  const canApproveVoucher = canMutate && (
    isAdminRole(user) || permissionSet.has('expenses.approve') || permissionSet.has('payments.validate')
  );

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string } | null>(null);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [encaissementOpen, setEncaissementOpen] = useState(false);
  const [decaissementOpen, setDecaissementOpen] = useState(false);
  const [liquidationOpen, setLiquidationOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
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

  const { data, isLoading } = useQuery({
    queryKey: ['billing-spending-overview', period, selectedDay, customRange?.startDate ?? null, customRange?.endDate ?? null, accountingScope.scopeKey],
    queryFn: () => billingService.getSpendingOverview({ ...range, enterpriseId: accountingScope.enterpriseId, enterpriseScope: accountingScope.enterpriseScope }),
    enabled: canRead && accountingScope.isReady,
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
        enterpriseId: selectedEnterprise?.id,
        defaultEnterpriseName: selectedEnterprise?.name,
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
    const encList = encaissements
      .map((item: any) => ({ ...item, isVoucher: false }))
      .filter((item: any) =>
        [item.numeroPiece, item.clientName, item.description, item.enterpriseName, item.serviceName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))
      );

    const voucherEncList = vouchers
      .filter((v: any) => v.flowType === 'ENCAISSEMENT')
      .map((v: any) => ({
        id: v.id,
        isVoucher: true,
        dateEncaissement: v.issueDate || v.disbursementDate,
        numeroPiece: v.voucherNumber,
        clientName: v.beneficiaryName,
        paymentMethod: v.paymentMethod,
        reference: v.reference,
        amountTTC: v.amountTTC,
        status: v.status,
        enterpriseName: v.enterpriseName || v.serviceName,
        serviceName: v.serviceName,
        rawVoucher: v,
      }))
      .filter((item: any) =>
        [item.numeroPiece, item.clientName, item.paymentMethod, item.reference, item.enterpriseName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))
      );

    return [...encList, ...voucherEncList];
  }, [encaissements, vouchers, search]);

  const filteredDecaissements = useMemo(() => {
    const query = search.trim().toLowerCase();
    const decList = decaissements
      .map((item: any) => ({ ...item, isVoucher: false }))
      .filter((item: any) =>
        [item.numeroPiece, item.beneficiaryName, item.description, item.enterpriseName, item.serviceName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))
      );

    const voucherDecList = vouchers
      .filter((v: any) => v.flowType !== 'ENCAISSEMENT')
      .map((v: any) => ({
        id: v.id,
        isVoucher: true,
        dateDecaissement: v.issueDate || v.disbursementDate,
        numeroPiece: v.voucherNumber,
        beneficiaryName: v.beneficiaryName,
        paymentMethod: v.paymentMethod,
        reference: v.reference,
        amountTTC: v.amountTTC,
        status: v.status,
        enterpriseName: v.enterpriseName || v.serviceName,
        serviceName: v.serviceName,
        rawVoucher: v,
      }))
      .filter((item: any) =>
        [item.numeroPiece, item.beneficiaryName, item.paymentMethod, item.reference, item.enterpriseName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))
      );

    return [...decList, ...voucherDecList];
  }, [decaissements, vouchers, search]);

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
  return {
    user,
    selectedEnterprise,
    accountingScope,
    queryClient,
    permissionSet,
    canRead,
    canMutate,
    canCreateVoucher,
    canImportVoucher,
    canApproveVoucher,
    search,
    setSearch,
    period,
    setPeriod,
    selectedDay,
    setSelectedDay,
    customRange,
    setCustomRange,
    rangeDialogOpen,
    setRangeDialogOpen,
    activeTab,
    setActiveTab,
    encaissementOpen,
    setEncaissementOpen,
    decaissementOpen,
    setDecaissementOpen,
    liquidationOpen,
    setLiquidationOpen,
    importOpen,
    setImportOpen,
    importFile,
    setImportFile,
    importDefaultFlowType,
    setImportDefaultFlowType,
    importDefaultStatus,
    setImportDefaultStatus,
    selectedCommitment,
    setSelectedCommitment,
    printVoucher,
    setPrintVoucher,
    printListOpen,
    setPrintListOpen,
    range,
    data,
    isLoading,
    createEncaissementMutation,
    createDecaissementMutation,
    createLiquidationMutation,
    validateCommitmentMutation,
    validateEncaissementMutation,
    validateDecaissementMutation,
    updateVoucherMutation,
    importCashVouchersMutation,
    commitments,
    vouchers,
    encaissements,
    decaissements,
    filteredCommitments,
    filteredVouchers,
    filteredEncaissements,
    filteredDecaissements,
    consolidatedRows,
  };
}
