import type { BillingType, ContractType, InvoiceStatus, MissionStatus, ProjectStatus, UserRole } from './common';

// ==================== ENTITÉS MÉTIER ====================

/**
 * Utilisateur
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | { id?: number; name?: string; code?: string; description?: string };
  serviceId?: string | number | null;
  service?: {
    id?: string | number;
    name?: string;
    description?: string | null;
  } | null;
  enterpriseId?: string | number | null;
  enterprise?: {
    id?: string | number;
    name?: string;
    logoUrl?: string | null;
  } | null;
  department?: string | null;
  position?: string | null;
  phoneNumber?: string;
  avatar?: string;
  preferences?: string | Record<string, any> | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  permissionsList?: string[];
  permissions?: string[] | Record<string, any> | null;
}

/**
 * Client
 */
export interface Customer {
  id: string;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phoneNumber?: string;
  address?: Address;
  idu?: string;
  ncc?: string;
  rccm?: string;
  codeActivite?: string;
  billingAddress?: Address;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Adresse
 */
export interface Address {
  street: string;
  city: string;
  postalCode?: string;
  country: string;
  additionalInfo?: string;
  district?: string;
  landmark?: string;
}

/**
 * Projet
 */
export interface Project {
  id: string;
  projectNumber?: string;
  name: string;
  description?: string;
  customerId: string;
  customer?: Customer;
  clientName?: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  completion?: number;
  currency: string;
  priority?: string;
  managerId: string;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mission
 */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  project?: Project;
  consultantId: string;
  consultant?: User;
  status: MissionStatus;
  contractType: ContractType;
  billingType: BillingType;
  rate: number;
  currency: string;
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}


/**
 * Facture
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  projectId?: string;
  project?: Project;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ligne de facture
 */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  missionId?: string;
  mission?: Mission;
}

/**
 * Feuille de temps
 */
export interface Timesheet {
  id: string;
  consultantId: string;
  consultant?: User;
  missionId: string;
  mission?: Mission;
  date: string;
  hours: number;
  description?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dépense
 */
export interface Expense {
  id: string;
  consultantId: string;
  consultant?: User;
  missionId?: string;
  mission?: Mission;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receipt?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
