// Types des achats et des mouvements de trésorerie.
export interface PurchaseCommitment {
  id: string;
  sourceType: 'PURCHASE_QUOTE' | 'PURCHASE_ORDER';
  sourceId: string;
  sourceNumber: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  sourceStatus?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  status?: 'ENGAGE' | 'LIQUIDE' | 'ORDONNANCE' | 'PAYE' | null;
  createdAt?: string | null;
}

export interface FactureFournisseur {
  id: string;
  numeroFacture: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  fournisseurId?: string | null;
  fournisseurNom?: string | null;
  dateFacture: string;
  dateEcheance?: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  currency: string;
  status: 'A_PAYER' | 'PARTIELLEMENT_PAYEE' | 'PAYEE' | 'ANNULEE';
  notes?: string | null;
  commitmentId?: string | null;
  markAsPaid?: boolean;
  paymentMethod?: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  datePaiement?: string | null;
  paymentReference?: string | null;
  createdAt?: string;
}

export interface Encaissement {
  id: string;
  numeroPiece: string;
  clientId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  description: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  dateEncaissement: string;
  reference?: string | null;
  notes?: string | null;
  status?: 'EN_ATTENTE' | 'VALIDE' | 'ANNULE' | null;
  accountingAccountId?: string | null;
  vatAccountingAccountId?: string | null;
  createdAt?: string;
}

export interface Decaissement {
  id: string;
  numeroPiece: string;
  beneficiaryName: string;
  description: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  dateDecaissement: string;
  reference?: string | null;
  notes?: string | null;
  status: string;
  factureFournisseurId?: string | null;
  commitmentId?: string | null;
  accountingAccountId?: string | null;
  vatAccountingAccountId?: string | null;
  createdAt?: string;
}

export interface CashVoucher {
  id: string;
}

export interface Placement {
  id: string;
  type: 'ACTION' | 'OBLIGATION' | 'TCN' | 'IMMOBILIER';
  name: string;
  issuer?: string | null;
  country?: string | null;
  currency: string;
  quantity: number;
  purchasePrice: number;
  totalCost: number;
  purchaseDate: string;
  maturityDate?: string | null;
  interestRate?: number | null;
  serviceId?: number | null;
  serviceName?: string | null;
  status: 'ACTIF' | 'CEDE' | 'FRACTIONNE' | 'ANNULE';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  courses?: AssetCourse[];
  lastCourse: number;
  currentValuation: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface AssetCourse {
  id: string;
  placementId: string;
  atDate: string;
  value: number;
  createdAt: string;
}

export interface PlacementSummary {
  totalInvested: number;
  currentValuation: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface SpendingOverview {
  totals: {
    totalCommitted: number;
    totalVouchered: number;
    totalDisbursed: number;
    totalReceived: number;
    pendingVouchersAmount: number;
  };
  commitments: PurchaseCommitment[];
  encaissements: Encaissement[];
  decaissements: Decaissement[];
  cashVouchers: any[];
}

export interface CashVoucher {
  id: string;
  voucherNumber: string;
  sourceType: string;
  sourceId?: string | null;
  sourceNumber?: string | null;
  expenseCategory?: string | null;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  beneficiaryName: string;
  beneficiaryPhone?: string | null;
  description: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE' | 'PRELEVEMENT';
  flowType: 'ENCAISSEMENT' | 'DECAISSEMENT';
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  issueDate: string;
  disbursementDate?: string | null;
  reference?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashVoucherImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
  vouchers: CashVoucher[];
}

export interface PurchaseCommitmentStats {
  totalPurchases: number;
  pendingQuotes: number;
  draftQuotes: number;
  rejectedQuotes: number;
  draftOrders: number;
  confirmedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalCommittedAmount: number;
}
