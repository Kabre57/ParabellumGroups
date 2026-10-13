// Types de placements et de portefeuilles.
import type { Placement, PlacementSummary } from './procurement.types';

export interface InvestmentAsset {
  id: string;
  assetCode: string;
  label: string;
  assetType: 'EQUITY' | 'BOND' | 'TREASURY_BILL' | 'TERM_DEPOSIT' | 'REAL_ESTATE' | 'FUND_UNIT' | 'OTHER';
  assetClass: 'CASH_EQUIVALENT' | 'FIXED_INCOME' | 'EQUITY' | 'REAL_ESTATE' | 'ALTERNATIVE';
  issuerName?: string | null;
  currency: string;
  isin?: string | null;
  couponRate?: number | null;
  nominalValue?: number | null;
  issueDate?: string | null;
  maturityDate?: string | null;
  paymentFrequency?: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL' | 'AT_MATURITY';
  riskCategory?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentPortfolio {
  id: string;
  code: string;
  label: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  regimeCode?: string | null;
  baseCurrency: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentHolding {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: InvestmentAsset;
  quantity: number;
  bookValue: number;
  averageCost: number;
  marketValue?: number | null;
  accruedInterest?: number | null;
  unrealizedGainLoss?: number | null;
  valuationDate?: string | null;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentTransaction {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: InvestmentAsset;
  counterpartyId?: string | null;
  transactionType: 'BUY' | 'SELL' | 'COUPON' | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TAX' | 'MATURITY' | 'REINVESTMENT';
  tradeDate: string;
  settlementDate?: string | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  fees: number;
  taxes: number;
  netAmount: number;
  currency: string;
  exchangeRate?: number | null;
  reference?: string | null;
  notes?: string | null;
  status: 'DRAFT' | 'PENDING_SETTLEMENT' | 'SETTLED' | 'CANCELLED';
  createdByUserId?: string | null;
  validatedByUserId?: string | null;
  validatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpectedCashflow {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: InvestmentAsset;
  flowType: 'COUPON' | 'DIVIDEND' | 'INTEREST' | 'RENT' | 'MATURITY' | 'TERM_DEPOSIT_MATURITY';
  dueDate: string;
  expectedAmount: number;
  receivedAmount: number;
  currency: string;
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface MaturityAlert {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: InvestmentAsset;
  alertType: 'MATURITY' | 'COUPON' | 'VALUATION' | 'RISK';
  triggerDate: string;
  dueDate: string;
  message: string;
  status: 'PENDING' | 'TRIGGERED' | 'DISMISSED';
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentPortfolioSummary {
  portfolio: InvestmentPortfolio;
  holdings: InvestmentHolding[];
  summary: {
    totalBookValue: number;
    totalMarketValue: number;
    totalAccruedInterest: number;
    unrealizedGainLoss: number;
    positionsCount: number;
  };
  byAssetClass: Record<string, { bookValue: number; marketValue: number; count: number }>;
}

export interface PortfolioPerformance {
  portfolioId: string;
  asOfDate: string;
  totalInvested: number;
  currentValue: number;
  totalIncome: number;
  totalReturn: number;
  totalReturnPct: number;
  ytdReturnPct: number;
}

export interface PortfolioRisk {
  portfolioId: string;
  asOfDate: string;
  totalValue: number;
  concentration: Array<{ assetClass: string; value: number; percentage: number }>;
  weightedDuration: number;
  currencyExposure: Record<string, number>;
  riskScore: number;
  riskLabel: string;
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
