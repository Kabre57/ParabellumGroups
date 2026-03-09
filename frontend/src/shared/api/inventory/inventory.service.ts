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

export const inventoryService = {
  async getArticles(params?: {
    status?: string;
    categorie?: string;
    search?: string;
  }): Promise<ListResponse<InventoryArticle>> {
    // Ajout d'un cache-buster pour éviter les 304 sans corps qui laissent le modal vide
    const response = await apiClient.get('/inventory/articles', { params: { ...params, _ts: Date.now() } });
    return response.data;
  },

  async createArticle(data: Partial<InventoryArticle>): Promise<DetailResponse<InventoryArticle>> {
    const response = await apiClient.post('/inventory/articles', data);
    return response.data;
  },

  async updateArticle(id: string, data: Partial<InventoryArticle>): Promise<DetailResponse<InventoryArticle>> {
    const response = await apiClient.put(`/inventory/articles/${id}`, data);
    return response.data;
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
    return response.data;
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
    return response.data;
  },
};
