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
  SupplierStatus
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
    const response = await apiClient.get('/procurement/suppliers', { params });
    return response.data;
  },

  async getSupplier(id: string): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.get(`/procurement/suppliers/${id}`);
    return response.data;
  },

  async getSupplierStats(id: string): Promise<{ success: boolean; data: { ordersCount: number; totalAmount: number; rating: number } }> {
    const response = await apiClient.get(`/procurement/suppliers/${id}/stats`);
    return response.data;
  },

  async createSupplier(data: {
    nom: string;
    email: string;
    telephone?: string;
    adresse?: string;
    categorie?: string;
  }): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.post('/procurement/suppliers', data);
    return response.data;
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.put(`/procurement/suppliers/${id}`, data);
    return response.data;
  },

  async updateSupplierRating(id: string, rating: number): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.patch(`/procurement/suppliers/${id}/rating`, { rating });
    return response.data;
  },

  async deleteSupplier(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/suppliers/${id}`);
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
    const response = await apiClient.get('/procurement/requests', { params });
    return response.data;
  },

  async getRequest(id: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.get(`/procurement/requests/${id}`);
    return response.data;
  },

  async getRequestsStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/requests/stats');
    return response.data;
  },

  async createRequest(data: {
    titre: string;
    description?: string;
    demandeurId?: string;
    montantEstime?: number;
  }): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post('/procurement/requests', data);
    return response.data;
  },

  async updateRequest(id: string, data: Partial<PurchaseRequest>): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.put(`/procurement/requests/${id}`, data);
    return response.data;
  },

  async approveRequest(id: string, commentaire?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.patch(`/procurement/requests/${id}/approve`, { commentaire });
    return response.data;
  },

  async rejectRequest(id: string, raison?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.patch(`/procurement/requests/${id}/reject`, { raison });
    return response.data;
  },

  async deleteRequest(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/requests/${id}`);
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
    const response = await apiClient.get('/procurement/orders', { params });
    return response.data;
  },

  async getOrder(id: string): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/orders/${id}`);
    return response.data;
  },

  async getOrdersBySupplier(supplierId: string): Promise<ListResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/orders/fournisseur/${supplierId}`);
    return response.data;
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
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post('/procurement/orders', data);
    return response.data;
  },

  async updateOrder(id: string, data: Partial<PurchaseOrder>): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.put(`/procurement/orders/${id}`, data);
    return response.data;
  },

  async addOrderLine(id: string, ligne: {
    designation: string;
    quantite: number;
    prixUnitaire: number;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post(`/procurement/orders/${id}/lignes`, ligne);
    return response.data;
  },

  async updateOrderStatus(id: string, status: PurchaseOrderStatus): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.patch(`/procurement/orders/${id}/status`, { status });
    return response.data;
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/orders/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/requests/stats');
    return response.data;
  },

  async getStock(params?: {
    page?: number;
    limit?: number;
    category?: string;
    belowThreshold?: boolean;
    search?: string;
  }): Promise<ListResponse<StockItem>> {
    const response = await apiClient.get('/procurement/stock', { params });
    return response.data;
  },

  async getStockMovements(params?: {
    itemId?: string;
    type?: 'IN' | 'OUT';
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<StockMovement>> {
    const response = await apiClient.get('/procurement/stock/movements', { params });
    return response.data;
  },
};

export * from './types';
