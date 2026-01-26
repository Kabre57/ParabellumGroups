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

// ==================== ENTITÉS MÉTIER ====================

/**
 * Utilisateur
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
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
  siret?: string;
  vatNumber?: string;
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
  postalCode: string;
  country: string;
  additionalInfo?: string;
}

/**
 * Projet
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  customerId: string;
  customer?: Customer;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: number;
  currency: string;
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

// ==================== TYPES DE REQUÊTE ====================

/**
 * Données de connexion
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Réponse de connexion
 */
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Données d'inscription
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

/**
 * Données de mise à jour de profil
 */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
}

/**
 * Demande de refresh token
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Réponse de refresh token
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ==================== COMMERCIAL & PROSPECTION ====================

/**
 * Étapes du workflow de prospection
 */
export type ProspectStage = 
  | 'preparation'
  | 'research'
  | 'contact'
  | 'discovery'
  | 'proposal'
  | 'won'
  | 'lost';

/**
 * Priorités des prospects
 */
export type ProspectPriority = 'A' | 'B' | 'C';

/**
 * Types d'activité de prospection
 */
export type ProspectActivityType = 
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'task'
  | 'conversion';

/**
 * Prospect
 */
export interface Prospect {
  id: string;
  companyName: string;
  contactName: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  sector?: string;
  employees?: number;
  revenue?: number;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  stage: ProspectStage;
  priority: ProspectPriority;
  score: number;
  source?: string;
  assignedToId?: string;
  potentialValue?: number;
  closingProbability?: number;
  estimatedCloseDate?: string;
  notes?: string;
  tags: string[];
  isConverted: boolean;
  convertedAt?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  activities?: ProspectActivity[];
}

/**
 * Activité de prospection
 */
export interface ProspectActivity {
  id: string;
  prospectId: string;
  type: ProspectActivityType;
  subject: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  prospect?: Prospect;
  creator?: User;
}

/**
 * Statistiques de prospection
 */
export interface ProspectionStats {
  totalProspects: number;
  convertedProspects: number;
  conversionRate: number;
  recentActivities: number;
  byStage: Record<ProspectStage, number>;
  byPriority: Record<ProspectPriority, number>;
}

/**
 * Données de création de prospect
 */
export interface CreateProspectRequest {
  companyName: string;
  contactName: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  sector?: string;
  employees?: number;
  revenue?: number;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  stage?: ProspectStage;
  priority?: ProspectPriority;
  source?: string;
  assignedToId?: string;
  potentialValue?: number;
  closingProbability?: number;
  estimatedCloseDate?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Données de mise à jour de prospect
 */
export interface UpdateProspectRequest extends Partial<CreateProspectRequest> {}

/**
 * Données de déplacement d'un prospect
 */
export interface MoveProspectRequest {
  stage: ProspectStage;
  notes?: string;
}

/**
 * Données de conversion d'un prospect
 */
export interface ConvertProspectRequest {
  customerId: string;
}

/**
 * Données de création d'activité
 */
export interface CreateProspectActivityRequest {
  type: ProspectActivityType;
  subject: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
}
