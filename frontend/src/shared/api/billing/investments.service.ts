import { apiClient } from '../shared/client';
import { normalizeDetailResponse, normalizeListResponse } from './utils';
import type { 
  DetailResponse, 
  ListResponse,
  InvestmentPortfolio,
  InvestmentPortfolioSummary,
  InvestmentTransaction,
  ExpectedCashflow,
  MaturityAlert,
  PortfolioPerformance,
  PortfolioRisk
} from './types';

/**
 * Frontend service for Investment module.
 * Interfaces with the new /billing/investments endpoints.
 */
export const investmentsService = {
  // --- Portefeuilles ---
  async listPortfolios(params?: { enterpriseId?: number; status?: string }): Promise<ListResponse<InvestmentPortfolio>> {
    const response = await apiClient.get('/billing/investments/portfolios', { params });
    return normalizeListResponse<InvestmentPortfolio>(response.data);
  },

  async createPortfolio(data: Partial<InvestmentPortfolio>): Promise<DetailResponse<InvestmentPortfolio>> {
    const response = await apiClient.post('/billing/investments/portfolios', data);
    return normalizeDetailResponse<InvestmentPortfolio>(response.data);
  },

  async getPortfolio(id: string): Promise<DetailResponse<InvestmentPortfolio>> {
    const response = await apiClient.get(`/billing/investments/portfolios/${id}`);
    return normalizeDetailResponse<InvestmentPortfolio>(response.data);
  },

  async getPortfolioSummary(id: string): Promise<{ success: boolean; data: InvestmentPortfolioSummary }> {
    const response = await apiClient.get(`/billing/investments/portfolios/${id}/summary`);
    return response.data;
  },

  async updatePortfolio(id: string, data: Partial<InvestmentPortfolio>): Promise<DetailResponse<InvestmentPortfolio>> {
    const response = await apiClient.patch(`/billing/investments/portfolios/${id}`, data);
    return normalizeDetailResponse<InvestmentPortfolio>(response.data);
  },

  // --- Valorisation / Performance / Risque ---
  async runValuation(portfolioId: string, valuationDate: string, priceInputs?: Record<string, number>): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`/billing/investments/portfolios/${portfolioId}/valuate`, { valuationDate, priceInputs });
    return response.data;
  },

  async getPerformance(portfolioId: string, asOfDate?: string): Promise<{ success: boolean; data: PortfolioPerformance }> {
    const response = await apiClient.get(`/billing/investments/portfolios/${portfolioId}/performance`, { params: { asOfDate } });
    return response.data;
  },

  async getRiskMetrics(portfolioId: string, asOfDate?: string): Promise<{ success: boolean; data: PortfolioRisk }> {
    const response = await apiClient.get(`/billing/investments/portfolios/${portfolioId}/risk`, { params: { asOfDate } });
    return response.data;
  },

  // --- Transactions ---
  async listTransactions(params?: { portfolioId?: string; assetId?: string; transactionType?: string; status?: string; from?: string; to?: string }): Promise<ListResponse<InvestmentTransaction>> {
    const response = await apiClient.get('/billing/investments/transactions', { params });
    return normalizeListResponse<InvestmentTransaction>(response.data);
  },

  async recordTransaction(data: Partial<InvestmentTransaction>): Promise<DetailResponse<InvestmentTransaction>> {
    const response = await apiClient.post('/billing/investments/transactions', data);
    return normalizeDetailResponse<InvestmentTransaction>(response.data);
  },

  async validateTransaction(id: string): Promise<DetailResponse<InvestmentTransaction>> {
    const response = await apiClient.post(`/billing/investments/transactions/${id}/validate`);
    return normalizeDetailResponse<InvestmentTransaction>(response.data);
  },

  async postTransactionAccounting(id: string, meta?: { enterpriseId?: number; enterpriseName?: string }): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`/billing/investments/transactions/${id}/post-accounting`, meta || {});
    return response.data;
  },

  // --- Cash-flows ---
  async listCashflows(params?: { portfolioId?: string; assetId?: string; status?: string; flowType?: string; from?: string; to?: string }): Promise<ListResponse<ExpectedCashflow>> {
    const response = await apiClient.get('/billing/investments/cashflows', { params });
    return normalizeListResponse<ExpectedCashflow>(response.data);
  },

  async generateCashflows(portfolioId: string, assetId: string): Promise<{ success: boolean; data: ExpectedCashflow[] }> {
    const response = await apiClient.post('/billing/investments/cashflows/generate', { portfolioId, assetId });
    return response.data;
  },

  async receiveCashflow(id: string, amount: number): Promise<DetailResponse<ExpectedCashflow>> {
    const response = await apiClient.post(`/billing/investments/cashflows/${id}/receive`, { amount });
    return normalizeDetailResponse<ExpectedCashflow>(response.data);
  },

  // --- Alertes ---
  async listAlerts(params?: { portfolioId?: string; alertType?: string }): Promise<ListResponse<MaturityAlert>> {
    const response = await apiClient.get('/billing/investments/alerts', { params });
    return normalizeListResponse<MaturityAlert>(response.data);
  },

  async checkMaturities(horizonDays?: number, portfolioId?: string): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post('/billing/investments/alerts/check-maturities', { horizonDays, portfolioId });
    return response.data;
  },

  async dismissAlert(id: string): Promise<DetailResponse<MaturityAlert>> {
    const response = await apiClient.post(`/billing/investments/alerts/${id}/dismiss`);
    return normalizeDetailResponse<MaturityAlert>(response.data);
  },
};
