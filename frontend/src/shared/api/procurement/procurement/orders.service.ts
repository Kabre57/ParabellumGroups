// Appels API pour les bons de commande.
import { apiClient } from '../../shared/client';
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderValidationLog } from '../types';
import { normalizePurchaseOrder, normalizeListResponse, normalizeDetailResponse } from '../shared';
import type { ListResponse, DetailResponse } from '../shared';

export const ordersMethods = {
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: PurchaseOrderStatus;
    supplierId?: string;
    enterpriseId?: string | number;
    serviceId?: string | number;
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
};
