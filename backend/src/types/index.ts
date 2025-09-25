import { Request } from 'express';
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
  CHIEF_EXECUTIVE_OFFICER = 'CHIEF_EXECUTIVE_OFFICER', 
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

// Types spécifiques au backend
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  serviceId?: number;
  permissions: string[];
  firstName?: string;
  lastName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
    user?: JWTPayload;
    serviceId?: number;
    permissions: string[];
  };
}

export interface PermissionCheck {
  resource: string;
  action: string;
  serviceId?: number;
}

export interface AuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Types pour les modules de service
export interface Specialite {
  id: number;
  libelle: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Technicien {
  id: number;
  nom: string;
  prenom: string;
  contact: string;
  specialiteId: number;
  utilisateurId?: number;
  isActive: boolean;
  specialite?: Specialite;
  utilisateur?: User;
}

export interface Mission {
  numIntervention: string;
  natureIntervention: string;
  objectifDuContrat: string;
  description?: string;
  priorite?: string;
  statut?: string;
  dateSortieFicheIntervention: Date;
  clientId: number;
  client?: any;
  interventions?: Intervention[];
}

export interface Intervention {
  id: number;
  dateHeureDebut: Date;
  dateHeureFin?: Date;
  duree?: number;
  missionId: string;
  statut: string;
  commentaire?: string;
  mission?: Mission;
  techniciens?: TechnicienIntervention[];
}

export interface TechnicienIntervention {
  id: number;
  technicienId: number;
  interventionId: number;
  role: string;
  commentaire?: string;
  technicien?: Technicien;
}

export interface RapportMission {
  id: number;
  titre: string;
  contenu: string;
  interventionId?: number;
  technicienId: number;
  missionId: string;
  statut: string;
  dateValidation?: Date;
  commentaire?: string;
  images?: RapportImage[];
}

export interface RapportImage {
  id: number;
  rapportId: number;
  url: string;
  description?: string;
  ordre: number;
}

export interface Materiel {
  id: number;
  reference: string;
  designation: string;
  description?: string;
  quantiteTotale: number;
  quantiteDisponible: number;
  seuilAlerte: number;
  emplacement?: string;
  categorie: string;
  prixUnitaire?: number;
  fournisseur?: string;
  dateAchat?: Date;
  garantie?: string;
  statut: string;
}

export interface SortieMateriel {
  id: number;
  materielId: number;
  interventionId: number;
  technicienId: number;
  quantite: number;
  dateSortie: Date;
  motif?: string;
  retourne: boolean;
  dateRetour?: Date;
  quantiteRetour?: number;
  commentaire?: string;
}

export interface EntreeMateriel {
  id: number;
  materielId: number;
  quantite: number;
  dateEntree: Date;
  source: string;
  prixTotal?: number;
  fournisseur?: string;
  facture?: string;
  commentaire?: string;
}

// Types pour les messages
export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  subject: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'internal' | 'external' | 'system';
  status: 'unread' | 'read' | 'replied' | 'archived';
  readAt?: Date;
  archivedAt?: Date;
  parentMessageId?: number;
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  recipient?: User;
  attachments?: MessageAttachment[];
  replies?: Message[];
}

export interface MessageAttachment {
  id: number;
  messageId: number;
  filename: string;
  url: string;
  size?: number;
  mimeType?: string;
  createdAt: Date;
}

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  user: string;
  amount: number;
}

import { SourceDocumentType } from '@prisma/client';

export interface AccountingEntryInput {
  entryDate: Date;
  accountNumber: string;
  debit: number;
  credit: number;
  description: string;
  sourceDocumentType: SourceDocumentType;
  sourceDocumentId: number;
  createdBy: number;
}



