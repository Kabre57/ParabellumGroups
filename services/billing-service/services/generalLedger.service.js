const { PrismaClient } = require('@prisma/client');
const { resolveDateRange, amount } = require('../utils/accounting');
const { applyEnterpriseScope } = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const buildLineDateWhere = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const where = {};
  if (startDate) where.gte = startDate;
  if (endDate) where.lte = endDate;
  return { entryDate: where };
};

const buildOpeningWhere = (startDate) => {
  if (!startDate) return {};
  return { entryDate: { lt: startDate } };
};

const buildOpeningMap = async (req, { startDate, requestedEnterpriseId }) => {
  if (!startDate) return new Map();

  const openingEntries = await prisma.accountingJournalEntry.findMany({
    where: await applyEnterpriseScope({
      req,
      where: buildOpeningWhere(startDate),
      requestedEnterpriseId,
    }),
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  const openingMap = new Map();
  openingEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const code = line.account?.code || '';
      if (!code) return;
      const current = openingMap.get(code) || 0;
      const delta = line.side === 'DEBIT' ? amount(line.amount) : -amount(line.amount);
      openingMap.set(code, current + delta);
    });
  });

  return openingMap;
};

const toEntrySideAmounts = (line) => ({
  debit: line.side === 'DEBIT' ? amount(line.amount) : 0,
  credit: line.side === 'CREDIT' ? amount(line.amount) : 0,
});

const getGeneralLedger = async (req, options = {}) => {
  const { startDate, endDate } = resolveDateRange({
    period: req.query.period,
    startDate: options.startDate || req.query.startDate,
    endDate: options.endDate || req.query.endDate,
  });
  const requestedEnterpriseId = options.enterpriseId || req.query.enterpriseId;
  const accountId = options.accountId || req.query.accountId;
  const includeDraft = normalizeBoolean(options.includeDraft || req.query.includeDraft, false);

  const accountFilter = accountId ? { accountId: String(accountId) } : {};
  const entryWhere = await applyEnterpriseScope({
    req,
    where: {
      ...buildLineDateWhere(startDate, endDate),
      ...(includeDraft ? {} : { status: { not: 'REVERSED' } }),
    },
    requestedEnterpriseId,
  });

  const openingMap = await buildOpeningMap(req, { startDate, requestedEnterpriseId });

  const entries = await prisma.accountingJournalEntry.findMany({
    where: entryWhere,
    include: {
      journal: true,
      period: true,
      lines: {
        where: accountFilter,
        include: {
          account: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
    },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  });

  const ledger = new Map();

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const account = line.account;
      if (!account) return;
      const code = account.code;
      const current = ledger.get(code) || {
        accountId: account.id,
        code,
        label: account.label,
        type: account.type,
        openingBalance: openingMap.get(code) || 0,
        movements: [],
      };

      const { debit, credit } = toEntrySideAmounts(line);
      current.movements.push({
        id: line.id,
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate,
        journalCode: entry.journalCode,
        journalLabel: entry.journalLabel,
        periodCode: entry.period?.code || null,
        status: entry.status || 'POSTED',
        label: entry.label,
        reference: entry.reference || entry.entryNumber,
        description: line.description || entry.label,
        enterpriseId: entry.enterpriseId || null,
        enterpriseName: entry.enterpriseName || null,
        side: line.side,
        debit,
        credit,
      });

      ledger.set(code, current);
    });
  });

  const rows = Array.from(ledger.values())
    .map((accountLedger) => {
      let runningBalance = accountLedger.openingBalance;
      const movements = accountLedger.movements.map((movement) => {
        runningBalance += movement.debit - movement.credit;
        return {
          ...movement,
          runningBalance,
        };
      });

      return {
        ...accountLedger,
        closingBalance: runningBalance,
        totalDebit: movements.reduce((sum, movement) => sum + movement.debit, 0),
        totalCredit: movements.reduce((sum, movement) => sum + movement.credit, 0),
        movements,
      };
    })
    .sort((left, right) => left.code.localeCompare(right.code, 'fr', { numeric: true }));

  return {
    period: {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    },
    generatedAt: new Date().toISOString(),
    rows,
  };
};

module.exports = {
  getGeneralLedger,
};
