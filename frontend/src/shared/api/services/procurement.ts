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

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  lastRestocked: string;
  location: string;
}

export interface StockMovement {
  id: string;
  date: string;
  item: string;
  type: 'IN' | 'OUT';
  quantity: number;
  user: string;
  reference: string;
}

export interface StockAlert {
  alert_id: number;
  product_code: string;
  current_quantity: number;
  min_quantity: number;
  alert_type: string;
}

export type SupplierStatus = 'ACTIF' | 'INACTIF' | 'BLOQUE';

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  rating?: number;
  status: SupplierStatus;
  ordersCount?: number;
  totalAmount?: number;
}

export type PurchaseOrderStatus = 'BROUILLON' | 'ENVOYE' | 'CONFIRME' | 'LIVRE' | 'ANNULE';

export interface PurchaseOrderItem {
  id: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId?: string;
  supplier?: string;
  supplierEmail?: string;
  status: PurchaseOrderStatus;
  amount: number;
  items: number;
  date: string;
  deliveryDate?: string;
  itemsDetail?: PurchaseOrderItem[];
  requestId?: string;
  requestNumber?: string;
}

export type PurchaseRequestStatus =
  | 'BROUILLON'
  | 'SOUMISE'
  | 'APPROUVEE'
  | 'REJETEE'
  | 'COMMANDEE';

export interface PurchaseRequest {
  id: string;
  number: string;
  title: string;
  description?: string;
  requesterId: string;
  status: PurchaseRequestStatus;
  estimatedAmount?: number;
  date: string;
}

export interface ProcurementStats {
  ordersThisMonth: number;
  pendingOrders: number;
  budgetRemaining: number;
  raw?: any;
}

/* =======================
   HELPERS
======================= */

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mapSupplier = (supplier: any): Supplier => {
  return {
    id: supplier.id,
    name: supplier.nom,
    email: supplier.email || undefined,
    phone: supplier.telephone || undefined,
    address: supplier.adresse || undefined,
    category: supplier.categorieActivite || undefined,
    rating: supplier.rating ?? undefined,
    status: supplier.status || 'ACTIF',
    ordersCount: Array.isArray(supplier.bonsCommande) ? supplier.bonsCommande.length : undefined,
    totalAmount: Array.isArray(supplier.bonsCommande)
      ? supplier.bonsCommande.reduce((sum: number, item: any) => sum + toNumber(item.montantTotal), 0)
      : undefined,
  };
};

const mapOrder = (order: any): PurchaseOrder => {
  const itemsDetail = Array.isArray(order.lignes)
    ? order.lignes.map((line: any) => ({
        id: line.id,
        designation: line.designation,
        quantity: line.quantite ?? 0,
        unitPrice: toNumber(line.prixUnitaire),
        amount: toNumber(line.montant),
      }))
    : [];

  return {
    id: order.id,
    number: order.numeroBon,
    supplierId: order.fournisseur?.id || order.fournisseurId || undefined,
    supplier: order.fournisseur?.nom || undefined,
    supplierEmail: order.fournisseur?.email || undefined,
    status: order.status || 'BROUILLON',
    amount: toNumber(order.montantTotal),
    items: itemsDetail.length,
    date: order.dateCommande || order.createdAt || new Date().toISOString(),
    deliveryDate: order.dateLivraison || undefined,
    itemsDetail,
    requestId: order.demandeAchat?.id || order.demandeAchatId || undefined,
    requestNumber: order.demandeAchat?.numeroDemande || undefined,
  };
};

const mapRequest = (request: any): PurchaseRequest => {
  return {
    id: request.id,
    number: request.numeroDemande,
    title: request.titre,
    description: request.description || undefined,
    requesterId: request.demandeurId,
    status: request.status || 'BROUILLON',
    estimatedAmount: request.montantEstime ? toNumber(request.montantEstime) : undefined,
    date: request.dateDemande || request.createdAt || new Date().toISOString(),
  };
};

const buildPaginationParams = (params?: Record<string, any>) => {
  if (!params) return undefined;
  const mapped: Record<string, any> = { ...params };
  if (mapped.pageSize && !mapped.limit) {
    mapped.limit = mapped.pageSize;
    delete mapped.pageSize;
  }
  if (mapped.query && !mapped.search) {
    mapped.search = mapped.query;
    delete mapped.query;
  }
  return mapped;
};

/* =======================
   SERVICE
======================= */

