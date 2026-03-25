'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  PackagePlus,
  Printer,
  Save,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import type {
  PurchaseProforma,
  PurchaseRequest,
  PurchaseRequestApprovalLog,
  PurchaseRequestStatus,
} from '@/services/procurement';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { adminServicesService, type Service } from '@/shared/api/admin';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PurchaseRequestPrint from '@/components/printComponents/PurchaseRequestPrint';
import PurchaseCommissionPrint from '@/components/printComponents/PurchaseCommissionPrint';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { EditDpaCard } from '@/components/achat/dpa/EditDpaCard';
import {
  createEmptyDpaDraftLine,
  type DpaDraftLine,
} from '@/components/achat/dpa';
import {
  CreateProformaDialog,
  ProformaDecisionBoard,
  ProformaSuppliersSection,
} from '@/components/achat/proforma';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
};

type ProformaComparisonSummary = {
  proformas: PurchaseProforma[];
  bestProformaId: string | null;
  bestAmount: number;
  recommendedProformaId: string | null;
  rows: Array<{
    key: string;
    designation: string;
    categorie: string;
    quantite: number;
    offers: Record<
      string,
      {
        prixUnitaire: number | null;
        montantTTC: number | null;
        isLowest: boolean;
      }
    >;
  }>;
};

type CommissionDecisionRow = {
  proformaId: string;
  numeroProforma: string;
  fournisseurNom: string;
  montantTTC: number;
  delaiLivraisonJours: number | null;
  disponibilite: string | null;
  observationsAchat: string | null;
  status: string;
  selectedForOrder: boolean;
  recommendedForApproval: boolean;
  priceScore: number;
  delayScore: number;
  availabilityScore: number;
  supplierScore: number;
  totalScore: number;
  justification: string;
};

const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  APPROUVEE: 'Validée DG',
  REJETEE: 'Rejetee',
  PROFORMAS_EN_COURS: 'Proformas en préparation',
  PROFORMA_SOUMISE: 'Proforma soumise DG',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};

