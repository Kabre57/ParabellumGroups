import { apiClient } from '../client';

/* =======================
   TYPES
======================= */

export interface Product {
  product_id: number;
  product_code: string;
  name: string;
  description?: string;
  unit_price: number;
  stock_quantity: number;
  category?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'ORDERED'
    | 'RECEIVED'
    | 'CANCELLED';
  total_amount: number;
  items_count: number;
  created_at: string;
}

export interface StockItem {
  product_id: number;
  product_code: string;
  name: string;
  category?: string;
  quantity: number;
  min_quantity?: number;
  location?: string;
  last_updated: string;
}

export interface StockMovement {
  id: string;
  product_code: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reference?: string;
  date: string;
  user?: string;
}

export interface StockAlert {
  alert_id: number;
  product_code: string;
  current_quantity: number;
  min_quantity: number;
  alert_type: string;
}

export interface ProcurementStats {
  ordersThisMonth: number;
  pendingOrders: number;
  budgetRemaining: number;
}

/* =======================
   SERVICE
======================= */

export const procurementService = {
  /* PRODUCTS */
  async getProducts(params?: Record<string, any>): Promise<Product[]> {
    const response = await apiClient.get('/procurement/products', { params });
    return response.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post('/procurement/products', data);
    return response.data;
  },

  /* ORDERS */
  async getOrders(params?: {
    status?: string;
    supplier?: string;
  }): Promise<PurchaseOrder[]> {
    const response = await apiClient.get('/procurement/orders', { params });
    return response.data;
  },

  async createOrder(
    data: Partial<PurchaseOrder>
  ): Promise<PurchaseOrder> {
    const response = await apiClient.post('/procurement/orders', data);
    return response.data;
  },

  /* STOCK */
  async getStockItems(params?: {
    category?: string;
  }): Promise<StockItem[]> {
    const response = await apiClient.get('/procurement/stock/items', {
      params,
    });
    return response.data;
  },

  async getStockMovements(params?: {
    productCode?: string;
    limit?: number;
  }): Promise<StockMovement[]> {
    const response = await apiClient.get('/procurement/stock/movements', {
      params,
    });
    return response.data;
  },

  async getStockAlerts(): Promise<StockAlert[]> {
    const response = await apiClient.get('/procurement/stock/alerts');
    return response.data;
  },

  /* STATS */
  async getStats(): Promise<ProcurementStats> {
    const response = await apiClient.get('/procurement/stats');
    return response.data;
  },
};
