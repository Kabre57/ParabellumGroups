// Appels API pour les fournisseurs.
import { apiClient } from '../../shared/client';
import type { Supplier, SupplierStatus } from '../types';
import { normalizeNumber, normalizeSupplier, normalizeListResponse, normalizeDetailResponse, normalizeStatsResponse } from '../shared';
import type { ListResponse, DetailResponse } from '../shared';

export const suppliersMethods = {
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

  async importSuppliers(items: Record<string, string>[]): Promise<DetailResponse<any>> {
    const response = await apiClient.post('/procurement/fournisseurs/import', {
      items,
      options: { updateExisting: true },
    });
    return normalizeDetailResponse<any>(response.data);
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
};
