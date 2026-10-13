// Appels API pour les demandes d’achat.
import { apiClient } from '../../shared/client';
import type { PurchaseRequest, ProcurementStats, PurchaseRequestStatus, PurchaseRequestApprovalLog } from '../types';
import { normalizePurchaseRequest, normalizeListResponse, normalizeDetailResponse, normalizeStatsResponse } from '../shared';
import type { ListResponse, DetailResponse } from '../shared';

export const requestsMethods = {
  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: PurchaseRequestStatus;
    requesterId?: string;
    enterpriseId?: string | number;
    serviceId?: string | number;
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

  async getRequestsStats(params?: {
    enterpriseId?: string | number;
    serviceId?: string | number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/devis-achat/stats', { params });
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
};
