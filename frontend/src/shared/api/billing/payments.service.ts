import { apiClient } from '../shared/client';
import type {
  Decaissement,
  CashVoucherImportResult,
  DetailResponse,
  Encaissement,
  FactureFournisseur,
  ListResponse,
  Payment,
  PurchaseCommitment,
  PurchaseCommitmentStats,
  SpendingOverview,
} from './types';
import { normalizeDetailResponse, normalizeListResponse, normalizeStatsResponse } from './utils';

export const paymentsService = {
  async getPayments(params?: {
    page?: number;
    limit?: number;
    factureId?: string;
    modePaiement?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    query?: string;
    enterpriseId?: string | number;
  }): Promise<ListResponse<Payment>> {
    const queryParams = {
      ...params,
      dateDebut: params?.startDate,
      dateFin: params?.endDate,
      search: params?.search || params?.query,
    };
    delete (queryParams as any).startDate;
    delete (queryParams as any).endDate;
    delete (queryParams as any).query;
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
    clientName?: string;
    clientPhone?: string;
  }): Promise<DetailResponse<Payment>> {
    const response = await apiClient.post('/billing/payments', data);
    return response.data;
  },

  async deletePayment(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/payments/${id}`);
    return response.data;
  },

  async getPurchaseCommitments(params?: {
    enterpriseId?: string | number;
  }): Promise<ListResponse<PurchaseCommitment>> {
    const response = await apiClient.get('/billing/purchase-commitments', { params });
    return normalizeListResponse<PurchaseCommitment>(response.data);
  },

  async getPurchaseCommitmentsStats(params?: {
    enterpriseId?: string | number;
  }): Promise<{ success: boolean; data: PurchaseCommitmentStats }> {
    const response = await apiClient.get('/billing/purchase-commitments/stats', { params });
    return normalizeStatsResponse<PurchaseCommitmentStats>(response.data);
  },

  async validatePurchaseCommitment(id: string): Promise<DetailResponse<PurchaseCommitment>> {
    const response = await apiClient.patch(`/billing/purchase-commitments/${id}/validate`);
    return normalizeDetailResponse<PurchaseCommitment>(response.data);
  },

  async getEncaissements(params?: any): Promise<ListResponse<Encaissement>> {
    const response = await apiClient.get('/billing/encaissements', { params });
    return normalizeListResponse<Encaissement>(response.data);
  },

  async createEncaissement(data: Partial<Encaissement>): Promise<DetailResponse<Encaissement>> {
    const response = await apiClient.post('/billing/encaissements', data);
    return normalizeDetailResponse<Encaissement>(response.data);
  },

  async updateEncaissementStatus(
    id: string,
    payload: { status: 'VALIDE' | 'ANNULE' }
  ): Promise<DetailResponse<Encaissement>> {
    const response = await apiClient.patch(`/billing/encaissements/${id}/status`, payload);
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

  async updateDecaissementStatus(
    id: string,
    payload: { status: 'DECAISSE' | 'ANNULE' }
  ): Promise<DetailResponse<Decaissement>> {
    const response = await apiClient.patch(`/billing/decaissements/${id}/status`, payload);
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
  ) {
    const response = await apiClient.patch(`/billing/cash-vouchers/${id}/status`, data);
    return normalizeDetailResponse(response.data);
  },

  async getSpendingOverview(params?: {
    startDate?: string;
    endDate?: string;
    enterpriseId?: string | number;
  }): Promise<{ success: boolean; data: SpendingOverview }> {
    const response = await apiClient.get('/billing/cash-vouchers/spending-overview', { params });
    return normalizeStatsResponse<SpendingOverview>(response.data);
  },

  async importCashVouchers(file: File, options?: {
    enterpriseId?: string | number;
    defaultEnterpriseName?: string;
    defaultFlowType?: 'ENCAISSEMENT' | 'DECAISSEMENT';
    defaultStatus?: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  }): Promise<DetailResponse<CashVoucherImportResult>> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.enterpriseId !== undefined) formData.append('enterpriseId', String(options.enterpriseId));
    if (options?.defaultEnterpriseName) formData.append('defaultEnterpriseName', options.defaultEnterpriseName);
    if (options?.defaultFlowType) formData.append('defaultFlowType', options.defaultFlowType);
    if (options?.defaultStatus) formData.append('defaultStatus', options.defaultStatus);
    const response = await apiClient.post('/billing/cash-vouchers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeDetailResponse<CashVoucherImportResult>(response.data);
  },
};