export const procurementService = {
  /* SUPPLIERS */
  async getSuppliers(params?: Record<string, any>): Promise<Supplier[]> {
    const response = await apiClient.get('/procurement/suppliers', { params: buildPaginationParams(params) });
    const suppliers = response.data?.data || response.data || [];
    return suppliers.map(mapSupplier);
  },

  async getSupplier(id: string): Promise<Supplier> {
    const response = await apiClient.get(`/procurement/suppliers/${id}`);
    return mapSupplier(response.data);
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const payload = {
      nom: data.name,
      email: data.email,
      telephone: data.phone,
      adresse: data.address,
      categorieActivite: data.category,
      status: data.status,
      rating: data.rating,
    };
    const response = await apiClient.post('/procurement/suppliers', payload);
    return mapSupplier(response.data);
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const payload = {
      nom: data.name,
      email: data.email,
      telephone: data.phone,
      adresse: data.address,
      categorieActivite: data.category,
      status: data.status,
      rating: data.rating,
    };
    const response = await apiClient.put(`/procurement/suppliers/${id}`, payload);
    return mapSupplier(response.data);
  },

  async updateSupplierRating(id: string, rating: number): Promise<Supplier> {
    const response = await apiClient.patch(`/procurement/suppliers/${id}/rating`, { rating });
    return mapSupplier(response.data);
  },

  /* REQUESTS */
  async getRequests(params?: Record<string, any>): Promise<PurchaseRequest[]> {
    const response = await apiClient.get('/procurement/requests', { params: buildPaginationParams(params) });
    const requests = response.data?.data || response.data || [];
    return requests.map(mapRequest);
  },

  async createRequest(data: Partial<PurchaseRequest>): Promise<PurchaseRequest> {
    const payload = {
      titre: data.title,
      description: data.description,
      demandeurId: data.requesterId,
      dateDemande: data.date,
      montantEstime: data.estimatedAmount,
      status: data.status,
    };
    const response = await apiClient.post('/procurement/requests', payload);
    return mapRequest(response.data);
  },

  async updateRequest(id: string, data: Partial<PurchaseRequest>): Promise<PurchaseRequest> {
    const payload = {
      titre: data.title,
      description: data.description,
      montantEstime: data.estimatedAmount,
    };
    const response = await apiClient.put(`/procurement/requests/${id}`, payload);
    return mapRequest(response.data);
  },

  /* ORDERS */
  async getOrders(params?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    supplier?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PurchaseOrder[]> {
    const mappedParams = buildPaginationParams(params) || {};
    if (params?.supplier && !mappedParams.search) {
      mappedParams.search = params.supplier;
    }
    const response = await apiClient.get('/procurement/orders', { params: mappedParams });
    const orders = response.data?.data || response.data || [];
    return orders.map(mapOrder);
  },

  async getRecentOrders(params?: { limit?: number }): Promise<PurchaseOrder[]> {
    return this.getOrders({ page: 1, limit: params?.limit ?? 10 });
  },

  async createOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const payload = {
      demandeAchatId: data.requestId,
      fournisseurId: data.supplierId,
      dateCommande: data.date,
      dateLivraison: data.deliveryDate,
      montantTotal: data.amount,
      status: data.status,
    };
    const response = await apiClient.post('/procurement/orders', payload);
    return mapOrder(response.data);
  },

  async updateOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const payload = {
      fournisseurId: data.supplierId,
      dateLivraison: data.deliveryDate,
      montantTotal: data.amount,
    };
    const response = await apiClient.put(`/procurement/orders/${id}`, payload);
    return mapOrder(response.data);
  },

  async updateOrderStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    const response = await apiClient.patch(`/procurement/orders/${id}/status`, { status });
    return mapOrder(response.data);
  },

  /* PRODUCTS & STOCK (not yet connected in backend) */
  async getProducts(): Promise<Product[]> {
    return [];
  },

  async createProduct(): Promise<Product> {
    throw new Error('Not implemented');
  },

  async getStockItems(): Promise<StockItem[]> {
    return [];
  },

  async getStockMovements(): Promise<StockMovement[]> {
    return [];
  },

  async getStockAlerts(): Promise<StockAlert[]> {
    return [];
  },

  /* STATS */
  async getStats(): Promise<ProcurementStats> {
    try {
      const response = await apiClient.get('/procurement/requests/stats');
      const stats = response.data || {};
      const pending = stats.demandesParStatus?.SOUMISE ?? 0;
      return {
        ordersThisMonth: stats.totalDemandes ?? 0,
        pendingOrders: pending,
        budgetRemaining: stats.montantEstimeTotal ?? 0,
        raw: stats,
      };
    } catch (error) {
      return {
        ordersThisMonth: 0,
        pendingOrders: 0,
        budgetRemaining: 0,
      };
    }
  },
};
