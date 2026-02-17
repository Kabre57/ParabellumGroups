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
  PurchaseOrderValidationLog
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
    const response = await apiClient.get('/procurement/fournisseurs', { params });
    return response.data;
  },

  async getSupplier(id: string): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.get(`/procurement/fournisseurs/${id}`);
    return response.data;
  },

  async getSupplierStats(id: string): Promise<{ success: boolean; data: { ordersCount: number; totalAmount: number; rating: number } }> {
    const response = await apiClient.get(`/procurement/fournisseurs/${id}/stats`);
    return response.data;
  },

  async createSupplier(data: {
    nom: string;
    email: string;
    telephone?: string;
    adresse?: string;
    categorie?: string;
  }): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.post('/procurement/fournisseurs', data);
    return response.data;
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.put(`/procurement/fournisseurs/${id}`, data);
    return response.data;
  },

  async updateSupplierRating(id: string, rating: number): Promise<DetailResponse<Supplier>> {
    const response = await apiClient.patch(`/procurement/fournisseurs/${id}/rating`, { rating });
    return response.data;
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
    const response = await apiClient.get('/procurement/demandes-achat', { params });
    return response.data;
  },

  async getRequest(id: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.get(`/procurement/demandes-achat/${id}`);
    return response.data;
  },

  async getRequestsStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/demandes-achat/stats');
    return response.data;
  },

  async createRequest(data: {
    titre: string;
    description?: string;
    demandeurId?: string;
    montantEstime?: number;
  }): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.post('/procurement/demandes-achat', data);
    return response.data;
  },

  async updateRequest(id: string, data: Partial<PurchaseRequest>): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.put(`/procurement/demandes-achat/${id}`, data);
    return response.data;
  },

  async approveRequest(id: string, commentaire?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.patch(`/procurement/demandes-achat/${id}/approve`, { commentaire });
    return response.data;
  },

  async rejectRequest(id: string, raison?: string): Promise<DetailResponse<PurchaseRequest>> {
    const response = await apiClient.patch(`/procurement/demandes-achat/${id}/reject`, { raison });
    return response.data;
  },

  async deleteRequest(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/demandes-achat/${id}`);
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
    return response.data;
  },

  async getOrder(id: string): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/bons-commande/${id}`);
    return response.data;
  },

  async getOrdersBySupplier(supplierId: string): Promise<ListResponse<PurchaseOrder>> {
    const response = await apiClient.get(`/procurement/bons-commande/fournisseur/${supplierId}`);
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
    status?: PurchaseOrderStatus;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post('/procurement/bons-commande', data);
    return response.data;
  },

  async updateOrder(id: string, data: Partial<PurchaseOrder>): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.put(`/procurement/bons-commande/${id}`, data);
    return response.data;
  },

  async addOrderLine(id: string, ligne: {
    designation: string;
    quantite: number;
    prixUnitaire: number;
  }): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.post(`/procurement/bons-commande/${id}/lignes`, ligne);
    return response.data;
  },

  async updateOrderStatus(
    id: string,
    status: PurchaseOrderStatus,
    action?: 'validate' | 'revert'
  ): Promise<DetailResponse<PurchaseOrder>> {
    const response = await apiClient.patch(`/procurement/bons-commande/${id}/status`, { status, action });
    return response.data;
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
      params
    });
    return response.data;
  },

  async getOrderValidationLogs(id: string): Promise<ListResponse<PurchaseOrderValidationLog>> {
    const response = await apiClient.get(`/procurement/bons-commande/${id}/validations`);
    return response.data;
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/bons-commande/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ success: boolean; data: ProcurementStats }> {
    const response = await apiClient.get('/procurement/demandes-achat/stats');
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
