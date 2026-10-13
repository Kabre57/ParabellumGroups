// Appels API pour les statistiques et le stock.
import { apiClient } from '../../shared/client';
import type { ProcurementStats, StockItem, StockMovement } from '../types';
import { normalizeListResponse, normalizeStatsResponse } from '../shared';
import type { ListResponse } from '../shared';

export const inventoryMethods = {
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
