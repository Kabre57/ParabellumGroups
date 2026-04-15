import { apiClient } from '../shared/client';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  imageUrl?: string | null;
  quantite?: number;
  prixUnitaire?: number;
  tauxTVA?: number;
  total?: number;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
}

export interface Invoice {
  id: string;
  numeroFacture: string;
  clientId: string;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  commercialId?: string | null;
  commercialName?: string | null;
  commercialEmail?: string | null;
  client?: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
  dateFacture: string;
  dateEcheance?: string;
  lignes: InvoiceItem[];
  notes?: string;
  status: 'BROUILLON' | 'ENVOYEE' | 'EMISE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_RETARD' | 'ANNULEE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  montantPaye?: number;
  avoirs?: CreditNote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  numeroDevis: string;
  clientId?: string | null;
  prospectId?: string | null;
  objet?: string | null;
  notes?: string | null;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  client?: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
  dateDevis: string;
  dateValidite?: string;
  lignes: InvoiceItem[];
  status:
    | 'BROUILLON'
    | 'ENVOYE'
    | 'MODIFICATION_DEMANDEE'
    | 'ACCEPTE'
    | 'REFUSE'
    | 'EXPIRE'
    | 'TRANSMIS_FACTURATION'
    | 'FACTURE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  sentAt?: string | null;
  clientRespondedAt?: string | null;
  clientComment?: string | null;
  revisionNumber?: number;
  approvalUrl?: string;
  forwardedToBillingAt?: string | null;
  forwardedToBillingBy?: string | null;
  convertedInvoiceId?: string | null;
  convertedInvoiceNumber?: string | null;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  evenements?: QuoteEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicQuoteResponsePayload {
  action: 'ACCEPT' | 'REQUEST_MODIFICATION' | 'REFUSE';
  comment?: string;
}

export interface QuoteEvent {
  id: string;
  devisId: string;
  type: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  factureId: string;
  facture?: Invoice;
  montant: number;
  datePaiement: string;
  modePaiement: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'PRELEVEMENT';
  reference?: string;
  notes?: string;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  createdAt?: string;
}

export interface CreditNoteLine {
  id?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
}

export interface CreditNote {
  id: string;
  numeroAvoir: string;
  factureId: string;
  factureNumero: string;
  clientId: string;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceLogoUrl?: string | null;
  motif: string;
  notes?: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  status: 'BROUILLON' | 'EMISE' | 'APPLIQUE' | 'ANNULE';
  lignes: CreditNoteLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceStats {
  totalFactures?: number;
  chiffreAffaires: number;
  montantEnAttente: number;
  montantEnRetard: number;
  facturesPayees: number;
  facturesEnRetard: number;
  brouillon?: number;
  emises?: number;
  annulees?: number;
}

export interface QuoteStats {
  totalDevis: number;
  montantTotal: number;
  devisAcceptes: number;
  devisEnAttente: number;
  tauxConversion: number;
}

export interface PurchaseCommitment {
  id: string;
  sourceType: 'PURCHASE_QUOTE' | 'PURCHASE_ORDER';
  sourceId: string;
  sourceNumber: string;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  status: 'ENGAGE' | 'LIQUIDE' | 'ORDONNANCE' | 'PAYE';
  createdAt?: string | null;
}

export interface FactureFournisseur {
  id: string;
  numeroFacture: string;
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
  createdAt?: string;
}

export interface Encaissement {
  id: string;
  numeroPiece: string;
  clientId?: string | null;
  clientName: string;
  description: string;
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
  accountingAccountId?: string | null; // Ajout
  createdAt?: string;
}

export interface Decaissement {
  id: string;
  numeroPiece: string;
  beneficiaryName: string;
  description: string;
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
  accountingAccountId?: string | null; // Ajout
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
  // Calculated fields
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

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'BANK' | 'CASH';
  bankName?: string | null;
  accountNumber?: string | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  balance?: number;
  isDefault?: boolean;
  isActive?: boolean;
  inflows?: number;
  outflows?: number;
  movementCount?: number;
  lastTransaction?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  cashVouchers: any[]; // Reste pour compatibilité temporaire
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

export interface AccountingAccount {
  id: string;
  code: string;
  label: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  isDynamic?: boolean;
  openingBalance?: number;
  balance: number;
  currentBalance?: number;
  lastTransaction?: string | null;
  movementCount?: number;
}

export interface AccountingMovement {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
  reference?: string | null;
  sourceType?: string | null;
  paymentMethod?: string | null;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  treasuryAccountType?: string | null;
}

export interface AccountingEntry {
  id: string;
  entryNumber?: string;
  date: string;
  journalCode: string;
  journalLabel: string;
  accountDebit: string;
  accountDebitId?: string | null;
  accountDebitLabel: string;
  accountCredit: string;
  accountCreditId?: string | null;
  accountCreditLabel: string;
  label: string;
  debit: number;
  credit: number;
  reference: string;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt?: string;
}

export interface AccountingReports {
  balanceSheet: {
    assets: AccountingAccount[];
    liabilities: AccountingAccount[];
    equity: AccountingAccount[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  incomeStatement: {
    revenues: AccountingAccount[];
    expenses: AccountingAccount[];
    totalRevenue: number;
    totalExpenses: number;
    netResult: number;
  };
  treasury: {
    inflows: number;
    outflows: number;
    closingBalance: number;
    byPaymentMethod: Record<string, number>;
    accounts?: TreasuryAccount[];
    otherIncome?: number;
  };
  commitments: {
    totalCommitted: number;
    pendingCommitted: number;
    byCategory: Record<string, number>;
  };
  kpis: {
    netMargin: number;
    collectionRate: number;
    disbursementCoverage: number;
  };
}

export interface TreasuryClosure {
  id: string;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  periodType: 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
  periodLabel?: string | null;
  periodStart: string;
  periodEnd: string;
  expectedCash: number;
  expectedCheque: number;
  expectedCard: number;
  expectedOther: number;
  expectedTotal: number;
  countedCash: number;
  countedCheque: number;
  countedCard: number;
  countedOther: number;
  countedTotal: number;
  ticketZ: number;
  variance: number;
  status: 'DRAFT' | 'CLOSED' | 'VALIDATED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  validatedAt?: string | null;
}

export interface AccountingOverview {
  period: string;
  startDate?: string | null;
  endDate?: string | null;
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalReceived: number;
    totalExpenseHT: number;
    totalDisbursed: number;
    clientReceivables: number;
    supplierLiabilities: number;
    totalCommitted: number;
    pendingCommitted: number;
    netResult: number;
  };
  accounts: AccountingAccount[];
  treasuryMovements: AccountingMovement[];
  entries: AccountingEntry[];
  reports: AccountingReports;
}

export interface PlacementsResponse {
  success: boolean;
  data: Placement[];
  summary: PlacementSummary;
}

export interface PlacementPerformancePoint {
  date: string;
  totalValuation: number;
  totalInvested: number;
  roi: number;
}

export interface BudgetPerformancePoint {
  centerName: string;
  allocated: number;
  spent: number;
  remaining: number;
  performance: number;
}

export interface BudgetPerformanceResponse {
  success: boolean;
  data: BudgetPerformancePoint[];
  summary: {
    totalAllocated: number;
    totalSpent: number;
    globalPerformance: number;
  };
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const normalizeListResponse = <T>(payload: any): ListResponse<T> => {
  if (Array.isArray(payload)) {
    return { success: true, data: payload };
  }

  if (Array.isArray(payload?.data)) {
    return {
      success: payload.success ?? true,
      data: payload.data,
      meta: payload.meta ?? (payload.pagination ? { pagination: payload.pagination } : undefined),
    };
  }

  return {
    success: payload?.success ?? true,
    data: [],
    meta: payload?.meta ?? (payload?.pagination ? { pagination: payload.pagination } : undefined),
  };
};

const normalizeDetailResponse = <T>(payload: any): DetailResponse<T> => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
      message: payload.message,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};

const normalizeStatsResponse = <T>(payload: any): { success: boolean; data: T } => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};

export const billingService = {
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Invoice>> {
    const response = await apiClient.get('/billing/invoices', { params });
    return normalizeListResponse<Invoice>(response.data);
  },

  async getInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.get(`/billing/invoices/${id}`);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async getInvoiceStats(): Promise<{ success: boolean; data: InvoiceStats }> {
    const response = await apiClient.get('/billing/invoices/stats');
    return normalizeStatsResponse<InvoiceStats>(response.data);
  },

  async getRetards(): Promise<ListResponse<Invoice>> {
    const response = await apiClient.get('/billing/invoices/retards');
    return normalizeListResponse<Invoice>(response.data);
  },

  async createInvoice(data: {
    clientId: string;
    dateFacture?: string;
    dateEcheance?: string;
    lignes: InvoiceItem[];
    notes?: string;
  }): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post('/billing/invoices', data);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.put(`/billing/invoices/${id}`, data);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async deleteInvoice(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/invoices/${id}`);
    return response.data;
  },

  async addInvoiceLine(id: string, ligne: InvoiceItem): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/invoices/${id}/lignes`, ligne);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async sendInvoice(id: string): Promise<DetailResponse<Invoice> & { emailDelivery?: any }> {
    const response = await apiClient.post(`/billing/invoices/${id}/send`);
    return {
      ...normalizeDetailResponse<Invoice>(response.data),
      emailDelivery: response.data?.emailDelivery,
    };
  },

  async getInvoicePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/billing/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getCreditNotes(params?: { factureId?: string; status?: string }): Promise<ListResponse<CreditNote>> {
    const response = await apiClient.get('/billing/credit-notes', { params });
    return normalizeListResponse<CreditNote>(response.data);
  },

  async getCreditNote(id: string): Promise<DetailResponse<CreditNote>> {
    const response = await apiClient.get(`/billing/credit-notes/${id}`);
    return normalizeDetailResponse<CreditNote>(response.data);
  },

  async createCreditNote(data: {
    factureId: string;
    motif: string;
    notes?: string;
  }): Promise<DetailResponse<CreditNote>> {
    const response = await apiClient.post('/billing/credit-notes', data);
    return normalizeDetailResponse<CreditNote>(response.data);
  },

  async getCreditNotePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/billing/credit-notes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getQuotes(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Quote>> {
    const response = await apiClient.get('/billing/quotes', { params });
    return normalizeListResponse<Quote>(response.data);
  },

  async getQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.get(`/billing/quotes/${id}`);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async createQuote(data: {
    clientId?: string;
    prospectId?: string;
    serviceId?: string;
    serviceName?: string;
    commercialId?: string;
    commercialName?: string;
    commercialEmail?: string;
    objet?: string;
    dateDevis?: string;
    dateValidite?: string;
    lignes: InvoiceItem[];
    notes?: string;
  }): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post('/billing/quotes', data);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async updateQuote(id: string, data: Partial<Quote>): Promise<DetailResponse<Quote>> {
    const response = await apiClient.put(`/billing/quotes/${id}`, data);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async deleteQuote(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/quotes/${id}`);
    return response.data;
  },

  async addQuoteLine(id: string, ligne: InvoiceItem): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/lignes`, ligne);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async acceptQuote(id: string, comment?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/accept`, { comment });
    return normalizeDetailResponse<Quote>(response.data);
  },

  async requestQuoteModification(id: string, comment?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/request-modification`, { comment });
    return normalizeDetailResponse<Quote>(response.data);
  },

  async refuseQuote(id: string, raison?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/refuse`, { raison });
    return normalizeDetailResponse<Quote>(response.data);
  },

  async forwardQuoteToBilling(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/forward-to-billing`);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async convertQuoteToInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/quotes/${id}/convert-to-facture`);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async sendQuote(id: string, message?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/send`, { message });
    return normalizeDetailResponse<Quote>(response.data);
  },

