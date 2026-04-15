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
  nom?: string;
  email?: string;
  phone?: string;
  telephone?: string;
  address?: string;
  adresse?: string;
  category?: string;
  categorie?: string;
  categorieActivite?: string;
  rating?: number;
  status: SupplierStatus;
  ordersCount?: number;
  totalAmount?: number;
  bonsCommande?: Array<{
    id: string;
    numeroBon?: string;
    montantTotal?: number | string;
    status?: PurchaseOrderStatus;
  }>;
}

export type PurchaseOrderStatus = 'BROUILLON' | 'ENVOYE' | 'CONFIRME' | 'LIVRE' | 'ANNULE';
export type PurchaseProformaStatus = 'BROUILLON' | 'SOUMISE' | 'APPROUVEE' | 'REJETEE';

export interface PurchaseOrderItem {
  id: string;
  articleId?: string | null;
  referenceArticle?: string | null;
  imageUrl?: string | null;
  designation: string;
  categorie?: string | null;
  unite?: string | null;
  quantity: number;
  quantite?: number;
  unitPrice: number;
  prixUnitaire?: number;
  amount: number;
  amountHT?: number;
  montantTTC?: number;
  tva?: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  numeroBon?: string;
  supplierId?: string;
  supplier?: string;
  fournisseurNom?: string;
  supplierEmail?: string;
  status: PurchaseOrderStatus;
  amount: number;
  montantHT?: number;
  montantTVA?: number;
  montantTotal?: number;
  items: number;
  date: string;
  deliveryDate?: string;
  itemsDetail?: PurchaseOrderItem[];
  serviceId?: number | null;
  serviceName?: string | null;
  sourceDevisAchatId?: string | null;
  requestId?: string;
  requestNumber?: string;
  proformaId?: string | null;
  proformaNumber?: string | null;
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
  | 'PROFORMAS_EN_COURS'
  | 'PROFORMA_SOUMISE'
  | 'PROFORMA_APPROUVEE'
  | 'COMMANDEE';

export interface PurchaseRequestLine {
  id?: string;
  articleId?: string | null;
  referenceArticle?: string | null;
  imageUrl?: string | null;
  designation: string;
  categorie?: string | null;
  unite?: string | null;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  montantHT: number;
  montantTTC: number;
}

export interface PurchaseRequestApprovalLog {
  id: string;
  action: string;
  fromStatus: PurchaseRequestStatus;
  toStatus: PurchaseRequestStatus;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorServiceId?: number | null;
  actorServiceName?: string | null;
  commentaire?: string | null;
  createdAt: string;
}

export interface PurchaseProformaLine {
  id?: string;
  articleId?: string | null;
  referenceArticle?: string | null;
  imageUrl?: string | null;
  designation: string;
  categorie?: string | null;
  unite?: string | null;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  montantHT: number;
  montantTTC: number;
}

export interface PurchaseProformaApprovalLog {
  id: string;
  action: string;
  fromStatus: PurchaseProformaStatus;
  toStatus: PurchaseProformaStatus;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorServiceId?: number | null;
  actorServiceName?: string | null;
  commentaire?: string | null;
  createdAt: string;
}

export interface PurchaseProformaCommitteeCheck {
  criterionIndex: number;
  label: string;
  requiredDocument?: string | null;
  passed: boolean | null;
  notes?: string | null;
}

export interface PurchaseProformaCommitteeScore {
  criterionIndex: number;
  label: string;
  maxPoints: number;
  points: number;
  notes?: string | null;
}

export interface PurchaseProformaCommitteeEvaluation {
  profileCode?: string | null;
  eliminatoryChecks: PurchaseProformaCommitteeCheck[];
  eliminatoryPassed: boolean;
  technicalScores: PurchaseProformaCommitteeScore[];
  technicalTotal: number;
  financialCriterion?: PurchaseProformaCommitteeScore | null;
  financialScore: number;
  totalScore: number;
  decision?: string | null;
  decisionNote?: string | null;
  lastUpdatedAt?: string | null;
  lastUpdatedByUserId?: string | null;
  lastUpdatedByEmail?: string | null;
  lastUpdatedByServiceId?: number | null;
  lastUpdatedByServiceName?: string | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  signedByEmail?: string | null;
  signedByServiceId?: number | null;
  signedByServiceName?: string | null;
}

export interface PurchaseProforma {
  id: string;
  numeroProforma: string;
  title?: string | null;
  titre?: string | null;
  demandeAchatId: string;
  fournisseurId: string;
  fournisseurNom?: string | null;
  devise?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  delaiLivraisonJours?: number | null;
  disponibilite?: string | null;
  observationsAchat?: string | null;
  committeeProfileCode?: string | null;
  committeeEvaluation?: PurchaseProformaCommitteeEvaluation | null;
  committeeDecision?: string | null;
  committeeDecisionNote?: string | null;
  committeeEvaluatedAt?: string | null;
  committeeEvaluatedByUserId?: string | null;
  committeeEvaluatedByEmail?: string | null;
  committeeEvaluatedByServiceId?: number | null;
  committeeEvaluatedByServiceName?: string | null;
  committeeSignedAt?: string | null;
  committeeSignedByUserId?: string | null;
  committeeSignedByEmail?: string | null;
  committeeSignedByServiceId?: number | null;
  committeeSignedByServiceName?: string | null;
  status: PurchaseProformaStatus;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  approvedByServiceId?: number | null;
  approvedByServiceName?: string | null;
  rejectionReason?: string | null;
  selectedForOrder?: boolean;
  recommendedForApproval?: boolean;
  bonCommandeId?: string | null;
  numeroBon?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lignes?: PurchaseProformaLine[];
  approvalHistory?: PurchaseProformaApprovalLog[];
}

export interface PurchaseRequest {
  id: string;
  number: string;
  numeroDemande?: string;
  numeroDevisAchat?: string;
  title: string;
  objet?: string;
  description?: string;
  requesterId: string;
  requesterEmail?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  manualSupplierName?: string | null;
  devise?: string;
  status: PurchaseRequestStatus;
  estimatedAmount?: number;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
  approvalStatus?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  approvedByServiceId?: number | null;
  approvedByServiceName?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  date: string;
  dateBesoin?: string | null;
  bonCommandeId?: string | null;
  numeroBon?: string | null;
  selectedProformaId?: string | null;
  selectedProformaNumber?: string | null;
  lines?: PurchaseRequestLine[];
  approvalHistory?: PurchaseRequestApprovalLog[];
  proformas?: PurchaseProforma[];
}

export interface ProcurementStats {
  totalQuotes?: number;
  pendingApproval?: number;
  approvedThisMonth?: number;
  rejectedThisMonth?: number;
  convertedToOrders?: number;
  totalAmountPending?: number;
  ordersThisMonth: number;
  pendingOrders: number;
  budgetRemaining: number;
  raw?: any;
}