const getStatusVariant = (status: PurchaseRequestStatus) => {
  switch (status) {
    case 'SOUMISE':
      return 'warning' as const;
    case 'APPROUVEE':
      return 'success' as const;
    case 'PROFORMAS_EN_COURS':
      return 'outline' as const;
    case 'PROFORMA_SOUMISE':
      return 'warning' as const;
    case 'PROFORMA_APPROUVEE':
      return 'success' as const;
    case 'REJETEE':
      return 'destructive' as const;
    case 'COMMANDEE':
      return 'success' as const;
    default:
      return 'outline' as const;
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('fr-FR');
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

const normalizeAvailability = (value?: string | null) => String(value || '').trim().toLowerCase();

const computeAvailabilityScore = (availability?: string | null) => {
  const normalized = normalizeAvailability(availability);
  if (!normalized) return 6;
  if (normalized.includes('stock') || normalized.includes('immédiat') || normalized.includes('immediat')) return 15;
  if (normalized.includes('partiel')) return 10;
  if (normalized.includes('commande')) return 6;
  if (normalized.includes('rupture') || normalized.includes('indisponible')) return 0;
  return 8;
};

const normalizeTimeline = (
  request: PurchaseRequest | undefined,
  approvalHistory: PurchaseRequestApprovalLog[]
): TimelineItem[] => {
  if (!request) return [];

  const items: TimelineItem[] = [
    {
      id: `created-${request.id}`,
      title: 'DPA créée',
      description: `Creation de la DPA ${request.number} pour le service ${request.serviceName || 'Non attribue'}.`,
      createdAt: request.date,
      tone: 'neutral',
    },
  ];

  approvalHistory.forEach((log) => {
    const tone =
      log.action === 'APPROVED'
        ? 'success'
        : log.action === 'REJECTED'
        ? 'danger'
        : log.action === 'SUBMITTED'
        ? 'warning'
        : 'neutral';

    items.push({
      id: log.id,
      title: log.action === 'SUBMITTED'
        ? 'Soumission pour approbation'
        : log.action === 'APPROVED'
        ? 'Approbation'
        : log.action === 'REJECTED'
        ? 'Rejet'
        : log.action,
      description: [
        log.actorServiceName || log.actorEmail || 'Acteur inconnu',
        log.commentaire || null,
        `Transition ${log.fromStatus} -> ${log.toStatus}`,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: log.createdAt,
      tone,
    });
  });

  (request.proformas || []).forEach((proforma) => {
    items.push({
      id: `proforma-created-${proforma.id}`,
      title: `Proforma créée (${proforma.numeroProforma})`,
      description: [proforma.fournisseurNom || 'Fournisseur inconnu', `Montant ${formatCurrency(proforma.montantTTC)}`]
        .filter(Boolean)
        .join(' · '),
      createdAt: proforma.createdAt || request.date,
      tone: 'neutral',
    });

    (proforma.approvalHistory || []).forEach((log) => {
      const tone =
        log.action === 'APPROVED'
          ? 'success'
          : log.action === 'REJECTED'
          ? 'danger'
          : log.action === 'SUBMITTED'
          ? 'warning'
          : 'neutral';

      items.push({
        id: `proforma-${proforma.id}-${log.id}`,
        title:
          log.action === 'SUBMITTED'
            ? `Proforma soumise (${proforma.numeroProforma})`
            : log.action === 'APPROVED'
            ? `Proforma validée (${proforma.numeroProforma})`
            : log.action === 'REJECTED'
            ? `Proforma rejetée (${proforma.numeroProforma})`
            : `${log.action} (${proforma.numeroProforma})`,
        description: [
          proforma.fournisseurNom || null,
          log.actorServiceName || log.actorEmail || null,
          log.commentaire || null,
        ]
          .filter(Boolean)
          .join(' · '),
        createdAt: log.createdAt,
        tone,
      });
    });
  });

  if (request.bonCommandeId) {
    items.push({
      id: `bc-${request.bonCommandeId}`,
      title: 'Bon de commande généré',
      description: `La DPA a ete convertie en bon de commande ${request.numeroBon || request.bonCommandeId}.`,
      createdAt: request.approvedAt || request.date,
      tone: 'success',
    });
  }

  return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
};

const buildProformaComparison = (request?: PurchaseRequest): ProformaComparisonSummary => {
  const proformas = [...(request?.proformas || [])].sort((left, right) => left.montantTTC - right.montantTTC);
  const bestAmount = proformas.length > 0 ? proformas[0].montantTTC : 0;
  const bestProformaId = proformas.length > 0 ? proformas[0].id : null;
  const recommendedProformaId =
    proformas.find((proforma) => proforma.recommendedForApproval)?.id || null;
  const sourceLines = request?.lines || [];

  const rows = sourceLines.map((line, index) => {
    const key =
      line.articleId ||
      line.referenceArticle ||
      `${line.designation.trim().toLowerCase()}-${index}`;

    const rawOffers = Object.fromEntries(
      proformas.map((proforma) => {
        const matchingLine =
          (proforma.lignes || []).find((candidate) =>
            line.articleId
              ? candidate.articleId === line.articleId
              : candidate.designation.trim().toLowerCase() === line.designation.trim().toLowerCase()
          ) || null;

        return [
          proforma.id,
          {
            prixUnitaire: matchingLine ? matchingLine.prixUnitaire : null,
            montantTTC: matchingLine ? matchingLine.montantTTC : null,
            isLowest: false,
          },
        ];
      })
    ) as Record<string, { prixUnitaire: number | null; montantTTC: number | null; isLowest: boolean }>;

    const unitPrices = Object.values(rawOffers)
      .map((offer) => offer.prixUnitaire)
      .filter((value): value is number => value != null && value > 0);
    const lowestUnitPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : null;

    const offers = Object.fromEntries(
      Object.entries(rawOffers).map(([proformaId, offer]) => [
        proformaId,
        {
          ...offer,
          isLowest: lowestUnitPrice != null && offer.prixUnitaire === lowestUnitPrice,
        },
      ])
    );

    return {
      key,
      designation: line.designation,
      categorie: line.categorie || '-',
      quantite: line.quantite,
      offers,
    };
  });

  return { proformas, bestProformaId, bestAmount, recommendedProformaId, rows };
};

const buildCommissionDecisionRows = (
  request: PurchaseRequest | undefined,
  supplierRatings: Map<string, number>
): CommissionDecisionRow[] => {
  const proformas = [...(request?.proformas || [])];
  if (proformas.length === 0) {
    return [];
  }

  const bestAmount = Math.min(...proformas.map((proforma) => proforma.montantTTC || 0).filter((amount) => amount > 0));
  const deliveryCandidates = proformas
    .map((proforma) => proforma.delaiLivraisonJours)
    .filter((value): value is number => value != null && value >= 0);
  const bestDelay = deliveryCandidates.length > 0 ? Math.min(...deliveryCandidates) : null;

  return proformas
    .map((proforma) => {
      const supplierRating = supplierRatings.get(proforma.fournisseurId) ?? 3;
      const priceScore =
        bestAmount > 0 && proforma.montantTTC > 0 ? clampScore((bestAmount / proforma.montantTTC) * 50) : 0;
      const delayScore =
        bestDelay != null && proforma.delaiLivraisonJours != null && proforma.delaiLivraisonJours > 0
          ? clampScore((bestDelay / proforma.delaiLivraisonJours) * 20)
          : bestDelay === 0 && proforma.delaiLivraisonJours === 0
          ? 20
          : 0;
      const availabilityScore = computeAvailabilityScore(proforma.disponibilite);
      const supplierScore = clampScore((Math.max(0, Math.min(supplierRating, 5)) / 5) * 15);
      const totalScore = clampScore(priceScore + delayScore + availabilityScore + supplierScore);

      const justification = [
        proforma.recommendedForApproval ? 'Recommandée par le service achat' : null,
        proforma.selectedForOrder ? 'Retenue après validation DG' : null,
        bestAmount > 0 && proforma.montantTTC === bestAmount ? 'Offre la moins-disante' : null,
        proforma.observationsAchat || null,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        proformaId: proforma.id,
        numeroProforma: proforma.numeroProforma,
        fournisseurNom: proforma.fournisseurNom || 'Fournisseur',
        montantTTC: proforma.montantTTC,
        delaiLivraisonJours: proforma.delaiLivraisonJours ?? null,
        disponibilite: proforma.disponibilite || null,
        observationsAchat: proforma.observationsAchat || proforma.notes || null,
        status: proforma.status,
        selectedForOrder: Boolean(proforma.selectedForOrder),
        recommendedForApproval: Boolean(proforma.recommendedForApproval),
        priceScore,
        delayScore,
        availabilityScore,
        supplierScore,
        totalScore,
        justification,
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore);
};

export default function PurchaseQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DpaDraftLine[]>([createEmptyDpaDraftLine()]);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [createProformaOpen, setCreateProformaOpen] = useState(false);
  const [rejectProformaTarget, setRejectProformaTarget] = useState<PurchaseProforma | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isCommissionPrintOpen, setIsCommissionPrintOpen] = useState(false);
  const userServiceId = String(user?.serviceId ?? user?.service?.id ?? '');
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const hasDirectPermission = (...permissions: string[]) =>
    permissions.some((permission) => permissionSet.has(permission.toLowerCase()));
  const canUpdate =
    isAdminRole(user) || hasDirectPermission('purchases.update', 'purchase_requests.update');
  const canApprove =
    isAdminRole(user) || hasDirectPermission('purchase_requests.approve');
  const canReject = canApprove;
  const canChooseService = isAdminRole(user) || hasDirectPermission('services.read_all');
  const canCreateOrder =
    isAdminRole(user) || hasDirectPermission('purchase_orders.create', 'purchase_orders.update');
  const canReadCommittee =
    isAdminRole(user) ||
    hasDirectPermission('purchase_requests.read_committee', 'purchase_requests.read_all', 'purchase_requests.approve');
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

  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-quote-detail'],
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['procurement-service-options-detail'],
    queryFn: () => adminServicesService.getServices(),
    enabled: canChooseService || !userServiceId,
    staleTime: 5 * 60 * 1000,
  });

  const request = requestResponse?.data;
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];
  const services = servicesResponse?.data ?? [];
  const approvalHistory = approvalHistoryResponse?.data ?? request?.approvalHistory ?? [];
  const selectedService = services.find((service) => String(service.id) === selectedServiceId);
  const serviceForPrint =
    selectedService ||
    services.find((service) => String(service.id) === String(request?.serviceId ?? ''));
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
    setSupplierId(request.supplierId || '');
    setManualSupplierName(request.manualSupplierName || (!request.supplierId ? request.supplierName || '' : ''));
    setSelectedServiceId(String(request.serviceId ?? userServiceId ?? ''));
    setDateBesoin(request.dateBesoin ? request.dateBesoin.slice(0, 10) : '');
    setLines(
      request.lines && request.lines.length > 0
        ? request.lines.map((line) => ({
            id: line.id,
            articleId: line.articleId || '',
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
        supplierId: supplierId || null,
        manualSupplierName: supplierId ? null : manualSupplierName || null,
        serviceId: selectedServiceId ? Number(selectedServiceId) : undefined,
        serviceName: selectedService?.name || request?.serviceName || null,
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
      toast.success('La DPA a été mise à jour.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise a jour de la DPA.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => procurementService.submitRequest(id, 'Soumis depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('La DPA a été soumise au DG pour validation.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la soumission de la DPA.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => procurementService.approveRequest(id, 'Approuve depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('La DPA a été validée. Le service achat peut maintenant enregistrer les proformas.');
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
      toast.success('La DPA a été rejetée.');
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
      toast.success('La proforma a été soumise au DG.');
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
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
            }
          : line
      )
    );
  };

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  if (isLoading || !request) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats/devis">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux DPA
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{request.number}</h1>
            <Badge variant={getStatusVariant(request.status)}>{statusLabels[request.status]}</Badge>
            {request.bonCommandeId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/achats/commandes?selectedOrderId=${request.bonCommandeId}`}>Voir le bon de commande</Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez cette DPA et ses informations avant décision achat, validation DG et conversion en bon de commande.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canExportCommittee && (
            <Button variant="outline" onClick={() => setIsCommissionPrintOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              PV commission
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canEditRequest && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
              >
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </>
          )}

          {canSubmit && (request.status === 'BROUILLON' || request.status === 'REJETEE') && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || lines.every((line) => !line.designation)}
            >
              <Send className="mr-2 h-4 w-4" />
              Soumettre au DG
            </Button>
          )}

          {(canApprove || canReject) && request.status === 'SOUMISE' && (
            <>
              {canApprove && (
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Valider DPA
                </Button>
              )}
              {canReject && (
                <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={rejectMutation.isPending}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
              )}
            </>
          )}

          {canManageProformasFlow && !request.bonCommandeId && (
            <Button variant="outline" onClick={() => setCreateProformaOpen(true)} disabled={createProformaMutation.isPending}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Nouvelle proforma
            </Button>
          )}

          {canGenerateOrder && (
            <Button onClick={() => generateOrderMutation.mutate()} disabled={generateOrderMutation.isPending}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Générer le BC
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Service</div><div className="text-lg font-semibold">{request.serviceName || 'Non attribue'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fournisseur DPA</div><div className="text-lg font-semibold">{selectedSupplier?.name || request.supplierName || request.manualSupplierName || 'A définir'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant TTC DPA</div><div className="text-lg font-semibold">{(request.montantTTC || request.estimatedAmount || 0) > 0 ? formatCurrency(request.montantTTC || request.estimatedAmount || 0) : '0 F CFA'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Derniere etape</div><div className="text-lg font-semibold">{timeline[timeline.length - 1]?.title || 'Creation'}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="informations" className="space-y-6">
        <TabsList className="grid w-full max-w-[760px] grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="decision">Décision achat</TabsTrigger>
          <TabsTrigger value="proformas">Proformas</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="informations" className="space-y-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Informations DPA</CardTitle>
              <CardDescription>
                Gérez la DPA, son service, son fournisseur, ses lignes et ses montants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EditDpaCard
                canEdit={canEditRequest}
                showServiceSelector={canChooseService || !request.serviceId}
                selectedServiceId={selectedServiceId}
                services={services}
                onServiceChange={(value) => {
                  setIsDirty(true);
                  setSelectedServiceId(value);
                }}
                title={title}
                onTitleChange={(value) => {
                  setIsDirty(true);
                  setTitle(value);
                }}
                dateBesoin={dateBesoin}
                onDateBesoinChange={(value) => {
                  setIsDirty(true);
                  setDateBesoin(value);
                }}
                supplierId={supplierId}
                suppliers={suppliers}
                onSupplierChange={(value) => {
                  setIsDirty(true);
                  setSupplierId(value);
                  if (value) {
                    setManualSupplierName('');
                  }
                }}
                manualSupplierName={manualSupplierName}
                onManualSupplierNameChange={(value) => {
                  setIsDirty(true);
                  setManualSupplierName(value);
                  if (value.trim()) {
                    setSupplierId('');
                  }
                }}
                notes={notes}
                onNotesChange={(value) => {
                  setIsDirty(true);
                  setNotes(value);
                }}
                description={description}
                onDescriptionChange={(value) => {
                  setIsDirty(true);
                  setDescription(value);
                }}
                lines={lines}
                articles={articles}
                onAddLine={() => {
                  setIsDirty(true);
                  setLines((current) => [...current, createEmptyDpaDraftLine()]);
                }}
                onDuplicateLine={(index) => {
                  setIsDirty(true);
                  setLines((current) => {
                    const source = current[index];
                    return [...current.slice(0, index + 1), { ...source, id: undefined }, ...current.slice(index + 1)];
                  });
                }}
                onRemoveLine={(index) => {
                  setIsDirty(true);
                  setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
                }}
                onUpdateLine={(index, patch) => {
                  setIsDirty(true);
                  updateLine(index, patch);
                }}
                onSelectArticle={(index, articleId) => {
                  setIsDirty(true);
                  updateLineArticle(index, articleId);
                }}
                formatCurrency={formatCurrency}
                totals={totals}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="space-y-6">
          <ProformaDecisionBoard
            request={request}
            proformas={proformaComparison.proformas}
            bestProformaId={proformaComparison.bestProformaId}
            bestAmount={proformaComparison.bestAmount}
            commissionDecisionRows={commissionDecisionRows}
            comparisonRows={proformaComparison.rows}
            canReadCommittee={canReadCommittee}
            canManageProformasFlow={canManageProformasFlow}
            canRecommendSupplier={canRecommendSupplier}
            isRecommendPending={recommendProformaMutation.isPending}
            onRecommend={(proformaId) => recommendProformaMutation.mutate(proformaId)}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="proformas" className="space-y-6">
          <ProformaSuppliersSection
            request={request}
            canManageProformasFlow={canManageProformasFlow}
            canApprove={canApprove}
            canReject={canReject}
            canGenerateOrder={canGenerateOrder}
            isRecommendPending={recommendProformaMutation.isPending}
            isSubmitPending={submitProformaMutation.isPending}
            isApprovePending={approveProformaMutation.isPending}
            isRejectPending={rejectProformaMutation.isPending}
            isGeneratePending={generateOrderMutation.isPending}
            onRecommend={(proformaId) => recommendProformaMutation.mutate(proformaId)}
            onSubmit={(proformaId) => submitProformaMutation.mutate(proformaId)}
            onApprove={(proformaId) => approveProformaMutation.mutate(proformaId)}
            onReject={(proforma) => setRejectProformaTarget(proforma)}
            onGenerateOrder={() => generateOrderMutation.mutate()}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="historique" className="space-y-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Timeline métier</CardTitle>
              <CardDescription>
                Chronologie de la DPA depuis sa création jusqu&apos;au bon de commande.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          item.tone === 'success'
                            ? 'bg-green-500'
                            : item.tone === 'warning'
                            ? 'bg-amber-500'
                            : item.tone === 'danger'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <div className="mt-1 h-full w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Historique DPA</CardTitle>
              <CardDescription>Journal détaillé des actions et transitions sur cette DPA.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.actorServiceName || log.actorEmail || '-'}</TableCell>
                      <TableCell>{log.fromStatus} → {log.toStatus}</TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {approvalHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucun évènement DPA enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RejectPurchaseRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        requestNumber={request.number}
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          rejectMutation.mutate(reason, {
            onSuccess: () => {
              setRejectDialogOpen(false);
            },
          });
        }}
      />

      <RejectPurchaseRequestDialog
        open={Boolean(rejectProformaTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectProformaTarget(null);
        }}
        requestNumber={rejectProformaTarget?.numeroProforma}
        isPending={rejectProformaMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectProformaTarget) return;
          rejectProformaMutation.mutate({
            proformaId: rejectProformaTarget.id,
            commentaire: reason,
          });
        }}
      />

      <CreateProformaDialog
        open={createProformaOpen}
        onOpenChange={setCreateProformaOpen}
        suppliers={suppliers}
        articles={articles}
        defaultTitle={request.objet || request.title}
        defaultSupplierId={request.supplierId || undefined}
        isPending={createProformaMutation.isPending}
        onSubmit={(payload) => createProformaMutation.mutate(payload)}
      />

      {isPrintOpen && (
        <PurchaseRequestPrint
          request={{
            ...request,
            supplierName: selectedSupplier?.name || request.supplierName || null,
            lines: lines.map((line) => ({
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
          }}
          supplier={selectedSupplier}
          serviceLogoUrl={serviceForPrint?.imageUrl}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      {isCommissionPrintOpen && (
        <PurchaseCommissionPrint
          request={request}
          rows={commissionDecisionRows}
          serviceLogoUrl={serviceForPrint?.imageUrl}
          onClose={() => setIsCommissionPrintOpen(false)}
        />
      )}
    </div>
  );
}
