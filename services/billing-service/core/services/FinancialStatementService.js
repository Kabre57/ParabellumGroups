const accountingBalanceService = require('../../services/accountingBalance.service');

const normalizeType = (type) => String(type || '').trim().toLowerCase();

const accountValue = (row, naturalSide = 'debit') => {
  const debit = Number(row.balanceDebit || 0);
  const credit = Number(row.balanceCredit || 0);
  return naturalSide === 'credit' ? credit - debit : debit - credit;
};

const statementRow = (row, naturalSide) => ({
  accountId: row.accountId || null,
  code: row.code,
  label: row.label,
  type: normalizeType(row.type),
  amount: accountValue(row, naturalSide),
  debit: Number(row.balanceDebit || 0),
  credit: Number(row.balanceCredit || 0),
});

class FinancialStatementService {
  async getTrialBalance(req, options = {}) {
    return accountingBalanceService.getAccountingBalance(req, {
      ...options,
      groupBy: options.groupBy || 'consolidated',
      includeZeroRows: options.includeZeroRows ?? true,
    });
  }

  async getIncomeStatement(req, options = {}) {
    const balance = await this.getTrialBalance(req, options);
    const rows = balance.rows || [];
    const revenues = rows
      .filter((row) => normalizeType(row.type) === 'revenue')
      .map((row) => statementRow(row, 'credit'))
      .filter((row) => row.amount !== 0 || options.includeZeroRows);
    const expenses = rows
      .filter((row) => normalizeType(row.type) === 'expense')
      .map((row) => statementRow(row, 'debit'))
      .filter((row) => row.amount !== 0 || options.includeZeroRows);

    const totalRevenue = revenues.reduce((sum, row) => sum + row.amount, 0);
    const totalExpense = expenses.reduce((sum, row) => sum + row.amount, 0);

    return {
      reportType: 'INCOME_STATEMENT',
      period: balance.period,
      generatedAt: new Date().toISOString(),
      sections: {
        revenues,
        expenses,
      },
      totals: {
        totalRevenue,
        totalExpense,
        netResult: totalRevenue - totalExpense,
      },
      source: 'ACCOUNTING_JOURNAL_ENTRIES',
    };
  }

  async getBalanceSheet(req, options = {}) {
    const balance = await this.getTrialBalance(req, options);
    const incomeStatement = await this.getIncomeStatement(req, options);
    const rows = balance.rows || [];
    const assets = rows
      .filter((row) => normalizeType(row.type) === 'asset')
      .map((row) => statementRow(row, 'debit'))
      .filter((row) => row.amount !== 0 || options.includeZeroRows);
    const liabilities = rows
      .filter((row) => normalizeType(row.type) === 'liability')
      .map((row) => statementRow(row, 'credit'))
      .filter((row) => row.amount !== 0 || options.includeZeroRows);
    const equity = rows
      .filter((row) => normalizeType(row.type) === 'equity')
      .map((row) => statementRow(row, 'credit'))
      .filter((row) => row.amount !== 0 || options.includeZeroRows);

    const totalAssets = assets.reduce((sum, row) => sum + row.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.amount, 0);
    const totalEquityBeforeResult = equity.reduce((sum, row) => sum + row.amount, 0);
    const netResult = incomeStatement.totals.netResult;
    const totalEquity = totalEquityBeforeResult + netResult;

    return {
      reportType: 'BALANCE_SHEET',
      period: balance.period,
      generatedAt: new Date().toISOString(),
      sections: {
        assets,
        liabilities,
        equity,
        netResult: {
          label: 'Résultat de la période',
          amount: netResult,
        },
      },
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        imbalance: totalAssets - (totalLiabilities + totalEquity),
      },
      source: 'ACCOUNTING_JOURNAL_ENTRIES',
    };
  }
}

module.exports = new FinancialStatementService();
