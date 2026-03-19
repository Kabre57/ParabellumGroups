import { apiClient } from '../shared/client';
import {
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
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
    serviceId: request?.serviceId != null ? Number(request.serviceId) : null,
    serviceName: request?.serviceName || null,
    supplierId: request?.supplierId || request?.fournisseurId || null,
    supplierName: request?.supplierName || request?.fournisseurNom || request?.fournisseur?.nom || null,
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
    lines: lignes.map((ligne: any) => ({
      id: String(ligne?.id ?? ''),
      articleId: ligne?.articleId || null,
      referenceArticle: ligne?.referenceArticle || null,
      designation: ligne?.designation || ligne?.description || '',
      categorie: ligne?.categorie || null,
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
  };
};

const normalizePurchaseOrder = (order: any): PurchaseOrder => ({
  id: String(order?.id ?? ''),
  number: order?.number || order?.numeroBon || '',
  numeroBon: order?.numeroBon || order?.number || '',
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
  itemsDetail: Array.isArray(order?.itemsDetail)
    ? order.itemsDetail.map((ligne: any) => ({
        id: String(ligne?.id ?? ''),
        articleId: ligne?.articleId || null,
        referenceArticle: ligne?.referenceArticle || null,
        designation: ligne?.designation || '',
        categorie: ligne?.categorie || null,
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
        designation: ligne?.designation || '',
        categorie: ligne?.categorie || null,
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
    fournisseurId?: string;
    dateBesoin?: string;
    notes?: string;
    devise?: string;
    serviceId?: number;
    serviceName?: string;
    lignes?: Array<{
      articleId?: string;
      referenceArticle?: string;
      designation: string;
      categorie?: string;
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
      fournisseurId: data.supplierId,
      dateBesoin: data.dateBesoin,
      notes: data.notes,
      devise: data.devise,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
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
      designation: string;
      quantite: number;
      prixUnitaire: number;
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
    quantite: number;
    prixUnitaire: number;
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
