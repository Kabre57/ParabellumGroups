import { apiClient } from '../shared/client';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total?: number;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
}

export interface Invoice {
  id: string;
  numeroFacture: string;
  clientId: string;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
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
  status: 'BROUILLON' | 'ENVOYEE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_RETARD' | 'ANNULEE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  montantPaye?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  numeroDevis: string;
  clientId: string;
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
  notes?: string;
  status: 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE' | 'CONVERTI';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
}

export interface InvoiceStats {
  totalFactures: number;
  chiffreAffaires: number;
  montantEnAttente: number;
  montantEnRetard: number;
  facturesPayees: number;
  facturesEnRetard: number;
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
  status: string;
  createdAt?: string | null;
}

export interface CashVoucher {
  id: string;
  voucherNumber: string;
  sourceType: 'PURCHASE_ORDER' | 'PURCHASE_QUOTE' | 'SUPPLIER_INVOICE' | 'EXPENSE' | 'OTHER' | string;
  sourceId?: string | null;
  sourceNumber?: string | null;
  expenseCategory?: string | null;
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
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  issueDate: string;
  disbursementDate?: string | null;
  reference?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  approvedByUserId?: string | null;
  approvedByEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpendingOverview {
  totals: {
    totalCommitted: number;
    totalVouchered: number;
    totalDisbursed: number;
    pendingVouchersAmount: number;
  };
  commitments: PurchaseCommitment[];
  cashVouchers: CashVoucher[];
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

  async sendInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/invoices/${id}/send`);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async getInvoicePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/billing/invoices/${id}/pdf`, {
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
    clientId: string;
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

  async acceptQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/accept`);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async refuseQuote(id: string, raison?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/refuse`, { raison });
    return normalizeDetailResponse<Quote>(response.data);
  },

  async convertQuoteToInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/quotes/${id}/convert-to-facture`);
    return normalizeDetailResponse<Invoice>(response.data);
  },

  async sendQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/send`);
    return normalizeDetailResponse<Quote>(response.data);
  },

  async getQuotePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/billing/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getPayments(params?: {
    page?: number;
    limit?: number;
    factureId?: string;
    modePaiement?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<Payment>> {
    const response = await apiClient.get('/billing/payments', { params });
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
    modePaiement: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'PRELEVEMENT';
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

  async getCashVouchers(params?: {
    status?: string;
    sourceType?: string;
    paymentMethod?: string;
    serviceId?: number;
    search?: string;
  }): Promise<ListResponse<CashVoucher>> {
    const response = await apiClient.get('/billing/cash-vouchers', { params });
    return normalizeListResponse<CashVoucher>(response.data);
  },

  async createCashVoucher(data: {
    sourceType?: string;
    sourceId?: string;
    sourceNumber?: string;
    expenseCategory?: string;
    serviceId?: number | null;
    serviceName?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    beneficiaryName: string;
    beneficiaryPhone?: string;
    description: string;
    amountHT?: number;
    amountTVA?: number;
    amountTTC: number;
    paymentMethod: 'CHEQUE' | 'ESPECES';
    issueDate?: string;
    disbursementDate?: string;
    reference?: string;
    notes?: string;
    status?: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  }): Promise<DetailResponse<CashVoucher>> {
    const response = await apiClient.post('/billing/cash-vouchers', data);
    return normalizeDetailResponse<CashVoucher>(response.data);
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

  async getSpendingOverview(): Promise<{ success: boolean; data: SpendingOverview }> {
    const response = await apiClient.get('/billing/cash-vouchers/spending-overview');
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
};

export default billingService;
