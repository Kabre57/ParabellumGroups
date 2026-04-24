import { apiClient } from '../shared/client';
import {
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
  PurchaseProforma,
  PurchaseProformaApprovalLog,
  PurchaseProformaStatus,
  ProcurementStats,
  StockItem,
  StockMovement,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
  PurchaseOrderValidationLog,
  PurchaseRequestApprovalLog,
} from './types';

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSupplier = (supplier: any): Supplier => {
  const bonsCommande = Array.isArray(supplier?.bonsCommande) ? supplier.bonsCommande : [];

  return {
    ...supplier,
    id: String(supplier?.id ?? ''),
    name: supplier?.name || supplier?.nom || supplier?.email || 'Sans nom',
    nom: supplier?.nom || supplier?.name || '',
    email: supplier?.email || '',
    phone: supplier?.phone || supplier?.telephone || '',
    telephone: supplier?.telephone || supplier?.phone || '',
    address: supplier?.address || supplier?.adresse || '',
    adresse: supplier?.adresse || supplier?.address || '',
    category: supplier?.category || supplier?.categorie || supplier?.categorieActivite || '',
    categorie: supplier?.categorie || supplier?.category || supplier?.categorieActivite || '',
    categorieActivite: supplier?.categorieActivite || supplier?.categorie || supplier?.category || '',
    rating: normalizeNumber(supplier?.rating, 0),
    status: supplier?.status || 'ACTIF',
    ordersCount: supplier?.ordersCount ?? bonsCommande.length,
    totalAmount:
      supplier?.totalAmount ??
      bonsCommande.reduce((sum: number, bon: any) => sum + normalizeNumber(bon?.montantTotal, 0), 0),
    bonsCommande,
  };
};

