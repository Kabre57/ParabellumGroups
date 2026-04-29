import { apiClient } from '../shared/client';
import type { DetailResponse, ListResponse, TreasuryAccount, TreasuryClosure } from './types';
import { normalizeDetailResponse, normalizeListResponse } from './utils';

export const treasuryService = {
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

  async updateTreasuryClosure(
    id: string,
    data: {
      countedCash?: number;
      countedCheque?: number;
      countedCard?: number;
      countedOther?: number;
      ticketZ?: number;
      notes?: string;
      status?: 'DRAFT' | 'CLOSED';
    }
  ): Promise<DetailResponse<TreasuryClosure>> {
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
    accountingAccountId?: string | null;
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
      accountingAccountId?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Promise<DetailResponse<TreasuryAccount>> {
    const response = await apiClient.patch(`/billing/treasury-accounts/${id}`, data);
    return normalizeDetailResponse<TreasuryAccount>(response.data);
  },
};
