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

export interface PurchaseOrderValidationLog {
  id: string;
  action: string;
  fromStatus: PurchaseOrderStatus;
  toStatus: PurchaseOrderStatus;
  createdAt: string;
  createdById?: string | null;
  bonCommandeId?: string | null;
  numeroBon?: string | null;
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