const normalizePurchaseProforma = (proforma: any): PurchaseProforma => {
  const lignes = Array.isArray(proforma?.lines)
    ? proforma.lines
    : Array.isArray(proforma?.lignes)
    ? proforma.lignes
    : [];

  return {
    id: String(proforma?.id ?? ''),
    numeroProforma: proforma?.numeroProforma || '',
    title: proforma?.title || proforma?.titre || proforma?.numeroProforma || '',
    titre: proforma?.titre || proforma?.title || null,
    demandeAchatId: String(proforma?.demandeAchatId ?? ''),
    fournisseurId: String(proforma?.fournisseurId ?? ''),
    fournisseurNom: proforma?.fournisseurNom || proforma?.fournisseur?.nom || null,
    devise: proforma?.devise || 'XOF',
    montantHT: normalizeNumber(proforma?.montantHT, 0),
    montantTVA: normalizeNumber(proforma?.montantTVA, 0),
    montantTTC: normalizeNumber(proforma?.montantTTC, 0),
    delaiLivraisonJours:
      proforma?.delaiLivraisonJours != null
        ? normalizeNumber(proforma.delaiLivraisonJours, 0)
        : null,
    disponibilite: proforma?.disponibilite || null,
    observationsAchat: proforma?.observationsAchat || null,
    committeeProfileCode: proforma?.committeeProfileCode || null,
    committeeEvaluation: proforma?.committeeEvaluation
      ? {
          profileCode: proforma.committeeEvaluation?.profileCode || proforma?.committeeProfileCode || null,
          eliminatoryChecks: Array.isArray(proforma.committeeEvaluation?.eliminatoryChecks)
            ? proforma.committeeEvaluation.eliminatoryChecks.map((item: any) => ({
                criterionIndex: normalizeNumber(item?.criterionIndex, 0),
                label: String(item?.label || ''),
                requiredDocument: item?.requiredDocument || null,
                passed:
                  item?.passed === true || item?.passed === false ? Boolean(item.passed) : null,
                notes: item?.notes || null,
              }))
            : [],
          eliminatoryPassed: Boolean(proforma.committeeEvaluation?.eliminatoryPassed),
          technicalScores: Array.isArray(proforma.committeeEvaluation?.technicalScores)
            ? proforma.committeeEvaluation.technicalScores.map((item: any) => ({
                criterionIndex: normalizeNumber(item?.criterionIndex, 0),
                label: String(item?.label || ''),
                maxPoints: normalizeNumber(item?.maxPoints, 0),
                points: normalizeNumber(item?.points, 0),
                notes: item?.notes || null,
              }))
            : [],
          technicalTotal: normalizeNumber(proforma.committeeEvaluation?.technicalTotal, 0),
          financialCriterion: proforma.committeeEvaluation?.financialCriterion
            ? {
                criterionIndex: normalizeNumber(proforma.committeeEvaluation.financialCriterion?.criterionIndex, 15),
                label: String(proforma.committeeEvaluation.financialCriterion?.label || ''),
                maxPoints: normalizeNumber(proforma.committeeEvaluation.financialCriterion?.maxPoints, 40),
                points: normalizeNumber(proforma.committeeEvaluation.financialCriterion?.points, 0),
                notes: proforma.committeeEvaluation.financialCriterion?.notes || null,
              }
            : null,
          financialScore: normalizeNumber(proforma.committeeEvaluation?.financialScore, 0),
          totalScore: normalizeNumber(proforma.committeeEvaluation?.totalScore, 0),
          decision: proforma.committeeEvaluation?.decision || null,
          decisionNote: proforma.committeeEvaluation?.decisionNote || null,
          lastUpdatedAt: proforma.committeeEvaluation?.lastUpdatedAt || null,
          lastUpdatedByUserId: proforma.committeeEvaluation?.lastUpdatedByUserId || null,
          lastUpdatedByEmail: proforma.committeeEvaluation?.lastUpdatedByEmail || null,
          lastUpdatedByServiceId:
            proforma.committeeEvaluation?.lastUpdatedByServiceId != null
              ? Number(proforma.committeeEvaluation.lastUpdatedByServiceId)
              : null,
          lastUpdatedByServiceName: proforma.committeeEvaluation?.lastUpdatedByServiceName || null,
          signedAt: proforma.committeeEvaluation?.signedAt || null,
          signedByUserId: proforma.committeeEvaluation?.signedByUserId || null,
          signedByEmail: proforma.committeeEvaluation?.signedByEmail || null,
          signedByServiceId:
            proforma.committeeEvaluation?.signedByServiceId != null
              ? Number(proforma.committeeEvaluation.signedByServiceId)
              : null,
          signedByServiceName: proforma.committeeEvaluation?.signedByServiceName || null,
        }
      : null,
    committeeDecision: proforma?.committeeDecision || null,
    committeeDecisionNote: proforma?.committeeDecisionNote || null,
    committeeEvaluatedAt: proforma?.committeeEvaluatedAt || null,
    committeeEvaluatedByUserId: proforma?.committeeEvaluatedByUserId || null,
    committeeEvaluatedByEmail: proforma?.committeeEvaluatedByEmail || null,
    committeeEvaluatedByServiceId:
      proforma?.committeeEvaluatedByServiceId != null
        ? normalizeNumber(proforma.committeeEvaluatedByServiceId, 0)
        : null,
    committeeEvaluatedByServiceName: proforma?.committeeEvaluatedByServiceName || null,
    committeeSignedAt: proforma?.committeeSignedAt || null,
    committeeSignedByUserId: proforma?.committeeSignedByUserId || null,
    committeeSignedByEmail: proforma?.committeeSignedByEmail || null,
    committeeSignedByServiceId:
      proforma?.committeeSignedByServiceId != null
        ? normalizeNumber(proforma.committeeSignedByServiceId, 0)
        : null,
    committeeSignedByServiceName: proforma?.committeeSignedByServiceName || null,
    status: (proforma?.status || 'BROUILLON') as PurchaseProformaStatus,
    notes: proforma?.notes || null,
    submittedAt: proforma?.submittedAt || null,
    approvedAt: proforma?.approvedAt || null,
    approvedByUserId: proforma?.approvedByUserId || null,
    approvedByServiceId: proforma?.approvedByServiceId != null ? Number(proforma.approvedByServiceId) : null,
    approvedByServiceName: proforma?.approvedByServiceName || null,
    rejectionReason: proforma?.rejectionReason || null,
    selectedForOrder: Boolean(proforma?.selectedForOrder),
    recommendedForApproval: Boolean(proforma?.recommendedForApproval),
    bonCommandeId: proforma?.bonCommandeId || proforma?.bonCommande?.id || null,
    numeroBon: proforma?.numeroBon || proforma?.bonCommande?.numeroBon || null,
    createdAt: proforma?.createdAt || undefined,
    updatedAt: proforma?.updatedAt || undefined,
    lignes: lignes.map((ligne: any) => ({
      id: String(ligne?.id ?? ''),
      articleId: ligne?.articleId || null,
      referenceArticle: ligne?.referenceArticle || null,
      imageUrl: ligne?.imageUrl || ligne?.article?.imageUrl || null,
      designation: ligne?.designation || '',
      categorie: ligne?.categorie || null,
      quantite: normalizeNumber(ligne?.quantite ?? ligne?.quantity, 0),
      prixUnitaire: normalizeNumber(ligne?.prixUnitaire ?? ligne?.unitPrice, 0),
      tva: normalizeNumber(ligne?.tva, 0),
      montantHT: normalizeNumber(ligne?.montantHT ?? ligne?.amountHT, 0),
      montantTTC: normalizeNumber(ligne?.montantTTC ?? ligne?.amount, 0),
    })),
    approvalHistory: Array.isArray(proforma?.approvalHistory)
      ? proforma.approvalHistory.map((log: any) => ({
          id: String(log?.id ?? ''),
          action: String(log?.action ?? ''),
          fromStatus: String(log?.fromStatus ?? 'BROUILLON') as PurchaseProformaApprovalLog['fromStatus'],
          toStatus: String(log?.toStatus ?? 'BROUILLON') as PurchaseProformaApprovalLog['toStatus'],
          actorUserId: log?.actorUserId || null,
          actorEmail: log?.actorEmail || null,
          actorServiceId: log?.actorServiceId != null ? Number(log.actorServiceId) : null,
          actorServiceName: log?.actorServiceName || null,
          commentaire: log?.commentaire || null,
          createdAt: log?.createdAt || new Date().toISOString(),
        }))
      : [],
  };
};

