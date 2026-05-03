const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'services', 'billing-service', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Inject missing columns in AccountingJournalLine
const ajlSearch = `  amountCurrency Float?`;
const ajlReplace = `  amountCurrency Float?
  costCenterId   String?
  analyticAxisId String?
  allocationKey  String?`;
schema = schema.replace(ajlSearch, ajlReplace);

// 2. Inject missing columns in BudgetAllocation
const baSearch = `  analyticCenterId String
  amount           Float`;
const baReplace = `  analyticCenterId String
  costCenterId     String?
  analyticAxisId   String?
  amount           Float`;
schema = schema.replace(baSearch, baReplace);

// 3. Remove old Placement module
const placementRegex = /\/\/ --- MODULE PLACEMENTS ---\s+model Placement \{[\s\S]*?enum PlacementStatus \{[\s\S]*?\}/;
schema = schema.replace(placementRegex, '');

// 4. Append new models and enums
const newModels = `
// --- MODULE ANALYTIQUE ---

model CostCenter {
  id              String   @id @default(uuid())
  code            String   @unique
  label           String
  description     String?
  isActive        Boolean  @default(true)
  parentId        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  allocations     AnalyticAllocation[]

  @@map("cost_centers")
}

model AnalyticAxis {
  id              String   @id @default(uuid())
  code            String   @unique
  label           String
  description     String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  values          AnalyticValue[]
  allocations     AnalyticAllocation[]

  @@map("analytic_axes")
}

model AnalyticValue {
  id              String   @id @default(uuid())
  axisId          String
  code            String
  label           String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  axis            AnalyticAxis @relation(fields: [axisId], references: [id], onDelete: Cascade)
  allocations     AnalyticAllocation[]

  @@index([axisId])
  @@map("analytic_values")
}

model AnalyticAllocation {
  id              String   @id @default(uuid())
  journalLineId   String
  axisId          String?
  valueId         String?
  costCenterId    String?
  percentage      Float
  amount          Float
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  axis            AnalyticAxis?  @relation(fields: [axisId], references: [id], onDelete: SetNull)
  value           AnalyticValue? @relation(fields: [valueId], references: [id], onDelete: SetNull)
  costCenter      CostCenter?    @relation(fields: [costCenterId], references: [id], onDelete: SetNull)

  @@index([journalLineId])
  @@index([axisId])
  @@index([valueId])
  @@index([costCenterId])
  @@map("analytic_allocations")
}

// --- NOUVEAU MODULE PLACEMENTS ---

model InvestmentPortfolio {
  id              String   @id @default(uuid())
  code            String   @unique
  label           String
  enterpriseId    Int?
  regimeCode      String?
  baseCurrency    String   @default("XOF")
  status          InvestmentPortfolioStatus @default(ACTIVE)
  description     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  holdings        InvestmentHolding[]
  transactions    InvestmentTransaction[]
  valuations      InvestmentValuation[]
  cashflows       ExpectedCashflow[]

  @@index([enterpriseId])
  @@index([status])
  @@map("investment_portfolios")
}

model InvestmentAsset {
  id              String   @id @default(uuid())
  assetCode       String   @unique
  label           String
  assetType       InvestmentAssetType
  assetClass      InvestmentAssetClass
  issuerName      String?
  issuerCountry   String?
  currency        String   @default("XOF")
  isin            String?
  referenceRate   String?
  couponRate      Float?
  dividendPolicy  String?
  nominalValue    Float?
  issueDate       DateTime?
  maturityDate    DateTime?
  paymentFrequency String?
  riskCategory    String?
  isActive        Boolean  @default(true)
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  transactions    InvestmentTransaction[]
  cashflows       ExpectedCashflow[]
  valuations      InvestmentValuation[]

  @@index([assetType])
  @@index([assetClass])
  @@index([isActive])
  @@map("investment_assets")
}

model InvestmentCounterparty {
  id              String   @id @default(uuid())
  code            String   @unique
  name            String
  type            InvestmentCounterpartyType
  contactInfo     Json?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([type])
  @@index([isActive])
  @@map("investment_counterparties")
}

model Custodian {
  id              String   @id @default(uuid())
  code            String   @unique
  name            String
  contactInfo     Json?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([isActive])
  @@map("custodians")
}

model InvestmentHolding {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String
  quantity        Float
  bookValue       Float
  averageCost     Float
  marketValue     Float?
  accruedInterest Float?
  valuationDate   DateTime?
  status          InvestmentHoldingStatus @default(OPEN)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  portfolio       InvestmentPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  asset           InvestmentAsset     @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@unique([portfolioId, assetId])
  @@index([portfolioId])
  @@index([assetId])
  @@index([status])
  @@map("investment_holdings")
}

model InvestmentTransaction {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String
  counterpartyId  String?
  transactionType InvestmentTransactionType
  tradeDate       DateTime
  settlementDate  DateTime?
  quantity        Float
  unitPrice       Float
  grossAmount     Float
  fees            Float    @default(0)
  taxes           Float    @default(0)
  netAmount       Float
  currency        String   @default("XOF")
  exchangeRate    Float?
  status          InvestmentTransactionStatus @default(DRAFT)
  reference       String?
  notes           String?
  createdByUserId String?
  validatedByUserId String?
  validatedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  portfolio       InvestmentPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  asset           InvestmentAsset     @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@index([portfolioId])
  @@index([assetId])
  @@index([transactionType])
  @@index([tradeDate])
  @@index([status])
  @@map("investment_transactions")
}

model InvestmentCorporateAction {
  id              String   @id @default(uuid())
  assetId         String
  portfolioId     String?
  actionType      InvestmentCorporateActionType
  effectiveDate   DateTime
  recordDate      DateTime?
  paymentDate     DateTime?
  grossAmount     Float?
  netAmount       Float?
  currency        String?
  status          String
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([assetId])
  @@index([portfolioId])
  @@index([actionType])
  @@map("investment_corporate_actions")
}

model InvestmentValuation {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String
  valuationDate   DateTime
  valuationMethod InvestmentValuationMethod
  bookValue       Float
  marketValue     Float
  accruedInterest Float    @default(0)
  unrealizedGainLoss Float @default(0)
  priceSource     String?
  priceValue      Float?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  portfolio       InvestmentPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  asset           InvestmentAsset     @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@unique([portfolioId, assetId, valuationDate])
  @@index([portfolioId])
  @@index([assetId])
  @@index([valuationDate])
  @@map("investment_valuations")
}

model PortfolioValuationSnapshot {
  id              String   @id @default(uuid())
  portfolioId     String
  valuationDate   DateTime
  bookValue       Float
  marketValue     Float
  cashValue       Float
  netAssetValue   Float
  performanceYtd  Float?
  performanceSinceInception Float?
  riskScore       Float?
  createdAt       DateTime @default(now())

  @@index([portfolioId])
  @@index([valuationDate])
  @@map("portfolio_valuation_snapshots")
}

model InvestmentPerformanceMetric {
  id              String   @id @default(uuid())
  portfolioId     String?
  assetId         String?
  asOfDate        DateTime
  metricType      InvestmentMetricType
  value           Float
  periodLabel     String?
  createdAt       DateTime @default(now())

  @@index([portfolioId])
  @@index([assetId])
  @@index([asOfDate])
  @@map("investment_performance_metrics")
}

model InvestmentRiskMetric {
  id              String   @id @default(uuid())
  portfolioId     String?
  assetId         String?
  asOfDate        DateTime
  metricType      InvestmentRiskMetricType
  value           Float
  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([portfolioId])
  @@index([assetId])
  @@index([asOfDate])
  @@map("investment_risk_metrics")
}

model ExpectedCashflow {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String
  flowType        ExpectedCashflowType
  dueDate         DateTime
  expectedAmount  Float
  receivedAmount  Float    @default(0)
  currency        String   @default("XOF")
  status          ExpectedCashflowStatus @default(PENDING)
  sourceTransactionId String?
  reference       String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  portfolio       InvestmentPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  asset           InvestmentAsset     @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@index([portfolioId])
  @@index([assetId])
  @@index([dueDate])
  @@index([status])
  @@map("expected_cashflows")
}

model MaturityAlert {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String
  alertType       MaturityAlertType
  triggerDate     DateTime
  dueDate         DateTime
  status          MaturityAlertStatus @default(PENDING)
  message         String
  sentAt          DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([portfolioId])
  @@index([assetId])
  @@index([triggerDate])
  @@index([status])
  @@map("maturity_alerts")
}

model CustodyFeeRule {
  id              String   @id @default(uuid())
  custodianId     String?
  assetClass      InvestmentAssetClass?
  rateType        CustodyFeeRateType
  rateValue       Float
  minimumFee      Float?
  currency        String   @default("XOF")
  isActive        Boolean  @default(true)
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([custodianId])
  @@index([isActive])
  @@map("custody_fee_rules")
}

model CustodyFeeCharge {
  id              String   @id @default(uuid())
  portfolioId     String
  assetId         String?
  custodianId     String?
  periodStart     DateTime
  periodEnd       DateTime
  calculatedBase  Float
  rateApplied     Float
  amount          Float
  currency        String   @default("XOF")
  status          CustodyFeeChargeStatus @default(CALCULATED)
  reference       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([portfolioId])
  @@index([custodianId])
  @@index([status])
  @@map("custody_fee_charges")
}

model InvestmentCoverage {
  id              String   @id @default(uuid())
  sourcePortfolioId String
  targetPortfolioId String
  assetId         String?
  coverageType    InvestmentCoverageType
  effectiveDate   DateTime
  amount          Float
  status          String
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([sourcePortfolioId])
  @@index([targetPortfolioId])
  @@map("investment_coverages")
}

model InvestmentAccountingMapping {
  id              String   @id @default(uuid())
  assetType       InvestmentAssetType?
  assetClass      InvestmentAssetClass?
  transactionType InvestmentTransactionType?
  eventType       String
  debitAccountId  String?
  creditAccountId String?
  expenseAccountId String?
  incomeAccountId String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([assetType])
  @@index([assetClass])
  @@index([transactionType])
  @@index([isActive])
  @@map("investment_accounting_mappings")
}

// --- ENUMS ---

enum InvestmentPortfolioStatus {
  ACTIVE
  INACTIVE
  CLOSED
}

enum InvestmentAssetType {
  BOND
  EQUITY
  TERM_DEPOSIT
  REAL_ESTATE
  FUND_UNIT
  TREASURY_BILL
  OTHER
}

enum InvestmentAssetClass {
  FIXED_INCOME
  EQUITY
  REAL_ESTATE
  CASH_EQUIVALENT
  ALTERNATIVE
}

enum InvestmentCounterpartyType {
  BROKER
  BANK
  ISSUER
  OTHER
}

enum InvestmentHoldingStatus {
  OPEN
  CLOSED
  SUSPENDED
}

enum InvestmentTransactionType {
  BUY
  SELL
  COUPON
  DIVIDEND
  RENT
  MATURITY
  REINVESTMENT
  FEE
  REVALUATION
}

enum InvestmentTransactionStatus {
  DRAFT
  PENDING_SETTLEMENT
  SETTLED
  CANCELLED
}

enum InvestmentCorporateActionType {
  DIVIDEND
  SPLIT
  MERGER
  SPINOFF
  COUPON
}

enum InvestmentValuationMethod {
  AMORTIZED_COST
  MARK_TO_MARKET
  MODEL_BASED
  MANUAL
}

enum InvestmentMetricType {
  YIELD_TO_MATURITY
  CURRENT_YIELD
  TOTAL_RETURN
  DURATION
}

enum InvestmentRiskMetricType {
  VOLATILITY
  VAR
  TRACKING_ERROR
  BETA
}

enum ExpectedCashflowType {
  COUPON
  DIVIDEND
  RENT
  MATURITY
  INTEREST
  TERM_DEPOSIT_MATURITY
}

enum ExpectedCashflowStatus {
  PENDING
  RECEIVED
  PARTIAL
  CANCELLED
}

enum MaturityAlertType {
  MATURITY
  COUPON
  OPTION_EXERCISE
}

enum MaturityAlertStatus {
  PENDING
  TRIGGERED
  DISMISSED
}

enum CustodyFeeRateType {
  FLAT
  PERCENTAGE_AUM
  TIERED
}

enum CustodyFeeChargeStatus {
  CALCULATED
  BILLED
  PAID
  CANCELLED
}

enum InvestmentCoverageType {
  HEDGING
  GUARANTEE
  PLEDGE
}
`;

schema += newModels;

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully.');
