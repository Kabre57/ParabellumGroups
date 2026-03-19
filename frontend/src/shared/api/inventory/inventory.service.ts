import { apiClient } from '../shared/client';
import { InventoryArticle, StockMovement, StockMovementType } from './types';

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

export const inventoryService = {
  async getArticles(params?: {
    status?: string;
    categorie?: string;
    search?: string;
  }): Promise<ListResponse<InventoryArticle>> {
    const response = await apiClient.get('/inventory/articles', {
      params: { ...params, _ts: Date.now() },
    });
    return normalizeListResponse<InventoryArticle>(response.data);
  },

  async createArticle(data: Partial<InventoryArticle>): Promise<DetailResponse<InventoryArticle>> {
    const response = await apiClient.post('/inventory/articles', data);
    return normalizeDetailResponse<InventoryArticle>(response.data);
  },

  async updateArticle(id: string, data: Partial<InventoryArticle>): Promise<DetailResponse<InventoryArticle>> {
    const response = await apiClient.put(`/inventory/articles/${id}`, data);
    return normalizeDetailResponse<InventoryArticle>(response.data);
  },

  async deleteArticle(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/inventory/articles/${id}`);
    return response.data;
  },

  async getMovements(params?: {
    type?: StockMovementType;
    dateDebut?: string;
    dateFin?: string;
    articleId?: string;
  }): Promise<ListResponse<StockMovement>> {
    const response = await apiClient.get('/inventory/mouvements', { params });
    return normalizeListResponse<StockMovement>(response.data);
  },

  async createMovement(data: {
    articleId: string;
    type: StockMovementType;
    quantite: number;
    dateOperation?: string;
    numeroDocument?: string;
    emplacement?: string;
    notes?: string;
  }): Promise<DetailResponse<StockMovement>> {
    const response = await apiClient.post('/inventory/mouvements', data);
    return normalizeDetailResponse<StockMovement>(response.data);
  },
};