const normalizePurchaseRequest = (request: any): PurchaseRequest => {
  const lignes = Array.isArray(request?.lines)
    ? request.lines
    : Array.isArray(request?.lignes)
    ? request.lignes
    : [];

  return {
    id: String(request?.id ?? ''),
    number: request?.number || request?.numeroDemande || request?.numeroDevisAchat || '',
    numeroDemande: request?.numeroDemande || request?.number || '',
    numeroDevisAchat: request?.numeroDevisAchat || request?.numeroDemande || request?.number || '',
    title: request?.title || request?.titre || request?.objet || 'Devis achat',
    objet: request?.objet || request?.title || request?.titre || '',
    description: request?.description || '',
    requesterId: String(request?.requesterId ?? request?.demandeurId ?? request?.demandeurUserId ?? ''),
    requesterEmail: request?.requesterEmail || request?.demandeurEmail || null,
    enterpriseId: request?.enterpriseId != null ? Number(request.enterpriseId) : null,
    enterpriseName: request?.enterpriseName || null,
    serviceId: request?.serviceId != null ? Number(request.serviceId) : null,
    serviceName: request?.serviceName || null,
    supplierId: request?.supplierId || request?.fournisseurId || null,
    supplierName:
      request?.supplierName ||
      request?.fournisseurNom ||
      request?.fournisseurNomLibre ||
      request?.fournisseur?.nom ||
      null,
    manualSupplierName: request?.manualSupplierName || request?.fournisseurNomLibre || null,
    devise: request?.devise || 'XOF',
    status: request?.status || 'BROUILLON',
    estimatedAmount: normalizeNumber(request?.estimatedAmount ?? request?.montantEstime ?? request?.montantTTC, 0),
    montantHT: normalizeNumber(request?.montantHT, 0),
    montantTVA: normalizeNumber(request?.montantTVA, 0),
    montantTTC: normalizeNumber(request?.montantTTC ?? request?.estimatedAmount ?? request?.montantEstime, 0),
    approvalStatus: request?.approvalStatus || request?.status || 'BROUILLON',
    submittedAt: request?.submittedAt || null,
    approvedAt: request?.approvedAt || null,
    approvedByUserId: request?.approvedByUserId || null,
    approvedByServiceId:
      request?.approvedByServiceId != null ? Number(request.approvedByServiceId) : null,
    approvedByServiceName: request?.approvedByServiceName || null,
    rejectionReason: request?.rejectionReason || null,
    notes: request?.notes || null,
    date: request?.date || request?.dateDemande || request?.createdAt || '',
    dateBesoin: request?.dateBesoin || null,
    bonCommandeId: request?.bonCommandeId || null,
    numeroBon: request?.numeroBon || request?.bonCommande?.numeroBon || null,
    selectedProformaId: request?.selectedProformaId || null,
    selectedProformaNumber: request?.selectedProformaNumber || null,
    lines: lignes.map((ligne: any) => ({
      id: String(ligne?.id ?? ''),
      articleId: ligne?.articleId || null,
      referenceArticle: ligne?.referenceArticle || null,
      imageUrl: ligne?.imageUrl || ligne?.article?.imageUrl || null,
      designation: ligne?.designation || ligne?.description || '',
      categorie: ligne?.categorie || null,
      unite: ligne?.unite || ligne?.article?.unite || null,
      quantite: normalizeNumber(ligne?.quantite ?? ligne?.quantity, 0),
      prixUnitaire: normalizeNumber(ligne?.prixUnitaire ?? ligne?.unitPrice, 0),
      tva: normalizeNumber(ligne?.tva, 0),
      montantHT: normalizeNumber(ligne?.montantHT ?? ligne?.amountHT, 0),
      montantTTC: normalizeNumber(ligne?.montantTTC ?? ligne?.amount, 0),
    })),
    approvalHistory: Array.isArray(request?.approvalHistory)
      ? request.approvalHistory.map((log: any) => ({
          id: String(log?.id ?? ''),
          action: String(log?.action ?? ''),
          fromStatus: String(log?.fromStatus ?? 'BROUILLON') as PurchaseRequestApprovalLog['fromStatus'],
          toStatus: String(log?.toStatus ?? 'BROUILLON') as PurchaseRequestApprovalLog['toStatus'],
          actorUserId: log?.actorUserId || null,
          actorEmail: log?.actorEmail || null,
          actorServiceId: log?.actorServiceId != null ? Number(log.actorServiceId) : null,
          actorServiceName: log?.actorServiceName || null,
          commentaire: log?.commentaire || null,
          createdAt: log?.createdAt || new Date().toISOString(),
        }))
      : [],
    proformas: Array.isArray(request?.proformas)
      ? request.proformas.map((proforma: any) => normalizePurchaseProforma(proforma))
      : [],
  };
};

