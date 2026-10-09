import { apiClient } from '../shared/client';
import type {
  AccountingAccount,
  AccountingBalanceResponse,
  AccountingEntry,
  AccountingBalanceSheetResponse,
  AccountingClosing,
  AccountingDiagnosticRun,
  AccountingFamilyDiagnostic,
  AccountingFamilyRule,
  AccountingGeneralLedgerResponse,
  AccountingIncomeStatementResponse,
  AccountingJournal,
  AccountingOverview,
  AccountingPeriod,
  AccountingReportSnapshot,
  DetailResponse,
  FiscalYear,
  GetAccountingBalanceParams,
  ListResponse,
} from './types';
import { normalizeDetailResponse, normalizeListResponse, normalizeStatsResponse } from './utils';

export interface AccountingAccountImportPreviewRow {
  line: number;
  code: string;
  label: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | null;
  description: string | null;
  openingBalance: number;
  status: 'IMPORTABLE' | 'EXISTING' | 'INVALID';
  errors: string[];
}

export interface AccountingAccountImportCorrection {
  line: number;
  values: {
    code: string;
    label: string;
    type: string;
    description: string;
    openingBalance: string | number;
  };
}

export interface AccountingAccountImportPreview {
  enterpriseId: number;
  enterpriseName: string | null;
  rows: AccountingAccountImportPreviewRow[];
  summary: { total: number; importable: number; existing: number; invalid: number };
}

export interface AccountingAccountImportResult {
  enterpriseName: string | null;
  imported: number;
  skippedExisting: number;
  skippedInvalid: number;
  existingCodes: string[];
  errors: Array<{ line: number; code: string; errors: string[] }>;
}

const accountWorkbookFormData = (file: File, corrections: AccountingAccountImportCorrection[] = []) => {
  const formData = new FormData();
  formData.append('file', file);
  if (corrections.length) formData.append('corrections', JSON.stringify(corrections));
  return formData;
};

