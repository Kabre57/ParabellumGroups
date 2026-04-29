import { apiClient } from '../shared/client';
import type {
  DetailResponse,
  Invoice,
  InvoiceItem,
  ListResponse,
  PublicQuoteResponsePayload,
  Quote,
} from './types';
import { normalizeDetailResponse, normalizeListResponse } from './utils';

export const quotesService = {
  async getQuotes(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    enterpriseId?: string | number;
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
    enterpriseId?: string | number;
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
      throw new Error(payload?.error || "Impossible d'enregistrer la réponse du client");
    }
    return normalizeDetailResponse<Quote>(payload);
  },
};