const normalizePurchaseOrder = (order: any): PurchaseOrder => ({
  id: String(order?.id ?? ''),
  number: order?.number || order?.numeroBon || '',
  numeroBon: order?.numeroBon || order?.number || '',
  enterpriseId: order?.enterpriseId != null ? Number(order.enterpriseId) : null,
  enterpriseName: order?.enterpriseName || null,
  supplierId: order?.supplierId || order?.fournisseurId || undefined,
  supplier: order?.supplier || order?.fournisseurNom || order?.fournisseur?.nom || undefined,
  fournisseurNom: order?.fournisseurNom || order?.supplier || order?.fournisseur?.nom || undefined,
  supplierEmail: order?.supplierEmail || order?.fournisseur?.email || undefined,
  status: order?.status || 'BROUILLON',
  amount: normalizeNumber(order?.amount ?? order?.montantTotal, 0),
  montantHT: normalizeNumber(order?.montantHT, 0),
  montantTVA: normalizeNumber(order?.montantTVA, 0),
  montantTotal: normalizeNumber(order?.montantTotal ?? order?.amount, 0),
  items: normalizeNumber(order?.items ?? order?.lignes?.length ?? order?.itemsDetail?.length, 0),
  date: order?.date || order?.dateCommande || order?.createdAt || '',
  deliveryDate: order?.deliveryDate || order?.dateLivraison || undefined,
  serviceId: order?.serviceId != null ? Number(order.serviceId) : null,
  serviceName: order?.serviceName || null,
  sourceDevisAchatId: order?.sourceDevisAchatId || order?.demandeAchatId || null,
  requestId: order?.requestId || order?.demandeAchatId || undefined,
  requestNumber: order?.requestNumber || order?.demandeAchat?.numeroDemande || undefined,
  proformaId: order?.proformaId || null,
  proformaNumber: order?.proformaNumber || order?.proforma?.numeroProforma || null,
  itemsDetail: Array.isArray(order?.itemsDetail)
    ? order.itemsDetail.map((ligne: any) => ({
        id: String(ligne?.id ?? ''),
        articleId: ligne?.articleId || null,
        referenceArticle: ligne?.referenceArticle || null,
        imageUrl: ligne?.imageUrl || ligne?.article?.imageUrl || null,
        designation: ligne?.designation || '',
        categorie: ligne?.categorie || null,
        unite: ligne?.unite || ligne?.article?.unite || null,
        quantity: normalizeNumber(ligne?.quantity ?? ligne?.quantite, 0),
        quantite: normalizeNumber(ligne?.quantite ?? ligne?.quantity, 0),
        unitPrice: normalizeNumber(ligne?.unitPrice ?? ligne?.prixUnitaire, 0),
        prixUnitaire: normalizeNumber(ligne?.prixUnitaire ?? ligne?.unitPrice, 0),
        amount: normalizeNumber(ligne?.amount ?? ligne?.montantTTC, 0),
        amountHT: normalizeNumber(ligne?.amountHT ?? ligne?.montantHT, 0),
        montantTTC: normalizeNumber(ligne?.montantTTC ?? ligne?.amount, 0),
        tva: normalizeNumber(ligne?.tva, 0),
      }))
    : Array.isArray(order?.lignes)
    ? order.lignes.map((ligne: any) => ({
        id: String(ligne?.id ?? ''),
        articleId: ligne?.articleId || null,
        referenceArticle: ligne?.referenceArticle || null,
        imageUrl: ligne?.imageUrl || ligne?.article?.imageUrl || null,
        designation: ligne?.designation || '',
        categorie: ligne?.categorie || null,
        unite: ligne?.unite || ligne?.article?.unite || null,
        quantity: normalizeNumber(ligne?.quantite, 0),
        quantite: normalizeNumber(ligne?.quantite, 0),
        unitPrice: normalizeNumber(ligne?.prixUnitaire, 0),
        prixUnitaire: normalizeNumber(ligne?.prixUnitaire, 0),
        amount: normalizeNumber(ligne?.montantTTC ?? ligne?.montant, 0),
        amountHT: normalizeNumber(ligne?.montantHT, 0),
        montantTTC: normalizeNumber(ligne?.montantTTC ?? ligne?.montant, 0),
        tva: normalizeNumber(ligne?.tva, 0),
      }))
    : [],
});