export const accountingService = {
  async getAccountingOverview(
    period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'all',
    params?: { startDate?: string; endDate?: string; enterpriseId?: string | number; enterpriseScope?: 'consolidated' }
  ): Promise<{ success: boolean; data: AccountingOverview }> {
    const response = await apiClient.get('/billing/accounting/overview', {
      params: { period, ...params },
    });
    return normalizeStatsResponse<AccountingOverview>(response.data);
  },

  async getAccountingBalance(
    params?: GetAccountingBalanceParams
  ): Promise<{ success: boolean; data: AccountingBalanceResponse }> {
    const response = await apiClient.get('/billing/accounting/balance', { params });
    return normalizeStatsResponse<AccountingBalanceResponse>(response.data);
  },

  async getGeneralLedger(params?: {
    startDate?: string;
    endDate?: string;
    enterpriseId?: string | number;
    accountId?: string;
    includeDraft?: boolean;
  }): Promise<{ success: boolean; data: AccountingGeneralLedgerResponse }> {
    const response = await apiClient.get('/billing/accounting/general-ledger', { params });
    return normalizeStatsResponse<AccountingGeneralLedgerResponse>(response.data);
  },

  async getBalanceSheet(params?: GetAccountingBalanceParams): Promise<{ success: boolean; data: AccountingBalanceSheetResponse }> {
    const response = await apiClient.get('/billing/accounting/balance-sheet', { params });
    return normalizeStatsResponse<AccountingBalanceSheetResponse>(response.data);
  },

  async getIncomeStatement(params?: GetAccountingBalanceParams): Promise<{ success: boolean; data: AccountingIncomeStatementResponse }> {
    const response = await apiClient.get('/billing/accounting/income-statement', { params });
    return normalizeStatsResponse<AccountingIncomeStatementResponse>(response.data);
  },

  async getAccountingClosings(params?: {
    periodId?: string;
    status?: string;
  }): Promise<ListResponse<AccountingClosing>> {
    const response = await apiClient.get('/billing/accounting/closings', { params });
    return normalizeListResponse<AccountingClosing>(response.data);
  },

  async createAccountingClosing(data: {
    periodId: string;
    status?: 'DRAFT' | 'CLOSED' | 'VALIDATED';
    notes?: string;
  }): Promise<DetailResponse<AccountingClosing>> {
    const response = await apiClient.post('/billing/accounting/closings', data);
    return normalizeDetailResponse<AccountingClosing>(response.data);
  },

  async getAccountingDiagnostics(params?: { limit?: number }): Promise<ListResponse<AccountingDiagnosticRun>> {
    const response = await apiClient.get('/billing/accounting/diagnostics', { params });
    return normalizeListResponse<AccountingDiagnosticRun>(response.data);
  },

  async runAccountingDiagnostic(data?: { scope?: string }): Promise<DetailResponse<AccountingDiagnosticRun>> {
    const response = await apiClient.post('/billing/accounting/diagnostics/run', data || {});
    return normalizeDetailResponse<AccountingDiagnosticRun>(response.data);
  },

  async getAccountingReportSnapshots(params?: {
    reportType?: string;
    periodId?: string;
    fiscalYearId?: string;
    enterpriseId?: string | number;
  }): Promise<ListResponse<AccountingReportSnapshot>> {
    const response = await apiClient.get('/billing/accounting/report-snapshots', { params });
    return normalizeListResponse<AccountingReportSnapshot>(response.data);
  },

  async createAccountingReportSnapshot(data: {
    reportType: string;
    periodId?: string | null;
    fiscalYearId?: string | null;
    enterpriseId?: string | number | null;
    parameters: any;
    payload: any;
  }): Promise<DetailResponse<AccountingReportSnapshot>> {
    const response = await apiClient.post('/billing/accounting/report-snapshots', data);
    return normalizeDetailResponse<AccountingReportSnapshot>(response.data);
  },

  async getAccountingAccounts(params?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated' }): Promise<ListResponse<AccountingAccount>> {
    const response = await apiClient.get('/billing/accounting/accounts', { params });
    return normalizeListResponse<AccountingAccount>(response.data);
  },

  async getAccountingAccountImportTemplate(): Promise<Blob> {
    const response = await apiClient.get('/billing/accounting/accounts/template', { responseType: 'blob' });
    return response.data;
  },

  async previewAccountingAccountImport(
    file: File,
    corrections: AccountingAccountImportCorrection[] = []
  ): Promise<DetailResponse<AccountingAccountImportPreview>> {
    const response = await apiClient.post(
      '/billing/accounting/accounts/import/preview',
      accountWorkbookFormData(file, corrections),
      { params: { enterpriseScope: 'active' } }
    );
    return normalizeDetailResponse<AccountingAccountImportPreview>(response.data);
  },

  async importAccountingAccounts(
    file: File,
    expectedEnterpriseId: number,
    corrections: AccountingAccountImportCorrection[] = []
  ): Promise<DetailResponse<AccountingAccountImportResult>> {
    const response = await apiClient.post(
      '/billing/accounting/accounts/import',
      accountWorkbookFormData(file, corrections),
      {
        params: { enterpriseScope: 'active', expectedEnterpriseId },
      }
    );
    return normalizeDetailResponse<AccountingAccountImportResult>(response.data);
  },

  async getAccountingJournals(): Promise<ListResponse<AccountingJournal>> {
    const response = await apiClient.get('/billing/accounting/journals');
    return normalizeListResponse<AccountingJournal>(response.data);
  },

  async getAccountingPeriods(fiscalYearId?: string): Promise<ListResponse<AccountingPeriod>> {
    const response = await apiClient.get('/billing/accounting/periods', {
      params: fiscalYearId ? { fiscalYearId } : undefined,
    });
    return normalizeListResponse<AccountingPeriod>(response.data);
  },

  async getFiscalYears(): Promise<ListResponse<FiscalYear>> {
    const response = await apiClient.get('/billing/accounting/fiscal-years');
    return normalizeListResponse<FiscalYear>(response.data);
  },

  async getAccountingFamilyRules(params?: { enterpriseId?: string | number }): Promise<ListResponse<AccountingFamilyRule>> {
    const response = await apiClient.get('/billing/accounting/family-rules', { params });
    return normalizeListResponse<AccountingFamilyRule>(response.data);
  },

  async getAccountingFamilyRulesDiagnostic(): Promise<DetailResponse<AccountingFamilyDiagnostic>> {
    const response = await apiClient.get('/billing/accounting/family-rules/diagnostic');
    return normalizeDetailResponse<AccountingFamilyDiagnostic>(response.data);
  },

  async createAccountingFamily(data: {
    code: string;
    label: string;
    displayType: string;
    accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    description?: string;
  }): Promise<DetailResponse<AccountingFamilyRule>> {
    const response = await apiClient.post('/billing/accounting/family-rules', data);
    return normalizeDetailResponse<AccountingFamilyRule>(response.data);
  },

  async updateAccountingFamily(
    family: string,
    data: {
      label?: string;
      displayType?: string;
      accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
      description?: string | null;
      sortOrder?: number;
    }
  ): Promise<DetailResponse<AccountingFamilyRule>> {
    const response = await apiClient.patch(`/billing/accounting/family-rules/${family}`, data);
    return normalizeDetailResponse<AccountingFamilyRule>(response.data);
  },

  async deleteAccountingFamily(family: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/accounting/family-rules/${family}`);
    return response.data;
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

  async addAccountingFamilyRule(
    family: AccountingFamilyRule['family'],
    data: {
      accountId: string;
      label?: string;
      description?: string;
      isPrimary?: boolean;
    }
  ): Promise<DetailResponse<AccountingFamilyRule['rules'][number]>> {
    const response = await apiClient.post(`/billing/accounting/family-rules/${family}/accounts`, data);
    return normalizeDetailResponse<AccountingFamilyRule['rules'][number]>(response.data);
  },

  async updateAccountingFamilyRule(
    ruleId: string,
    data: {
      label?: string;
      description?: string;
      isPrimary?: boolean;
    }
  ): Promise<DetailResponse<AccountingFamilyRule['rules'][number]>> {
    const response = await apiClient.patch(`/billing/accounting/family-rules/item/${ruleId}`, data);
    return normalizeDetailResponse<AccountingFamilyRule['rules'][number]>(response.data);
  },

  async deleteAccountingFamilyRule(ruleId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/billing/accounting/family-rules/item/${ruleId}`);
    return response.data;
  },

  async getAccountingEntries(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    startDate?: string;
    endDate?: string;
    search?: string;
    enterpriseId?: string | number;
    enterpriseScope?: 'consolidated';
    journalId?: string;
    periodId?: string;
    status?: string;
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
    debitAccountId?: string;
    creditAccountId?: string;
    amount?: number;
    lines?: Array<{
      accountId: string;
      side: 'DEBIT' | 'CREDIT';
      amount: number;
      description?: string;
    }>;
    sourceType?: string;
    sourceId?: string;
  }): Promise<DetailResponse<AccountingEntry>> {
    const response = await apiClient.post('/billing/accounting/entries', data);
    return normalizeDetailResponse<AccountingEntry>(response.data);
  },

  async getTrialBalance(params?: {
    periodId?: string;
    fiscalYearId?: string;
    enterpriseId?: string | number;
    enterpriseScope?: 'consolidated';
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get('/billing/accounting/trial-balance', { params });
    return response.data;
  },

  async getLedger(params?: {
    periodId?: string;
    fiscalYearId?: string;
    enterpriseId?: string | number;
    enterpriseScope?: 'consolidated';
    accountIds?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get('/billing/accounting/ledger', { params });
    return response.data;
  },

  async generateSyscoaReport(data: {
    fiscalYearId: string;
    enterpriseId?: string | number;
  }): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post('/billing/accounting/regulatory-reports/syscoa', data);
    return response.data;
  },
};