  async getQuotePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/billing/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async uploadQuoteLineImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/billing/quotes/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  async getPublicQuoteResponse(token: string): Promise<DetailResponse<Quote>> {
    const response = await fetch(`/api/billing/quotes/respond/${token}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Impossible de charger le devis client');
    }

    return normalizeDetailResponse<Quote>(payload);
  },

  async submitPublicQuoteResponse(
    token: string,
    data: PublicQuoteResponsePayload
  ): Promise<DetailResponse<Quote>> {
    const response = await fetch(`/api/billing/quotes/respond/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Impossible d’enregistrer la réponse du client');
    }

    return normalizeDetailResponse<Quote>(payload);
  },

  async getPayments(params?: {
    page?: number;
    limit?: number;
    factureId?: string;
    modePaiement?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<Payment>> {
    const queryParams = {
      ...params,
      dateDebut: params?.startDate,
      dateFin: params?.endDate,
    };
    delete (queryParams as any).startDate;
    delete (queryParams as any).endDate;
    const response = await apiClient.get('/billing/payments', { params: queryParams });
    return normalizeListResponse<Payment>(response.data);
  },

  async getPaymentsByInvoice(factureId: string): Promise<ListResponse<Payment>> {
    const response = await apiClient.get(`/billing/payments/facture/${factureId}`);
    return response.data;
  },

  async getTotalPaidForInvoice(factureId: string): Promise<{ success: boolean; data: { total: number } }> {
    const response = await apiClient.get(`/billing/payments/facture/${factureId}/total`);
    return response.data;
  },

  async createPayment(data: {
    factureId: string;
    montant: number;
    datePaiement?: string;
    modePaiement: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE';
    treasuryAccountId?: string | null;
    reference?: string;
    notes?: string;
  }): Promise<DetailResponse<Payment>> {
    const response = await apiClient.post('/billing/payments', data);
    return response.data;
  },

  async deletePayment(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/payments/${id}`);
    return response.data;
  },

  async getPurchaseCommitments(): Promise<ListResponse<PurchaseCommitment>> {
    const response = await apiClient.get('/billing/purchase-commitments');
    return normalizeListResponse<PurchaseCommitment>(response.data);
  },

  async getPurchaseCommitmentsStats(): Promise<{ success: boolean; data: PurchaseCommitmentStats }> {
    const response = await apiClient.get('/billing/purchase-commitments/stats');
    return normalizeStatsResponse<PurchaseCommitmentStats>(response.data);
  },

  async getEncaissements(params?: any): Promise<ListResponse<Encaissement>> {
    const response = await apiClient.get('/billing/encaissements', { params });
    return normalizeListResponse<Encaissement>(response.data);
  },

  async createEncaissement(data: Partial<Encaissement>): Promise<DetailResponse<Encaissement>> {
    const response = await apiClient.post('/billing/encaissements', data);
    return normalizeDetailResponse<Encaissement>(response.data);
  },

  async getDecaissements(params?: any): Promise<ListResponse<Decaissement>> {
    const response = await apiClient.get('/billing/decaissements', { params });
    return normalizeListResponse<Decaissement>(response.data);
  },

  async createDecaissement(data: Partial<Decaissement>): Promise<DetailResponse<Decaissement>> {
    const response = await apiClient.post('/billing/decaissements', data);
    return normalizeDetailResponse<Decaissement>(response.data);
  },

  async getFacturesFournisseurs(params?: any): Promise<ListResponse<FactureFournisseur>> {
    const response = await apiClient.get('/billing/factures-fournisseurs', { params });
    return normalizeListResponse<FactureFournisseur>(response.data);
  },

  async createFactureFournisseur(data: Partial<FactureFournisseur>): Promise<DetailResponse<FactureFournisseur>> {
    const response = await apiClient.post('/billing/factures-fournisseurs', data);
    return normalizeDetailResponse<FactureFournisseur>(response.data);
  },

  async updateCashVoucherStatus(
    id: string,
    data: {
      status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
      disbursementDate?: string;
      reference?: string;
      notes?: string;
    }
  ): Promise<DetailResponse<CashVoucher>> {
    const response = await apiClient.patch(`/billing/cash-vouchers/${id}/status`, data);
    return normalizeDetailResponse<CashVoucher>(response.data);
  },

  async getSpendingOverview(params?: { startDate?: string; endDate?: string }): Promise<{ success: boolean; data: SpendingOverview }> {
    const response = await apiClient.get('/billing/cash-vouchers/spending-overview', { params });
    return normalizeStatsResponse<SpendingOverview>(response.data);
  },

  async getAccountingOverview(
    period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'all',
    params?: { startDate?: string; endDate?: string }
  ): Promise<{ success: boolean; data: AccountingOverview }> {
    const response = await apiClient.get('/billing/accounting/overview', {
      params: {
        period,
        ...params,
      },
    });
    return normalizeStatsResponse<AccountingOverview>(response.data);
  },

  async getAccountingAccounts(): Promise<ListResponse<AccountingAccount>> {
    const response = await apiClient.get('/billing/accounting/accounts');
    return normalizeListResponse<AccountingAccount>(response.data);
  },

  async getTreasuryAccounts(): Promise<ListResponse<TreasuryAccount>> {
    const response = await apiClient.get('/billing/treasury-accounts');
    return normalizeListResponse<TreasuryAccount>(response.data);
  },

  async getTreasuryClosures(params?: {
    startDate?: string;
    endDate?: string;
    treasuryAccountId?: string;
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  }): Promise<ListResponse<TreasuryClosure>> {
    const response = await apiClient.get('/billing/treasury-closures', { params });
    return normalizeListResponse<TreasuryClosure>(response.data);
  },

  async createTreasuryClosure(data: {
    treasuryAccountId?: string | null;
    periodType: 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
    periodLabel?: string;
    periodStart: string;
    periodEnd: string;
    countedCash?: number;
    countedCheque?: number;
    countedCard?: number;
    countedOther?: number;
    ticketZ?: number;
    notes?: string;
    status?: 'DRAFT' | 'CLOSED';
  }): Promise<DetailResponse<TreasuryClosure>> {
    const response = await apiClient.post('/billing/treasury-closures', data);
    return normalizeDetailResponse<TreasuryClosure>(response.data);
  },

  async updateTreasuryClosure(id: string, data: {
    countedCash?: number;
    countedCheque?: number;
    countedCard?: number;
    countedOther?: number;
    ticketZ?: number;
    notes?: string;
    status?: 'DRAFT' | 'CLOSED';
  }): Promise<DetailResponse<TreasuryClosure>> {
    const response = await apiClient.patch(`/billing/treasury-closures/${id}`, data);
    return normalizeDetailResponse<TreasuryClosure>(response.data);
  },

  async validateTreasuryClosure(id: string): Promise<DetailResponse<TreasuryClosure>> {
    const response = await apiClient.post(`/billing/treasury-closures/${id}/validate`);
    return normalizeDetailResponse<TreasuryClosure>(response.data);
  },

  async createTreasuryAccount(data: {
    name: string;
    type: 'BANK' | 'CASH';
    bankName?: string | null;
    accountNumber?: string | null;
    currency?: string;
    openingBalance?: number;
    isDefault?: boolean;
  }): Promise<DetailResponse<TreasuryAccount>> {
    const response = await apiClient.post('/billing/treasury-accounts', data);
    return normalizeDetailResponse<TreasuryAccount>(response.data);
  },

  async updateTreasuryAccount(
    id: string,
    data: {
      name?: string;
      bankName?: string | null;
      accountNumber?: string | null;
      currency?: string;
      openingBalance?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Promise<DetailResponse<TreasuryAccount>> {
    const response = await apiClient.patch(`/billing/treasury-accounts/${id}`, data);
    return normalizeDetailResponse<TreasuryAccount>(response.data);
  },

  async createAccountingAccount(data: {
    code: string;
    label: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    description?: string;
    openingBalance?: number;
  }): Promise<DetailResponse<AccountingAccount>> {
    const response = await apiClient.post('/billing/accounting/accounts', data);
    return normalizeDetailResponse<AccountingAccount>(response.data);
  },

  async updateAccountingAccount(
    id: string,
    data: {
      code?: string;
      label?: string;
      type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
      description?: string;
      openingBalance?: number;
      isActive?: boolean;
    }
  ): Promise<DetailResponse<AccountingAccount>> {
    const response = await apiClient.patch(`/billing/accounting/accounts/${id}`, data);
    return normalizeDetailResponse<AccountingAccount>(response.data);
  },

  async deleteAccountingAccount(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/accounting/accounts/${id}`);
    return response.data;
  },

  async getAccountingEntries(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ListResponse<AccountingEntry>> {
    const response = await apiClient.get('/billing/accounting/entries', { params });
    return normalizeListResponse<AccountingEntry>(response.data);
  },

  async createAccountingEntry(data: {
    entryDate?: string;
    journalCode?: string;
    journalLabel?: string;
    label: string;
    reference?: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    sourceType?: string;
    sourceId?: string;
  }): Promise<DetailResponse<AccountingEntry>> {
    const response = await apiClient.post('/billing/accounting/entries', data);
    return normalizeDetailResponse<AccountingEntry>(response.data);
  },

  async getPlacements(params?: {
    type?: string;
    status?: string;
    serviceId?: number;
  }): Promise<PlacementsResponse> {
    const response = await apiClient.get('/billing/placements', { params });
    return response.data;
  },

  async getPlacement(id: string): Promise<DetailResponse<Placement>> {
    const response = await apiClient.get(`/billing/placements/${id}`);
    return normalizeDetailResponse<Placement>(response.data);
  },

  async createPlacement(data: Partial<Placement>): Promise<DetailResponse<Placement>> {
    const response = await apiClient.post('/billing/placements', data);
    return normalizeDetailResponse<Placement>(response.data);
  },

  async addAssetCourse(id: string, data: { value: number; atDate?: string }): Promise<DetailResponse<AssetCourse>> {
    const response = await apiClient.post(`/billing/placements/${id}/courses`, data);
    return normalizeDetailResponse<AssetCourse>(response.data);
  },

  async updatePlacementStatus(id: string, status: string): Promise<DetailResponse<Placement>> {
    const response = await apiClient.patch(`/billing/placements/${id}/status`, { status });
    return normalizeDetailResponse<Placement>(response.data);
  },

  async getPlacementsPerformance(): Promise<ListResponse<PlacementPerformancePoint>> {
    const response = await apiClient.get('/billing/placements/stats/performance');
    return response.data;
  },

  async getBudgetPerformance(year?: number): Promise<BudgetPerformanceResponse> {
    const response = await apiClient.get('/billing/budgets/performance', { params: { year } });
    return response.data;
  },
};

export default billingService;