const normalizeListResponse = <T>(payload: any): ListResponse<T> => {
  if (Array.isArray(payload)) {
    return { success: true, data: payload };
  }

  if (Array.isArray(payload?.data)) {
    return {
      success: payload.success ?? true,
      data: payload.data,
      meta: payload.meta ?? (payload.pagination ? { pagination: payload.pagination } : undefined),
    };
  }

  return {
    success: payload?.success ?? true,
    data: [],
    meta: payload?.meta ?? (payload?.pagination ? { pagination: payload.pagination } : undefined),
  };
};

const normalizeDetailResponse = <T>(payload: any): DetailResponse<T> => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
      message: payload.message,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};

const normalizeStatsResponse = <T>(payload: any): { success: boolean; data: T } => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};

export const procurementService = {
  async getSuppliers(params?: {
    page?: number;
    limit?: number;
    status?: SupplierStatus;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Supplier>> {
    const response = await apiClient.get('/procurement/fournisseurs', {
      params: {
        ...params,
        categorieActivite: params?.category,
      },
    });
    const normalized = normalizeListResponse<Supplier>(response.data);
    return {
      ...normalized,
      data: normalized.data.map(normalizeSupplier),
    };
  },

  async getSupplier(id: string): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.get(`/procurement/fournisseurs/${id}`);
    const normalized = normalizeDetailResponse<Supplier>(response.data);
    return {
      ...normalized,
      data: normalizeSupplier(normalized.data),
    };
  },

  async getSupplierStats(id: string): Promise<{ success: boolean; data: { ordersCount: number; totalAmount: number; rating: number } }> {
    const response = await apiClient.get(`/procurement/fournisseurs/${id}/stats`);
    const normalized = normalizeStatsResponse<any>(response.data);
    return {
      success: normalized.success,
      data: {
        ordersCount: normalizeNumber(normalized.data?.ordersCount ?? normalized.data?.totalCommandes, 0),
        totalAmount: normalizeNumber(normalized.data?.totalAmount ?? normalized.data?.montantTotal, 0),
        rating: normalizeNumber(normalized.data?.rating, 0),
      },
    };
  },

  async createSupplier(data: {
    nom: string;
    email: string;
    telephone?: string;
    adresse?: string;
    categorie?: string;
    rating?: number;
  }): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.post('/procurement/fournisseurs', data);
    const normalized = normalizeDetailResponse<Supplier>(response.data);
    return {
      ...normalized,
      data: normalizeSupplier(normalized.data),
    };
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.put(`/procurement/fournisseurs/${id}`, data);
    const normalized = normalizeDetailResponse<Supplier>(response.data);
    return {
      ...normalized,
      data: normalizeSupplier(normalized.data),
    };
  },

  async updateSupplierRating(id: string, rating: number): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.patch(`/procurement/fournisseurs/${id}/rating`, { rating });
    const normalized = normalizeDetailResponse<Supplier>(response.data);
    return {
      ...normalized,
      data: normalizeSupplier(normalized.data),
    };
  },

  async deleteSupplier(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/fournisseurs/${id}`);
    return response.data;
  },

  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: PurchaseRequestStatus;
    requesterId?: string;
    enterpriseId?: string | number;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<PurchaseRequest>> {
    const response = await apiClient.get('/procurement/devis-achat', { params });
    const normalized = normalizeListResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalized.data.map(normalizePurchaseRequest),
    };
  },

  async getRequest(id: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.get(`/procurement/devis-achat/${id}`);
    const normalized = normalizeDetailResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseRequest(normalized.data),
    };
  },

  async getRequestApprovalHistory(id: string): Promise<ListResponse<PurchaseRequestApprovalLog>> {
    const response = await apiClient.get(`/procurement/devis-achat/${id}/approval-history`);
    const normalized = normalizeListResponse<PurchaseRequestApprovalLog>(response.data);
    return {
      ...normalized,
      data: normalized.data.map((log: any) => ({
        id: String(log?.id ?? ''),
        action: String(log?.action ?? ''),
        fromStatus: String(log?.fromStatus ?? 'BROUILLON') as PurchaseRequestApprovalLog['fromStatus'],
        toStatus: String(log?.toStatus ?? 'BROUILLON') as PurchaseRequestApprovalLog['toStatus'],
        actorUserId: log?.actorUserId || null,
        actorEmail: log?.actorEmail || null,
        actorServiceId: log?.actorServiceId != null ? Number(log.actorServiceId) : null,
        actorServiceName: log?.actorServiceName || null,
        commentaire: log?.commentaire || null,
        createdAt: log?.createdAt || new Date().toISOString(),
      })),
    };
  },

  async getRequestsStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/devis-achat/stats');
    return normalizeStatsResponse<ProcurementStats>(response.data);
  },

  async createRequest(data: {
    titre: string;
    description?: string;
    objet?: string;
    enterpriseId?: string | number;
    fournisseurId?: string;
    fournisseurNomLibre?: string;
    dateBesoin?: string;
    notes?: string;
    devise?: string;
      lignes?: Array<{
        articleId?: string;
        referenceArticle?: string;
        designation: string;
        categorie?: string;
        unite?: string;
        quantite: number;
        prixUnitaire: number;
        tva?: number;
    }>;
  }): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post('/procurement/devis-achat', data);
    const normalized = normalizeDetailResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseRequest(normalized.data),
    };
  },

  async updateRequest(id: string, data: Partial<PurchaseRequest>): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.put(`/procurement/devis-achat/${id}`, {
      titre: data.title,
      objet: data.objet,
      description: data.description,
      enterpriseId: data.enterpriseId,
      fournisseurId: data.supplierId,
      fournisseurNomLibre: data.manualSupplierName,
      dateBesoin: data.dateBesoin,
      notes: data.notes,
      devise: data.devise,
      lignes: data.lines,
    });
    const normalized = normalizeDetailResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseRequest(normalized.data),
    };
  },

  async approveRequest(id: string, commentaire?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post(`/procurement/devis-achat/${id}/approve`, { commentaire });
    const normalized = normalizeDetailResponse<any>(response.data);
    const payload = normalized.data?.purchaseQuote || normalized.data;
    return {
      success: normalized.success,
      message: normalized.message,
      data: normalizePurchaseRequest(payload),
    };
  },

  async rejectRequest(id: string, raison?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post(`/procurement/devis-achat/${id}/reject`, { commentaire: raison });
    const normalized = normalizeDetailResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseRequest(normalized.data),
    };
  },

  async submitRequest(id: string, commentaire?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post(`/procurement/devis-achat/${id}/submit`, { commentaire });
    const normalized = normalizeDetailResponse<PurchaseRequest>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseRequest(normalized.data),
    };
  },

  async createProforma(
    requestId: string,
    data: {
      titre?: string;
      fournisseurId: string;
      devise?: string;
      notes?: string;
      delaiLivraisonJours?: number;
      disponibilite?: string;
      observationsAchat?: string;
      lignes: Array<{
        articleId?: string | null;
        referenceArticle?: string | null;
        designation: string;
        categorie?: string | null;
        unite?: string | null;
        quantite: number;
        prixUnitaire: number;
        tva?: number;
      }>;
    }
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(`/procurement/devis-achat/${requestId}/proformas`, data);
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async submitProforma(
    requestId: string,
    proformaId: string,
    commentaire?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/submit`,
      { commentaire }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async approveProforma(
    requestId: string,
    proformaId: string,
    commentaire?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/approve`,
      { commentaire }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async rejectProforma(
    requestId: string,
    proformaId: string,
    raison?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/reject`,
      { commentaire: raison }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async recommendProforma(
    requestId: string,
    proformaId: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/recommend`
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async saveProformaCommitteeEvaluation(
    requestId: string,
    proformaId: string,
    data: {
      profileCode?: string;
      eliminatoryChecks?: Array<{
        criterionIndex: number;
        label: string;
        requiredDocument?: string | null;
        passed: boolean | null;
        notes?: string | null;
      }>;
      technicalScores?: Array<{
        criterionIndex: number;
        label: string;
        maxPoints: number;
        points: number;
        notes?: string | null;
      }>;
      financialCriterion?: {
        criterionIndex: number;
        label: string;
        maxPoints: number;
        notes?: string | null;
      } | null;
      decision?: string | null;
      decisionNote?: string | null;
      signDecision?: boolean;
    }
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/committee-evaluation`,
      data
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async generateOrderFromRequest(
    id: string,
    commentaire?: string,
    proformaId?: string
  ): Promise<
    DetailResponse<{
      purchaseQuote: PurchaseRequest;
      purchaseOrder: { id: string; numeroBon: string; status: PurchaseOrderStatus };
    }>
  > {
    const response = await apiClient.post(`/procurement/devis-achat/${id}/generate-order`, {
      commentaire,
      proformaId,
    });
    const normalized = normalizeDetailResponse<any>(response.data);
    return {
      success: normalized.success,
      message: normalized.message,
      data: {
        purchaseQuote: normalizePurchaseRequest(normalized.data?.purchaseQuote),
        purchaseOrder: normalized.data?.purchaseOrder,
      },
    };
  },

  async deleteRequest(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/devis-achat/${id}`);
    return response.data;
  },

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: PurchaseOrderStatus;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<PurchaseOrder>> {
    const response = await apiClient.get('/procurement/bons-commande', { params });
    const normalized = normalizeListResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalized.data.map(normalizePurchaseOrder),
    };
  },

  async getOrder(id: string): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/bons-commande/${id}`, {
      params: { _ts: Date.now() },
    });
    const normalized = normalizeDetailResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseOrder(normalized.data),
    };
  },

  async getOrdersBySupplier(supplierId: string): Promise<ListResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/bons-commande/fournisseur/${supplierId}`);
    const normalized = normalizeListResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalized.data.map(normalizePurchaseOrder),
    };
  },

  async createOrder(data: {
    fournisseurId: string;
    montantTotal: number;
    lignes?: {
      articleId?: string;
      referenceArticle?: string;
      designation: string;
      categorie?: string;
      unite?: string;
      quantite: number;
      prixUnitaire: number;
      tva?: number;
    }[];
    requestId?: string;
    status?: PurchaseOrderStatus;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post('/procurement/bons-commande', {
      ...data,
      demandeAchatId: data.requestId,
    });
    const normalized = normalizeDetailResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseOrder(normalized.data),
    };
  },

  async createOrderFromProforma(data: {
    proformaId: string;
    status?: PurchaseOrderStatus;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post('/procurement/bons-commande/from-proforma', data);
    const normalized = normalizeDetailResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseOrder(normalized.data),
    };
  },

  async updateOrder(id: string, data: Partial<PurchaseOrder>): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.put(`/procurement/bons-commande/${id}`, data);
    const normalized = normalizeDetailResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseOrder(normalized.data),
    };
  },

  async addOrderLine(id: string, ligne: {
    designation: string;
    unite?: string;
    quantite: number;
    prixUnitaire: number;
    tva?: number;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post(`/procurement/bons-commande/${id}/lignes`, ligne);
    return normalizeDetailResponse<PurchaseOrder>(response.data);
  },

  async updateOrderStatus(
    id: string,
    status: PurchaseOrderStatus,
    action?: 'validate' | 'revert'
  ): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.patch(`/procurement/bons-commande/${id}/status`, { status, action });
    const normalized = normalizeDetailResponse<PurchaseOrder>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseOrder(normalized.data),
    };
  },

  async getOrderValidationHistory(params?: {
    limit?: number;
    page?: number;
    bonCommandeId?: string;
    action?: string;
    fromStatus?: PurchaseOrderStatus;
    toStatus?: PurchaseOrderStatus;
  }): Promise<ListResponse<PurchaseOrderValidationLog>> {
    const response = await apiClient.get('/procurement/bons-commande/validations', {
      params,
    });
    return normalizeListResponse<PurchaseOrderValidationLog>(response.data);
  },

  async getOrderValidationLogs(id: string): Promise<ListResponse<PurchaseOrderValidationLog>> {
    const response = await apiClient.get(`/procurement/bons-commande/${id}/validations`);
    return normalizeListResponse<PurchaseOrderValidationLog>(response.data);
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/bons-commande/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/devis-achat/stats');
    return normalizeStatsResponse<ProcurementStats>(response.data);
  },

  async getStock(params?: {
    page?: number;
    limit?: number;
    category?: string;
    belowThreshold?: boolean;
    search?: string;
  }): Promise<ListResponse<StockItem>> {
    const response = await apiClient.get('/procurement/stock', { params });
    return normalizeListResponse<StockItem>(response.data);
  },

  async getStockMovements(params?: {
    itemId?: string;
    type?: 'IN' | 'OUT';
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<StockMovement>> {
    const response = await apiClient.get('/procurement/stock/movements', { params });
    return normalizeListResponse<StockMovement>(response.data);
  },
};

export * from './types';
