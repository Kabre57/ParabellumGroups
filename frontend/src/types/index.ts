export * from '../../shared/types';

// Types spécifiques au frontend
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
  children?: NavigationItem[];
  isCategory?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'datetime-local';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortOption {
  key: string;
  direction: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string>;
}

// ✅ USER TYPE FUSIONNÉ (User + Employee)
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'GENERAL_DIRECTOR' | 'SERVICE_MANAGER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'PURCHASING_MANAGER';
  serviceId?: number | null;
  isActive: boolean;
  lastLogin?: string;
  avatarUrl?: string;
  permissions: string[];
  
  // Champs fusionnés depuis Employee
  employeeNumber?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nationality?: string;
  cnpsNumber?: string;
  cnamNumber?: string;
  bankAccount?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  
  // Relations
  service?: Service;
  contracts?: Contract[];
  salaries?: Salary[];
  leaveRequests?: LeaveRequest[];
  loans?: Loan[];
  expenses?: Expense[];
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: number;
  userId: number; // ✅ Changé de employeeId à userId
  contractType: 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
  startDate: string;
  endDate?: string;
  baseSalary: number;
  workingHours: number;
  benefits?: string;
  terms?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Salary {
  id: number;
  userId: number; // ✅ Changé de employeeId à userId
  paymentDate: string;
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  status: 'PENDING' | 'PAID';
  createdAt: string;
  user?: User;
}

export interface LeaveRequest {
  id: number;
  userId: number; // ✅ Changé de employeeId à userId
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER';
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  approvedBy?: User;
}

export interface Loan {
  id: number;
  userId: number; // ✅ Changé de employeeId à userId
  amount: number;
  interestRate: number;
  monthlyPayment: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Expense {
  id: number;
  userId: number; // ✅ Changé de employeeId à userId
  date: string;
  category: string;
  description?: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'REIMBURSED';
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  creator?: User;
}

// Types pour les réponses API standardisées

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string>;
}

// Types pour les notifications
export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  read: boolean;
  createdAt: string;
}

// Types pour les messages
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
}

// Types pour les tâches
export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}
// Types pour les projets
export interface Project {
  id: number;
  name: string;
  description?: string;
  customerId: number;
  serviceId: number;
  startDate: string;
  endDate?: string;
  budget?: number;
  priority?: 'low' | 'medium' | 'high';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Types pour les commandes d'achat
export interface PurchaseOrder {
  id: number;
  supplierId: number;
  orderDate: string;
  items: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
  }[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  status: 'pending' | 'approved' | 'received';
  createdAt: string;
  updatedAt: string;
}

// Types pour les fournisseurs
export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les stocks
export interface StockItem {
  id: number;
  productId: number;
  quantity: number;
  location?: string;
  minQuantity?: number;
  maxQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les audits
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  changes?: Record<string, { old: any; new: any }>;
  timestamp: string;
}

// Types pour les configurations
export interface Configuration {
  id: number;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les rôles et permissions
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}



// Types pour les services
export interface Service {
  id: number;
  name: string;
  description?: string;
  priceHt: number;
  vatRate: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les prospects
export interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  createdAt: string;
  updatedAt: string;
}

// Types pour les interventions
export interface Intervention {
  id: number;
  technicianId: number;
  customerId: number;
  serviceId: number;
  scheduledAt: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les spécialités
export interface Speciality {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les techniciens
export interface Technician {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialities: Speciality[];
  createdAt: string;
  updatedAt: string;
}
// Types pour les missions
export interface Mission {
  id: number;
  technicianId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Types pour les matériels
export interface Materiel {
  id: number;
  name: string;
  type?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  status: 'active' | 'in_repair' | 'retired';
  createdAt: string;
  updatedAt: string;
}

// Types pour les rapports
export interface Rapport {
  id: number;
  technicianId: number;
  interventionId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les notifications
export interface Notification {
  id: number;
  userId: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

// Types pour les messages
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

// Types pour les tâches
export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

// Types pour les projets
export interface Project {
  id: number;
  name: string;
  description?: string;
  customerId: number;
  serviceId: number;
  startDate: string;
  endDate?: string;
  budget?: number;
  priority?: 'low' | 'medium' | 'high';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Types pour les commandes d'achat
export interface PurchaseOrder {
  id: number;
  supplierId: number;
  orderDate: string;
  items: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
  }[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  status: 'pending' | 'approved' | 'received';
  createdAt: string;
  updatedAt: string;
}

// Types pour les fournisseurs
export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les stocks
export interface StockItem {
  id: number;
  productId: number;
  quantity: number;
  location?: string;
  minQuantity?: number;
  maxQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les audits
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  changes?: Record<string, { old: any; new: any }>;
  timestamp: string;
}

// Types pour les configurations
export interface Configuration {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}
// Types pour les rôles et permissions
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: Role[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// Types pour les employés
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate: string;
  salary?: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les contrats
export interface Contract {
  id: number;
  employeeId: number;
  startDate: string;
  endDate?: string;
  type: 'full_time' | 'part_time' | 'contractor' | 'intern';
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les congés
export interface Leave {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Types pour les prêts
export interface Loan {
  id: number;
  employeeId: number;
  amount: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
  monthlyPayment?: number;
  status: 'active' | 'paid_off' | 'defaulted';
  createdAt: string;
  updatedAt: string;
}

// Types pour les dépenses
export interface Expense {
  id: number;
  employeeId: number;
  amount: number;
  date: string;
  category?: string;
  description?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les services
export interface Service {
  id: number;
  name: string;
  description?: string;
  priceHt: number;
  vatRate: number;
  createdAt: string;
  updatedAt: string;
}

// Types pour les prospects
export interface Prospect {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  createdAt: string;
  updatedAt: string;
}

// Types pour les interventions
export interface Intervention {
  id: number;
