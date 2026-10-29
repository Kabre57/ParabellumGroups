import { apiClient } from './client';

export type CreateCashVoucherPayload = {
  paymentMethod: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CARTE';
  treasuryAccountId: string;
};

export type TreasuryAccount = {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  isActive: boolean;
  currency?: string;
};

type ApiResponse<T> = { success: boolean; data: T };

export const billingService = {
  async getTreasuryAccounts(): Promise<TreasuryAccount[]> {
    const response = await apiClient.get<ApiResponse<TreasuryAccount[]>>('/billing/treasury-accounts');
    return Array.isArray(response.data.data) ? response.data.data : [];
  },
};
