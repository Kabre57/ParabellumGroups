// Types des synthèses et des rapports comptables.
import type { AccountingAccount, AccountingMovement, AccountingEntry, AccountingReports } from './accounting.types';

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

export interface AccountingBalanceRow {
  id: string;
  accountId?: string;
  code: string;
  label: string;
  type: AccountingAccount['type'] | string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  balanceDebit: number;
  balanceCredit: number;
  movementCount: number;
  lastTransaction?: string | null;
}

export interface AccountingBalanceResponse {
  period: {
    startDate?: string | null;
    endDate?: string | null;
  };
  generatedAt: string;
  scope: 'all' | 'parent' | 'subsidiaries' | 'single';
  groupBy: 'consolidated' | 'enterprise';
  includeZeroRows: boolean;
  rows: AccountingBalanceRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    balanceDebit: number;
    balanceCredit: number;
  };
}

export interface GetAccountingBalanceParams {
  startDate?: string;
  endDate?: string;
  enterpriseId?: string | number;
  scope?: 'all' | 'parent' | 'subsidiaries' | 'single';
  groupBy?: 'consolidated' | 'enterprise';
  includeZeroRows?: boolean;
}

export interface AccountingStatementRow {
  accountId?: string | null;
  code: string;
  label: string;
  type: string;
  amount: number;
  debit: number;
  credit: number;
}

export interface AccountingIncomeStatementResponse {
  reportType: 'INCOME_STATEMENT';
  period: { startDate?: string | null; endDate?: string | null };
  generatedAt: string;
  sections: {
    revenues: AccountingStatementRow[];
    expenses: AccountingStatementRow[];
  };
  totals: {
    totalRevenue: number;
    totalExpense: number;
    netResult: number;
  };
  source: string;
}

export interface AccountingBalanceSheetResponse {
  reportType: 'BALANCE_SHEET';
  period: { startDate?: string | null; endDate?: string | null };
  generatedAt: string;
  sections: {
    assets: AccountingStatementRow[];
    liabilities: AccountingStatementRow[];
    equity: AccountingStatementRow[];
    netResult: { label: string; amount: number };
  };
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    imbalance: number;
  };
  source: string;
}

export interface AccountingClosing {
  id: string;
  periodId: string;
  status: 'DRAFT' | 'CLOSED' | 'VALIDATED' | 'CANCELLED';
  notes?: string | null;
  snapshotData?: any;
  createdAt: string;
  validatedAt?: string | null;
}

export interface AccountingDiagnosticRun {
  id: string;
  runDate: string;
  scope: string;
  status: 'HEALTHY' | 'WARNING' | 'FAILED' | string;
  summary: any;
  issues: Array<{
    id: string;
    issueType: string;
    severity: string;
    entityType: string;
    entityId?: string | null;
    message: string;
    details?: any;
  }>;
}

export interface AccountingReportSnapshot {
  id: string;
  reportType: string;
  periodId?: string | null;
  fiscalYearId?: string | null;
  enterpriseId?: number | null;
  generatedAt: string;
  parameters: any;
  payload: any;
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
