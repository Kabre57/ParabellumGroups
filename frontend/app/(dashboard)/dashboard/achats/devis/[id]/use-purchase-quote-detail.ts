/**
 * Charge les données du devis achat et regroupe les actions de sa fiche détaillée.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import { enterpriseApi } from '@/lib/api';
import type { PurchaseProforma } from '@/services/procurement';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { createEmptyDpaDraftLine, type DpaDraftLine } from '@/components/achat/dpa';
import { buildCommissionDecisionRows, buildProformaComparison, normalizeTimeline, parseEnterpriseId } from './purchase-quote-detail.utils';

export function usePurchaseQuoteDetailPage() {

  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [enterpriseId, setEnterpriseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DpaDraftLine[]>([createEmptyDpaDraftLine()]);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [createProformaOpen, setCreateProformaOpen] = useState(false);
  const [rejectProformaTarget, setRejectProformaTarget] = useState<PurchaseProforma | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isCommissionPrintOpen, setIsCommissionPrintOpen] = useState(false);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const hasDirectPermission = (...permissions: string[]) =>
    permissions.some((permission) => permissionSet.has(permission.toLowerCase()));
  const canUpdate =
    isAdminRole(user) || hasDirectPermission('purchases.update', 'purchase_requests.update');
  const canApprove =
    isAdminRole(user) || hasDirectPermission('purchase_requests.approve');
  const canReject = canApprove;
  const canCreateOrder =
    isAdminRole(user) || hasDirectPermission('purchase_orders.create', 'purchase_orders.update');
  const canReadCommittee =
    isAdminRole(user) ||
    hasDirectPermission('purchase_requests.read_committee', 'purchase_requests.read_all', 'purchase_requests.approve');
  const canEvaluateCommittee =
    isAdminRole(user) ||
    hasDirectPermission('purchase_requests.evaluate_committee', 'purchase_requests.approve');
  const canRecommendSupplier =
    isAdminRole(user) ||
    hasDirectPermission('purchase_requests.recommend_supplier') ||
    canCreateOrder;
  const canExportCommittee =
    isAdminRole(user) ||
    hasDirectPermission('purchase_requests.export_committee', 'reports.export', 'purchase_requests.approve');
  const canSubmit =
    isAdminRole(user) ||
    (hasDirectPermission('purchases.submit') && canCreateOrder);

  const { data: requestResponse, isLoading } = useQuery({
    queryKey: ['purchase-quote-detail', id],
    queryFn: () => procurementService.getRequest(id),
    enabled: Boolean(id),
  });

  const { data: approvalHistoryResponse } = useQuery({
    queryKey: ['purchase-quote-approval-history', id],
    queryFn: () => procurementService.getRequestApprovalHistory(id),
    enabled: Boolean(id),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['procurement-suppliers-for-quote-detail'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });
  const { data: enterprisesResponse } = useQuery({
    queryKey: ['purchase-quote-detail-enterprises'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-quote-detail'],
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

  const request = requestResponse?.data;
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];
  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );
  const approvalHistory = approvalHistoryResponse?.data ?? request?.approvalHistory ?? [];
  const supplierRatings = useMemo(
    () =>
      new Map(
        suppliers.map((supplier) => [supplier.id, Number.isFinite(Number(supplier.rating)) ? Number(supplier.rating) : 3])
      ),
    [suppliers]
  );

  useEffect(() => {
    if (!request || isDirty) return;

    setTitle(request.objet || request.title || '');
    setDescription(request.description || '');
    setNotes(request.notes || '');
    setEnterpriseId(
      request.enterpriseId != null
        ? String(request.enterpriseId)
        : user?.enterpriseId != null
        ? String(user.enterpriseId)
        : ''
    );
    setSupplierId(request.supplierId || '');
    setManualSupplierName(request.manualSupplierName || (!request.supplierId ? request.supplierName || '' : ''));
    setDateBesoin(request.dateBesoin ? request.dateBesoin.slice(0, 10) : '');
    setLines(
      request.lines && request.lines.length > 0
        ? request.lines.map((line) => ({
            id: line.id,
            articleId: line.articleId || '',
            imageUrl: line.imageUrl || '',
            designation: line.designation,
            categorie: line.categorie || '',
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
          }))
        : [createEmptyDpaDraftLine()]
    );
  }, [isDirty, request]);

  const canEditInternalRequest =
    Boolean(request) &&
    canUpdate &&
    (request?.status === 'BROUILLON' || request?.status === 'REJETEE');
  const canManageProformasFlow =
    Boolean(request) &&
    canCreateOrder &&
    ['APPROUVEE', 'PROFORMAS_EN_COURS', 'PROFORMA_SOUMISE'].includes(request?.status || '');
  const canGenerateOrder =
    Boolean(request) &&
    canCreateOrder &&
    request?.status === 'PROFORMA_APPROUVEE' &&
    !request?.bonCommandeId;
  const canEditRequest = canEditInternalRequest;

  const totals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTTC = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100),
      0
    );
    return {
      montantHT,
      montantTVA: montantTTC - montantHT,
      montantTTC,
    };
  }, [lines]);

  const timeline = useMemo(() => normalizeTimeline(request, approvalHistory), [approvalHistory, request]);
  const proformaComparison = useMemo(() => buildProformaComparison(request), [request]);
  const commissionDecisionRows = useMemo(
    () => buildCommissionDecisionRows(request, supplierRatings),
    [request, supplierRatings]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      procurementService.updateRequest(id, {
        title,
        objet: title,
        description,
        enterpriseId: parseEnterpriseId(enterpriseId),
        supplierId: supplierId || null,
        manualSupplierName: supplierId ? null : manualSupplierName || null,
        dateBesoin: dateBesoin || null,
        notes,
        lines: lines
          .filter((line) => line.designation && line.quantite > 0)
          .map((line) => ({
            id: line.id,
            articleId: line.articleId || null,
            designation: line.designation,
            categorie: line.categorie || null,
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
            montantHT: line.quantite * line.prixUnitaire,
            montantTTC: line.quantite * line.prixUnitaire * (1 + line.tva / 100),
          })),
      }),
    onSuccess: () => {
      toast.success('Le devis interne a été mis à jour.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise a jour du devis interne.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => procurementService.submitRequest(id, 'Soumis depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('Le devis interne a été soumis au PDG pour validation.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la soumission du devis interne.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => procurementService.approveRequest(id, 'Approuve depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('Le devis interne a été validé. Le service achat peut maintenant enregistrer les proformas.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitments'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-commitments'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l approbation.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (commentaire: string) => procurementService.rejectRequest(id, commentaire),
    onSuccess: () => {
      toast.success('Le devis interne a été rejeté.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet.');
    },
  });

  const createProformaMutation = useMutation({
    mutationFn: (payload: Parameters<typeof procurementService.createProforma>[1]) =>
      procurementService.createProforma(id, payload),
    onSuccess: () => {
      toast.success('La proforma a été enregistrée.');
      setCreateProformaOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création de la proforma.');
    },
  });

  const submitProformaMutation = useMutation({
    mutationFn: (proformaId: string) =>
      procurementService.submitProforma(id, proformaId, 'Soumise depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('La proforma a été soumise au PDG.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la soumission de la proforma.');
    },
  });

  const approveProformaMutation = useMutation({
    mutationFn: (proformaId: string) =>
      procurementService.approveProforma(id, proformaId, 'Proforma validée depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('La proforma a été validée. Le BC peut maintenant être généré.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la validation de la proforma.');
    },
  });

  const recommendProformaMutation = useMutation({
    mutationFn: (proformaId: string) => procurementService.recommendProforma(id, proformaId),
    onSuccess: () => {
      toast.success('La proforma recommandée a été mise à jour.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la sélection de la proforma.');
    },
  });

  const committeeEvaluationMutation = useMutation({
    mutationFn: ({
      proformaId,
      payload,
    }: {
      proformaId: string;
      payload: Parameters<typeof procurementService.saveProformaCommitteeEvaluation>[2];
    }) => procurementService.saveProformaCommitteeEvaluation(id, proformaId, payload),
    onSuccess: (_response, variables) => {
      toast.success(
        variables.payload.signDecision
          ? 'La décision de commission a été signée.'
          : 'La grille de commission a été enregistrée.'
      );
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Erreur lors de l'enregistrement de la grille de commission."
      );
    },
  });

  const rejectProformaMutation = useMutation({
    mutationFn: ({ proformaId, commentaire }: { proformaId: string; commentaire: string }) =>
      procurementService.rejectProforma(id, proformaId, commentaire),
    onSuccess: () => {
      toast.success('La proforma a été rejetée.');
      setRejectProformaTarget(null);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet de la proforma.');
    },
  });

  const generateOrderMutation = useMutation({
    mutationFn: () =>
      procurementService.generateOrderFromRequest(
        id,
        'Bon de commande généré depuis la fiche détaillée',
        request?.selectedProformaId || undefined
      ),
    onSuccess: () => {
      toast.success('Le bon de commande a été généré avec succès.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la génération du bon de commande.');
    },
  });

  const updateLine = (index: number, patch: Partial<DpaDraftLine>) => {
    setIsDirty(true);
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const updateLineArticle = (index: number, articleId: string) => {
    const article = articles.find((item) => item.id === articleId);
    setIsDirty(true);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              articleId,
              imageUrl: article?.imageUrl || '',
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              unite: article?.unite || line.unite,
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
            }
          : line
      )
    );
  };

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  return {
    id,
    title,
    setTitle,
    description,
    setDescription,
    notes,
    setNotes,
    enterpriseId,
    setEnterpriseId,
    supplierId,
    setSupplierId,
    manualSupplierName,
    setManualSupplierName,
    dateBesoin,
    setDateBesoin,
    lines,
    setLines,
    isDirty,
    setIsDirty,
    rejectDialogOpen,
    setRejectDialogOpen,
    createProformaOpen,
    setCreateProformaOpen,
    rejectProformaTarget,
    setRejectProformaTarget,
    isPrintOpen,
    setIsPrintOpen,
    isCommissionPrintOpen,
    setIsCommissionPrintOpen,
    canApprove,
    canReject,
    canReadCommittee,
    canEvaluateCommittee,
    canRecommendSupplier,
    canExportCommittee,
    canSubmit,
    isLoading,
    request,
    suppliers,
    articles,
    accessibleEnterprises,
    approvalHistory,
    canManageProformasFlow,
    canGenerateOrder,
    canEditRequest,
    totals,
    timeline,
    proformaComparison,
    commissionDecisionRows,
    saveMutation,
    submitMutation,
    approveMutation,
    rejectMutation,
    createProformaMutation,
    submitProformaMutation,
    approveProformaMutation,
    recommendProformaMutation,
    committeeEvaluationMutation,
    rejectProformaMutation,
    generateOrderMutation,
    updateLine,
    updateLineArticle,
    selectedSupplier,
  };
}
