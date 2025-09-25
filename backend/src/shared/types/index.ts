// Types partagés entre frontend et backend
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  serviceId?: number;
  isActive: boolean;
  lastLogin?: Date;
  avatarUrl?: string;
  service?: Service;
  permissions?: Permission[];
}

export interface Service {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  permissions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  GENERAL_DIRECTOR = 'GENERAL_DIRECTOR',
  SERVICE_MANAGER = 'SERVICE_MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  ACCOUNTANT = 'ACCOUNTANT'
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY'
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SUBMITTED_FOR_SERVICE_APPROVAL = 'SUBMITTED_FOR_SERVICE_APPROVAL',
  APPROVED_BY_SERVICE_MANAGER = 'APPROVED_BY_SERVICE_MANAGER',
  REJECTED_BY_SERVICE_MANAGER = 'REJECTED_BY_SERVICE_MANAGER',
  SUBMITTED_FOR_DG_APPROVAL = 'SUBMITTED_FOR_DG_APPROVAL',
  APPROVED_BY_DG = 'APPROVED_BY_DG',
  REJECTED_BY_DG = 'REJECTED_BY_DG',
  ACCEPTED_BY_CLIENT = 'ACCEPTED_BY_CLIENT',
  REJECTED_BY_CLIENT = 'REJECTED_BY_CLIENT',
  EXPIRED = 'EXPIRED'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REIMBURSED = 'REIMBURSED'
}

export enum ProductType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export enum PaymentMethod {
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CARD = 'CARD',
  CASH = 'CASH',
  OTHER = 'OTHER'
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  type: ProductType;
  category?: string;
  unit: string;
  priceHt: number;
  vatRate: number;
  costPrice?: number;
  stockQuantity: number;
  stockAlertThreshold: number;
  isActive: boolean;
  weight?: number;
  dimensions?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: number;
  expenseNumber: string;
  supplierId?: number;
  category: string;
  description?: string;
  amountHt: number;
  vatAmount: number;
  totalTtc: number;
  expenseDate: Date;
  paymentDate?: Date;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  receiptUrl?: string;
  notes?: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: number;
  paymentNumber: string;
  customerId: number;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy: number;
  createdAt: Date;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerAddressId?: number;
  quoteId?: number;
  status: InvoiceStatus;
  invoiceDate: Date;
  dueDate: Date;
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  paidAmount: number;
  balanceDue: number;
  paymentTerms: number;
  terms?: string;
  notes?: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}