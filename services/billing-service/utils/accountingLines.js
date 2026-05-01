const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAccountingLines = (lines = [], label = '', enterpriseId = null) =>
  lines
    .filter((line) => line && line.accountId && amount(line.amount) > 0)
    .map((line) => ({
      accountId: String(line.accountId).trim(),
      side: String(line.side || '').trim().toUpperCase(),
      amount: amount(line.amount),
      description: line.description ? String(line.description).trim() : label,
      enterpriseId: Number.isInteger(enterpriseId) ? enterpriseId : line.enterpriseId ?? null,
      thirdPartyId: line.thirdPartyId ? String(line.thirdPartyId).trim() : null,
      thirdPartyName: line.thirdPartyName ? String(line.thirdPartyName).trim() : null,
      currency: line.currency ? String(line.currency).trim().toUpperCase() : 'XOF',
      exchangeRate: line.exchangeRate ?? null,
      amountCurrency: line.amountCurrency ?? null,
    }));

const sumAccountingLines = (lines, side) =>
  lines
    .filter((line) => line.side === side)
    .reduce((sum, line) => sum + amount(line.amount), 0);

const validateBalancedAccountingLines = (lines) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    const error = new Error('Une écriture comptable doit contenir au moins deux lignes.');
    error.statusCode = 400;
    throw error;
  }

  const invalidSide = lines.find((line) => !['DEBIT', 'CREDIT'].includes(line.side));
  if (invalidSide) {
    const error = new Error('Chaque ligne doit avoir un sens débit ou crédit valide.');
    error.statusCode = 400;
    throw error;
  }

  const totalDebit = sumAccountingLines(lines, 'DEBIT');
  const totalCredit = sumAccountingLines(lines, 'CREDIT');

  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    const error = new Error('L écriture comptable doit être équilibrée.');
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  amount,
  normalizeAccountingLines,
  sumAccountingLines,
  validateBalancedAccountingLines,
};
