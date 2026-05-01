export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  imageUrl?: string | null;
  quantite?: number;
  prixUnitaire?: number;
  tauxTVA?: number;
  total?: number;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
}

export interface Invoice {
  id: string;
  numeroFacture: string;
  clientId: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  commercialId?: string | null;
  commercialName?: string | null;
  commercialEmail?: string | null;
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
  status: 'BROUILLON' | 'ENVOYEE' | 'EMISE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_RETARD' | 'ANNULEE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  montantPaye?: number;
  avoirs?: CreditNote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  numeroDevis: string;
  clientId?: string | null;
  prospectId?: string | null;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  objet?: string | null;
  notes?: string | null;
  modeLivraison?: string | null;
  modalitePaiement?: string | null;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  client?: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
  dateDevis: string;
  dateValidite?: string;
  lignes: InvoiceItem[];
  status:
    | 'BROUILLON'
    | 'ENVOYE'
    | 'MODIFICATION_DEMANDEE'
    | 'ACCEPTE'
    | 'REFUSE'
    | 'EXPIRE'
    | 'TRANSMIS_FACTURATION'
    | 'FACTURE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  sentAt?: string | null;
  clientRespondedAt?: string | null;
  clientComment?: string | null;
  revisionNumber?: number;
  approvalUrl?: string;
  forwardedToBillingAt?: string | null;
  forwardedToBillingBy?: string | null;
  convertedInvoiceId?: string | null;
  convertedInvoiceNumber?: string | null;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  evenements?: QuoteEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicQuoteResponsePayload {
  action: 'ACCEPT' | 'REQUEST_MODIFICATION' | 'REFUSE';
  comment?: string;
}

export interface QuoteEvent {
  id: string;
  devisId: string;
  type: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  factureId: string;
  facture?: Invoice;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  montant: number;
  datePaiement: string;
  modePaiement: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'PRELEVEMENT';
  reference?: string;
  notes?: string;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  createdAt?: string;
}

export interface CreditNoteLine {
  id?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
}

export interface CreditNote {
  id: string;
  numeroAvoir: string;
  factureId: string;
  factureNumero: string;
  clientId: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceLogoUrl?: string | null;
  motif: string;
  notes?: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  status: 'BROUILLON' | 'EMISE' | 'APPLIQUE' | 'ANNULE';
  lignes: CreditNoteLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceStats {
  totalFactures?: number;
  chiffreAffaires: number;
  montantEnAttente: number;
  montantEnRetard: number;
  facturesPayees: number;
  facturesEnRetard: number;
  brouillon?: number;
  emises?: number;
  annulees?: number;
}

export interface QuoteStats {
  totalDevis: number;
  montantTotal: number;
  devisAcceptes: number;
  devisEnAttente: number;
  tauxConversion: number;
}

export interface PurchaseCommitment {
  id: string;
  sourceType: 'PURCHASE_QUOTE' | 'PURCHASE_ORDER';
  sourceId: string;
  sourceNumber: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  sourceStatus?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  status?: 'ENGAGE' | 'LIQUIDE' | 'ORDONNANCE' | 'PAYE' | null;
  createdAt?: string | null;
}

export interface FactureFournisseur {
  id: string;
  numeroFacture: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  fournisseurId?: string | null;
  fournisseurNom?: string | null;
  dateFacture: string;
  dateEcheance?: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  currency: string;
  status: 'A_PAYER' | 'PARTIELLEMENT_PAYEE' | 'PAYEE' | 'ANNULEE';
  notes?: string | null;
  commitmentId?: string | null;
  markAsPaid?: boolean;
  paymentMethod?: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  datePaiement?: string | null;
  paymentReference?: string | null;
  createdAt?: string;
}

export interface Encaissement {
  id: string;
  numeroPiece: string;
  clientId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  description: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  dateEncaissement: string;
  reference?: string | null;
  notes?: string | null;
  status?: 'EN_ATTENTE' | 'VALIDE' | 'ANNULE' | null;
  accountingAccountId?: string | null;
  vatAccountingAccountId?: string | null;
  createdAt?: string;
}

export interface Decaissement {
  id: string;
  numeroPiece: string;
  beneficiaryName: string;
  description: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE';
  treasuryAccountId?: string | null;
  dateDecaissement: string;
  reference?: string | null;
  notes?: string | null;
  status: string;
  factureFournisseurId?: string | null;
  commitmentId?: string | null;
  accountingAccountId?: string | null;
  vatAccountingAccountId?: string | null;
  createdAt?: string;
}

export interface CashVoucher {
  id: string;
}

export interface Placement {
  id: string;
  type: 'ACTION' | 'OBLIGATION' | 'TCN' | 'IMMOBILIER';
  name: string;
  issuer?: string | null;
  country?: string | null;
  currency: string;
  quantity: number;
  purchasePrice: number;
  totalCost: number;
  purchaseDate: string;
  maturityDate?: string | null;
  interestRate?: number | null;
  serviceId?: number | null;
  serviceName?: string | null;
  status: 'ACTIF' | 'CEDE' | 'FRACTIONNE' | 'ANNULE';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  courses?: AssetCourse[];
  lastCourse: number;
  currentValuation: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface AssetCourse {
  id: string;
  placementId: string;
  atDate: string;
  value: number;
  createdAt: string;
}

export interface PlacementSummary {
  totalInvested: number;
  currentValuation: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface AccountingAccount {
  id: string;
  code: string;
  label: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string | null;
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

export interface SpendingOverview {
  totals: {
    totalCommitted: number;
    totalVouchered: number;
    totalDisbursed: number;
    totalReceived: number;
    pendingVouchersAmount: number;
  };
  commitments: PurchaseCommitment[];
  encaissements: Encaissement[];
  decaissements: Decaissement[];
  cashVouchers: any[];
}

export interface CashVoucher {
  id: string;
  voucherNumber: string;
  sourceType: string;
  sourceId?: string | null;
  sourceNumber?: string | null;
  expenseCategory?: string | null;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  beneficiaryName: string;
  beneficiaryPhone?: string | null;
  description: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  currency: string;
  paymentMethod: 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CARTE' | 'PRELEVEMENT';
  flowType: 'ENCAISSEMENT' | 'DECAISSEMENT';
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'ANNULE';
  issueDate: string;
  disbursementDate?: string | null;
  reference?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashVoucherImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
  vouchers: CashVoucher[];
}

export interface PurchaseCommitmentStats {
  totalPurchases: number;
  pendingQuotes: number;
  draftQuotes: number;
  rejectedQuotes: number;
  draftOrders: number;
  confirmedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalCommittedAmount: number;
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

export interface PlacementsResponse {
  success: boolean;
  data: Placement[];
  summary: PlacementSummary;
}

export interface PlacementPerformancePoint {
  date: string;
  totalValuation: number;
  totalInvested: number;
  roi: number;
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
