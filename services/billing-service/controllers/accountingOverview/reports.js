const { amount } = require('./shared');

// Prépare le bilan, le compte de résultat, la trésorerie et les indicateurs clés.
const buildAccountingReports = ({
  mergedAccounts, totalRevenue, manualDeltasByType, totalExpenseHT, totalTreasuryIncome,
  totalOtherIncome, runningBalance, treasuryAccountSummaries,
  totalDisbursed, clientReceivables, supplierLiabilities, totalCommitted, pendingCommitments,
  totalCollectedVat, totalInvoiceReceived, activeDecaissements,
}) => {
    const assets = mergedAccounts.filter((account) => account.type === 'asset');
    const liabilities = mergedAccounts.filter((account) => account.type === 'liability');
    const equity = mergedAccounts.filter((account) => account.type === 'equity');
    const revenues = mergedAccounts.filter((account) => account.type === 'revenue');
    const expenses = mergedAccounts.filter((account) => account.type === 'expense');

    const totalAssets = assets.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalEquity = equity.reduce((sum, account) => sum + amount(account.balance), 0);
    const reportedRevenue = totalRevenue + manualDeltasByType.revenue;
    const reportedExpenses = totalExpenseHT + manualDeltasByType.expense;
    const reportedNetResult = reportedRevenue - reportedExpenses;

    const paymentMethodBreakdown = activeDecaissements.reduce((accumulator, d) => {
      const key = String(d.paymentMethod || 'AUTRE').toUpperCase();
      accumulator[key] = (accumulator[key] || 0) + amount(d.amountTTC);
      return accumulator;
    }, {});

    const expenseCategoryBreakdown = activeDecaissements.reduce((accumulator, d) => {
      const key = d.description || 'Dépenses Diverses';
      accumulator[key] = (accumulator[key] || 0) + amount(d.amountTTC);
      return accumulator;
    }, {});

    const reports = {
      balanceSheet: {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
      incomeStatement: {
        revenues,
        expenses,
        totalRevenue: reportedRevenue,
        totalExpenses: reportedExpenses,
        netResult: reportedNetResult,
      },
      treasury: {
        inflows: totalTreasuryIncome,
        outflows: totalDisbursed,
        closingBalance: runningBalance,
        byPaymentMethod: paymentMethodBreakdown,
        accounts: treasuryAccountSummaries,
        otherIncome: totalOtherIncome,
      },
      commitments: {
        totalCommitted,
        pendingCommitted: pendingCommitments,
        byCategory: expenseCategoryBreakdown,
      },
      kpis: {
        netMargin: reportedRevenue > 0 ? (reportedNetResult / reportedRevenue) * 100 : 0,
        collectionRate:
          reportedRevenue > 0 ? (totalInvoiceReceived / Math.max(reportedRevenue + totalCollectedVat, 1)) * 100 : 0,
        disbursementCoverage: totalCommitted > 0 ? (totalDisbursed / totalCommitted) * 100 : 0,
      },
    };


  return { reports, reportedRevenue, reportedExpenses, reportedNetResult };
};

// Conserve le format de réponse consommé par le tableau de bord comptable.
const buildAccountingOverviewResponse = ({ periodLabel, startDate, endDate, metrics, treasury, entries, accountingReports }) => {
  const {
    totalTreasuryIncome, totalExpenseHT, totalDisbursed, clientReceivables,
    supplierLiabilities, totalCommitted, pendingCommitments, mergedAccounts,
  } = metrics;
  const { reports, reportedRevenue, reportedExpenses, reportedNetResult } = accountingReports;
  return {
    success: true,
    data: {
      period: periodLabel,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: reportedRevenue,
        totalReceived: totalTreasuryIncome,
        totalExpenseHT: reportedExpenses,
        totalDisbursed,
        clientReceivables,
        supplierLiabilities,
        totalCommitted,
        pendingCommitted: pendingCommitments,
        netResult: reportedNetResult,
      },
      totals: {
        totalRevenue: reportedRevenue,
        totalReceived: totalTreasuryIncome,
        totalExpenseHT: reportedExpenses,
        totalDisbursed,
        clientReceivables,
        supplierLiabilities,
        totalCommitted,
        pendingCommitted: pendingCommitments,
        netResult: reportedNetResult,
      },
      accounts: mergedAccounts,
      treasuryMovements: treasury.treasuryMovements,
      entries,
      reports,
    },
  };
};

module.exports = { buildAccountingOverviewResponse, buildAccountingReports };
