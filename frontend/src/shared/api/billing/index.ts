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
    return response.data;
  },

  async getInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.get(`/billing/invoices/${id}`);
    return response.data;
  },

  async getInvoiceStats(): Promise<{ success: boolean; data: InvoiceStats }> {
    const response = await apiClient.get('/billing/invoices/stats');
    return response.data;
  },

  async getRetards(): Promise<ListResponse<Invoice>> {
    const response = await apiClient.get('/billing/invoices/retards');
    return response.data;
  },

  async createInvoice(data: {
    clientId: string;
    dateFacture?: string;
    dateEcheance?: string;
    lignes: InvoiceItem[];
    notes?: string;
  }): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post('/billing/invoices', data);
    return response.data;
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.put(`/billing/invoices/${id}`, data);
    return response.data;
  },

  async deleteInvoice(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/invoices/${id}`);
    return response.data;
  },

  async addInvoiceLine(id: string, ligne: InvoiceItem): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/invoices/${id}/lignes`, ligne);
    return response.data;
  },

  async sendInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/invoices/${id}/send`);
    return response.data;
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
    return response.data;
  },

  async getQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.get(`/billing/quotes/${id}`);
    return response.data;
  },

  async createQuote(data: {
    clientId: string;
    dateDevis?: string;
    dateValidite?: string;
    lignes: InvoiceItem[];
    notes?: string;
  }): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post('/billing/quotes', data);
    return response.data;
  },

  async updateQuote(id: string, data: Partial<Quote>): Promise<DetailResponse<Quote>> {
    const response = await apiClient.put(`/billing/quotes/${id}`, data);
    return response.data;
  },

  async deleteQuote(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/quotes/${id}`);
    return response.data;
  },

  async addQuoteLine(id: string, ligne: InvoiceItem): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/lignes`, ligne);
    return response.data;
  },

  async acceptQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/accept`);
    return response.data;
  },

  async refuseQuote(id: string, raison?: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/refuse`, { raison });
    return response.data;
  },

  async convertQuoteToInvoice(id: string): Promise<DetailResponse<Invoice>> {
    const response = await apiClient.post(`/billing/quotes/${id}/convert-to-facture`);
    return response.data;
  },

  async sendQuote(id: string): Promise<DetailResponse<Quote>> {
    const response = await apiClient.post(`/billing/quotes/${id}/send`);
    return response.data;
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
    return response.data;
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
};

export default billingService;
