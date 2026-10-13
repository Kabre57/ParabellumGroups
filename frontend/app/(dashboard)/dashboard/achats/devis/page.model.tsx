'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import { enterpriseApi } from '@/lib/api';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { PurchaseRequest, PurchaseRequestStatus } from '@/services/procurement';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { CreateDpaDialog } from '@/components/achat/dpa/CreateDpaDialog';
import { ArticlePickerDialog } from '@/components/inventory/ArticlePickerDialog';
import { QuickCreateArticleDialog } from '@/components/inventory/QuickCreateArticleDialog';
import {
  createEmptyDpaDraftLine,
  type DpaDraftLine,
} from '@/components/achat/dpa';

// État, chargement et actions du parcours d'interface.


export const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  APPROUVEE: 'Validée PDG',
  REJETEE: 'Rejetée',
  PROFORMAS_EN_COURS: 'Proformas en préparation',
  PROFORMA_SOUMISE: 'Proforma soumise PDG',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};



export const statusColors: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  SOUMISE: 'bg-blue-100 text-blue-800',
  APPROUVEE: 'bg-emerald-100 text-emerald-800',
  REJETEE: 'bg-red-100 text-red-800',
  PROFORMAS_EN_COURS: 'bg-violet-100 text-violet-800',
  PROFORMA_SOUMISE: 'bg-indigo-100 text-indigo-800',
  PROFORMA_APPROUVEE: 'bg-cyan-100 text-cyan-800',
  COMMANDEE: 'bg-green-100 text-green-800',
};



export const parseEnterpriseId = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function usePurchaseQuotesPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PurchaseRequestStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [enterpriseId, setEnterpriseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DpaDraftLine[]>([createEmptyDpaDraftLine()]);
  const [articlePickerLineIndex, setArticlePickerLineIndex] = useState<number | null>(null);
  const [articleCreateLineIndex, setArticleCreateLineIndex] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PurchaseRequest | null>(null);

  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const hasDirectPermission = (...permissions: string[]) =>
    permissions.some((permission) => permissionSet.has(permission.toLowerCase()));
  const canManageAllQuotes =
    isAdminRole(user) ||
    hasDirectPermission(
      'quotes.read_all',
      'purchases.read_all',
      'purchase_requests.read_all',
      'purchase_orders.create',
      'purchase_orders.update',
      'purchase_requests.approve'
    );
  const canReadOwnQuotesOnly =
    !canManageAllQuotes &&
    hasDirectPermission(
      'purchases.read',
      'purchases.create',
      'purchases.update',
      'purchase_requests.read',
      'purchase_requests.read_own',
      'purchase_requests.create',
      'purchase_requests.update'
    );
  const canCreate =
    isAdminRole(user) || hasDirectPermission('purchases.create', 'purchase_requests.create');
  const canApprove =
    isAdminRole(user) || hasDirectPermission('purchase_requests.approve');
  const canReject = canApprove;
  const canCreateOrder =
    isAdminRole(user) || hasDirectPermission('purchase_orders.create', 'purchase_orders.update');
  const canSubmit =
    isAdminRole(user) ||
    (hasDirectPermission('purchases.submit') && canCreateOrder);

  const { data: requestsResponse, isLoading } = useQuery({
    queryKey: ['purchase-quotes', statusFilter, search, user?.id, canReadOwnQuotesOnly],
    queryFn: () =>
      procurementService.getRequests({
        limit: 200,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
        requesterId: canReadOwnQuotesOnly ? String(user?.id ?? '') : undefined,
      }),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['procurement-suppliers-for-quotes'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });
  const { data: enterprisesResponse } = useQuery({
    queryKey: ['purchase-quotes-enterprises'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-quotes'],
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

  const requests = (requestsResponse?.data ?? []).filter((request) =>
    canReadOwnQuotesOnly ? String(request.requesterId || '') === String(user?.id ?? '') : true
  );
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];
  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );
  const draftTotals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTTC = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100), 0);
    return { montantHT, montantTTC };
  }, [lines]);

  useEffect(() => {
    if (enterpriseId) return;
    if (user?.enterpriseId != null && user?.enterpriseId !== '') {
      setEnterpriseId(String(user.enterpriseId));
      return;
    }
    if (accessibleEnterprises.length === 1) {
      setEnterpriseId(String(accessibleEnterprises[0].id));
    }
  }, [accessibleEnterprises, enterpriseId, user?.enterpriseId]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'SOUMISE' || item.status === 'PROFORMA_SOUMISE').length,
    converted: requests.filter((item) => item.status === 'COMMANDEE').length,
    totalAmount: requests.reduce((sum, item) => sum + (item.montantTTC || item.estimatedAmount || 0), 0),
  }), [requests]);

  const createMutation = useMutation({
    mutationFn: () =>
      procurementService.createRequest({
        titre: title,
        objet: title,
        description,
        enterpriseId: parseEnterpriseId(enterpriseId),
        fournisseurId: supplierId || undefined,
        fournisseurNomLibre: supplierId ? undefined : manualSupplierName || undefined,
        dateBesoin: dateBesoin || undefined,
        notes: notes || undefined,
        lignes: lines
          .filter((line) => line.designation && line.quantite > 0)
          .map((line) => ({
            articleId: line.articleId || undefined,
            designation: line.designation,
            categorie: line.categorie || undefined,
            unite: line.unite || undefined,
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
          })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      setOpen(false);
      setTitle('');
      setDescription('');
      setNotes('');
      setEnterpriseId(user?.enterpriseId != null ? String(user.enterpriseId) : '');
      setSupplierId('');
      setManualSupplierName('');
      setDateBesoin('');
      setLines([createEmptyDpaDraftLine()]);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du devis interne.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => procurementService.submitRequest(id, 'Soumis pour approbation'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      procurementService.approveRequest(id, 'Approuve pour le besoin demandeur'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementService.rejectRequest(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] }),
  });

  const updateLineArticle = (index: number, articleId: string) => {
    const article = articles.find((item) => item.id === articleId);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              articleId,
              imageUrl: article?.imageUrl || '',
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              unite: article?.unite || line.unite,
              quantite: line.quantite,
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
              tva: line.tva,
            }
          : line
      )
    );
  };

  const updateLine = (index: number, patch: Partial<DpaDraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const applyArticleToLine = (index: number, article: any) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              articleId: article?.id || '',
              imageUrl: article?.imageUrl || '',
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              unite: article?.unite || line.unite,
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? line.prixUnitaire ?? 0),
            }
          : line
      )
    );
  };

  const supplierName = (id?: string | null) =>
    suppliers.find((item) => item.id === id)?.name || '';
  return {
    user,
    queryClient,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    open,
    setOpen,
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
    articlePickerLineIndex,
    setArticlePickerLineIndex,
    articleCreateLineIndex,
    setArticleCreateLineIndex,
    rejectTarget,
    setRejectTarget,
    permissionSet,
    hasDirectPermission,
    canManageAllQuotes,
    canReadOwnQuotesOnly,
    canCreate,
    canApprove,
    canReject,
    canCreateOrder,
    canSubmit,
    requestsResponse,
    isLoading,
    suppliersResponse,
    enterprisesResponse,
    articlesResponse,
    requests,
    suppliers,
    articles,
    accessibleEnterprises,
    draftTotals,
    stats,
    createMutation,
    submitMutation,
    approveMutation,
    rejectMutation,
    updateLineArticle,
    updateLine,
    applyArticleToLine,
    supplierName,
  };
}
