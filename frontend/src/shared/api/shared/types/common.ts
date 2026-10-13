/**
 * Types et interfaces TypeScript pour les API
 */

// ==================== TYPES GÉNÉRIQUES ====================

/**
 * Réponse API standard
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  status: number;
  data: T;
  errors?: Record<string, string[]>;
}

/**
 * Réponse paginée
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Paramètres de pagination
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paramètres de recherche
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

// ==================== ÉNUMÉRATIONS ====================

/**
 * Rôles utilisateur
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  GERANT = 'GERANT',
  MANAGER = 'MANAGER',
  CONSULTANT = 'CONSULTANT',
  ACCOUNTANT = 'ACCOUNTANT',
  CLIENT = 'CLIENT',
}

/**
 * Statuts des missions
 */
export enum MissionStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

/**
 * Statuts des factures
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

/**
 * Statuts des projets
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Types de contrat
 */
export enum ContractType {
  FREELANCE = 'FREELANCE',
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
}

/**
 * Types de facturation
 */
export enum BillingType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  FIXED_PRICE = 'FIXED_PRICE',
  MONTHLY = 'MONTHLY',
}
