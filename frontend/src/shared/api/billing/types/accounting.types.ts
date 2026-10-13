// Types des comptes, journaux et écritures comptables.
export interface AccountingAccount {
  id: string;
  code: string;
  label: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string | null;
  enterpriseId?: number | null;
  isSystem?: boolean;
  isActive?: boolean;
  isDynamic?: boolean;
  openingBalance?: number;
  balance: number;
  currentBalance?: number;
  lastTransaction?: string | null;
  movementCount?: number;
}

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'BANK' | 'CASH';
  bankName?: string | null;
  accountNumber?: string | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  balance?: number;
  accountingAccountId?: string | null;
  accountingAccount?: Pick<AccountingAccount, 'id' | 'code' | 'label' | 'type' | 'isActive'> | null;
  isDefault?: boolean;
  isActive?: boolean;
  inflows?: number;
  outflows?: number;
  movementCount?: number;
  lastTransaction?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TreasuryTransfer {
  id: string;
  sourceTreasuryAccountId: string;
  destinationTreasuryAccountId: string;
  amount: number;
  date: string;
  reference: string;
  notes?: string | null;
  sourceAccount?: TreasuryAccount;
  destinationAccount?: TreasuryAccount;
}

export interface AccountingFamilyRule {
  family: string;
  code?: string;
  label: string;
  description?: string | null;
  type?: string;
  displayType?: string;
  expectedType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | string;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | string;
  isSystem?: boolean;
  enterpriseId?: number | null;
  sortOrder?: number;
  primaryAccountId?: string | null;
  primaryAccount?: AccountingAccount | null;
  rules: Array<{
    id: string;
    family: AccountingFamilyRule['family'];
    label: string;
    description?: string | null;
    accountId: string;
    account?: AccountingAccount | null;
    isPrimary: boolean;
    enterpriseId?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
}

export interface AccountingFamilyDiagnostic {
  healthy: boolean;
  totalFamilies: number;
  configuredFamilies: number;
  missingFamilies: AccountingFamilyRule['family'][];
  invalidFamilies: AccountingFamilyRule['family'][];
  families: Array<{
    family: AccountingFamilyRule['family'];
    code?: string;
    label: string;
    type?: string;
    expectedType: string;
    required: boolean;
    isConfigured: boolean;
    primaryAccountId?: string | null;
    primaryAccount?: AccountingAccount | null;
    rulesCount: number;
    usableRulesCount: number;
    invalidRulesCount: number;
    issues: string[];
  }>;
}

export interface AccountingMovement {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  reference?: string | null;
  sourceType?: string | null;
  paymentMethod?: string | null;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  treasuryAccountType?: string | null;
}

export interface AccountingEntryLine {
  id?: string;
  accountId: string;
  accountCode: string;
  accountLabel: string;
  accountType?: string | null;
  side: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string | null;
  enterpriseId?: number | null;
  thirdPartyId?: string | null;
  thirdPartyName?: string | null;
  currency?: string;
  exchangeRate?: number | null;
  amountCurrency?: number | null;
}

export interface AccountingEntry {
  id: string;
  entryNumber?: string;
  date: string;
  journalCode: string;
  journalLabel: string;
  journalId?: string | null;
  periodId?: string | null;
  fiscalYearId?: string | null;
  status?: 'DRAFT' | 'VALIDATED' | 'POSTED' | 'REVERSED' | string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  accountDebit: string;
  accountDebitId?: string | null;
  accountDebitLabel: string;
  accountCredit: string;
  accountCreditId?: string | null;
  accountCreditLabel: string;
  label: string;
  debit: number;
  credit: number;
  totalDebit?: number;
  totalCredit?: number;
  lineCount?: number;
  lines?: AccountingEntryLine[];
  reference: string;
  sourceType?: string | null;
  sourceId?: string | null;
  postedAt?: string | null;
  validatedAt?: string | null;
  createdAt?: string;
}

export interface FiscalYear {
  id: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  periods?: AccountingPeriod[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingPeriod {
  id: string;
  fiscalYearId: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  periodType: 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'CUSTOM';
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  closedAt?: string | null;
  lockedAt?: string | null;
  fiscalYear?: FiscalYear;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingJournal {
  id: string;
  code: string;
  label: string;
  type: 'SALES' | 'PURCHASE' | 'BANK' | 'CASH' | 'GENERAL' | 'PAYROLL' | 'INVESTMENT';
  description?: string | null;
  isActive: boolean;
  enterpriseId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingLedgerMovement {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  journalCode: string;
  journalLabel: string;
  periodCode?: string | null;
  status: string;
  label: string;
  reference: string;
  description: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  side: 'DEBIT' | 'CREDIT';
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountingLedgerAccount {
  accountId: string;
  code: string;
  label: string;
  type: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  movements: AccountingLedgerMovement[];
}

export interface AccountingGeneralLedgerResponse {
  period: {
    startDate?: string | null;
    endDate?: string | null;
  };
  generatedAt: string;
  rows: AccountingLedgerAccount[];
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
    accounts?: TreasuryAccount[];
    otherIncome?: number;
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

export interface TreasuryClosure {
  id: string;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  periodType: 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
  periodLabel?: string | null;
  periodStart: string;
  periodEnd: string;
  expectedCash: number;
  expectedCheque: number;
  expectedCard: number;
  expectedOther: number;
  expectedTotal: number;
  countedCash: number;
  countedCheque: number;
  countedCard: number;
  countedOther: number;
  countedTotal: number;
  ticketZ: number;
  variance: number;
  status: 'DRAFT' | 'CLOSED' | 'VALIDATED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  validatedAt?: string | null;
}
