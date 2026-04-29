import { apiClient } from '../shared/client';
import type { CreditNote, DetailResponse, Invoice, InvoiceItem, InvoiceStats, ListResponse } from './types';
import { normalizeDetailResponse, normalizeListResponse, normalizeStatsResponse } from './utils';

export const invoicesService = {
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    query?: string;
    enterpriseId?: string | number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Invoice>> {
    const queryParams = {
      ...params,
      search: params?.search || params?.query,
    };
    delete (queryParams as any).query;
    const response = await apiClient.get('/billing/invoices', { params: queryParams });
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
    enterpriseId?: string | number;
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

  async getCreditNotes(params?: {
    factureId?: string;
    status?: string;
    enterpriseId?: string | number;
  }): Promise<ListResponse<CreditNote>> {
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
};
