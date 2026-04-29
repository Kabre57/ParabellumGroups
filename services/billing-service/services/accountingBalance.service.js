const { PrismaClient } = require('@prisma/client');
const { amount, resolveDateRange, serializeAccountingAccount } = require('../utils/accounting');
const {
  getAccessibleEnterpriseIds,
  getEnterpriseList,
  parseEnterpriseId,
} = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const normalizeSortableText = (value) => String(value || '').trim();

const normalizeScope = (scope) => {
  const normalized = String(scope || 'all').trim().toLowerCase();
  return ['all', 'parent', 'subsidiaries', 'single'].includes(normalized) ? normalized : 'all';
};

const normalizeGroupBy = (groupBy) => {
  const normalized = String(groupBy || 'consolidated').trim().toLowerCase();
  return normalized === 'enterprise' ? 'enterprise' : 'consolidated';
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const inferAccountType = (code) => {
  const normalizedCode = String(code || '').trim();
  if (normalizedCode.startsWith('6')) return 'expense';
  if (normalizedCode.startsWith('7')) return 'revenue';
  if (normalizedCode.startsWith('1')) return 'equity';
  if (normalizedCode.startsWith('2') || normalizedCode.startsWith('3') || normalizedCode.startsWith('5')) return 'asset';
  if (normalizedCode.startsWith('4')) return 'liability';
  return 'asset';
};

const buildParentMap = (enterprises) => {
  const parentById = new Map();
  enterprises.forEach((enterprise) => {
    const enterpriseId = parseEnterpriseId(enterprise.id);
    if (!enterpriseId) return;
    parentById.set(enterpriseId, parseEnterpriseId(enterprise.parentEnterpriseId));
  });
  return parentById;
};

const collectDescendants = (parentById, rootEnterpriseId) => {
  const descendants = new Set();

  const visit = (currentId) => {
    parentById.forEach((parentId, enterpriseId) => {
      if (parentId !== currentId || descendants.has(enterpriseId)) return;
      descendants.add(enterpriseId);
      visit(enterpriseId);
    });
  };

  visit(rootEnterpriseId);
  return Array.from(descendants);
};

const computeScopeContext = async (req, { scope, requestedEnterpriseId }) => {
  const normalizedScope = normalizeScope(scope);
  const currentEnterpriseId = parseEnterpriseId(req.user?.enterpriseId);
  const accessibleEnterpriseIds = await getAccessibleEnterpriseIds(req);
  const accessibleSet = Array.isArray(accessibleEnterpriseIds) ? new Set(accessibleEnterpriseIds) : null;

  const ensureAllowed = (enterpriseId) => {
    if (!enterpriseId) return null;
    if (!accessibleSet || accessibleSet.has(enterpriseId)) return enterpriseId;
    const error = new Error("Vous n'avez pas acces a cette entreprise.");
    error.statusCode = 403;
    throw error;
  };

  if (normalizedScope === 'single') {
    const singleEnterpriseId = ensureAllowed(parseEnterpriseId(requestedEnterpriseId));
    return {
      scope: normalizedScope,
      enterpriseIds: singleEnterpriseId ? [singleEnterpriseId] : [],
    };
  }

  if (normalizedScope === 'parent') {
    return {
      scope: normalizedScope,
      enterpriseIds: currentEnterpriseId ? [currentEnterpriseId] : [],
    };
  }

  if (normalizedScope === 'subsidiaries') {
    if (!currentEnterpriseId) {
      return { scope: normalizedScope, enterpriseIds: [] };
    }

    const enterprises = await getEnterpriseList(req);
    const parentById = buildParentMap(enterprises);
    const descendantIds = collectDescendants(parentById, currentEnterpriseId).filter((enterpriseId) =>
      accessibleSet ? accessibleSet.has(enterpriseId) : true
    );

    return {
      scope: normalizedScope,
      enterpriseIds: descendantIds,
    };
  }

  return {
    scope: normalizedScope,
    enterpriseIds: accessibleEnterpriseIds,
  };
};

const finalizeRow = (row) => {
  const net = row.openingDebit + row.debit - row.openingCredit - row.credit;
  return {
    ...row,
    balanceDebit: net > 0 ? net : 0,
    balanceCredit: net < 0 ? Math.abs(net) : 0,
  };
};

const buildTotals = (rows) =>
  rows.reduce(
    (totals, row) => ({
      openingDebit: totals.openingDebit + row.openingDebit,
      openingCredit: totals.openingCredit + row.openingCredit,
      debit: totals.debit + row.debit,
      credit: totals.credit + row.credit,
      balanceDebit: totals.balanceDebit + row.balanceDebit,
      balanceCredit: totals.balanceCredit + row.balanceCredit,
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      balanceDebit: 0,
      balanceCredit: 0,
    }
  );

const buildOpeningWhere = (endDate, enterpriseIds) => {
  const where = {
    ...(endDate ? { entryDate: { lte: endDate } } : {}),
    ...(Array.isArray(enterpriseIds)
      ? {
          enterpriseId: {
            in: enterpriseIds.length ? enterpriseIds : [-1],
          },
        }
      : {}),
    status: {
      not: 'REVERSED',
    },
  };

  return where;
};

const touchLastTransaction = (row, dateValue) => {
  if (!dateValue) return;
  const current = row.lastTransaction ? new Date(row.lastTransaction).getTime() : 0;
  const incoming = new Date(dateValue).getTime();
  if (!Number.isNaN(incoming) && incoming > current) {
    row.lastTransaction = dateValue;
  }
};

const getAccountingBalance = async (req, options = {}) => {
  const { startDate, endDate } = resolveDateRange({
    period: req.query.period,
    startDate: options.startDate || req.query.startDate,
    endDate: options.endDate || req.query.endDate,
  });
  const scopeContext = await computeScopeContext(req, {
    scope: options.scope || req.query.scope,
    requestedEnterpriseId: options.enterpriseId || req.query.enterpriseId,
  });
  const groupBy = normalizeGroupBy(options.groupBy || req.query.groupBy);
  const includeZeroRows = normalizeBoolean(options.includeZeroRows || req.query.includeZeroRows, false);

  const [accounts, entries] = await Promise.all([
    prisma.accountingAccount.findMany({
      where: { isActive: true },
      orderBy: [{ code: 'asc' }],
    }),
    prisma.accountingJournalEntry.findMany({
      where: buildOpeningWhere(endDate, scopeContext.enterpriseIds),
      include: {
        lines: {
          include: { account: true },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const serializedAccounts = accounts.map(serializeAccountingAccount);
  const accountByCode = new Map(serializedAccounts.map((account) => [account.code, account]));
  const rows = new Map();

  const ensureRow = ({ code, label, type, enterpriseId = null, enterpriseName = null }) => {
    const normalizedCode = normalizeSortableText(code);
    const rowKey = groupBy === 'enterprise' ? `${enterpriseId || 'none'}:${normalizedCode || 'unknown'}` : normalizedCode || 'unknown';
    const existing = rows.get(rowKey);
    if (existing) return existing;

    const account = accountByCode.get(normalizedCode);
    const openingBalance = groupBy === 'consolidated' ? amount(account?.openingBalance) : 0;
    const row = {
      id: rowKey,
      accountId: account?.id,
      code: normalizedCode,
      label: account?.label || label || 'Compte non reference',
      type: account?.type || type || inferAccountType(normalizedCode),
      enterpriseId: groupBy === 'enterprise' ? enterpriseId : null,
      enterpriseName: groupBy === 'enterprise' ? enterpriseName || 'Entreprise non renseignée' : null,
      openingDebit: openingBalance > 0 ? openingBalance : 0,
      openingCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      debit: 0,
      credit: 0,
      balanceDebit: 0,
      balanceCredit: 0,
      movementCount: 0,
      lastTransaction: account?.lastTransaction || null,
    };
    rows.set(rowKey, row);
    return row;
  };

  if (includeZeroRows && groupBy === 'consolidated') {
    serializedAccounts.forEach((account) => {
      ensureRow({
        code: account.code,
        label: account.label,
        type: account.type,
      });
    });
  }

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const accountCode = line.account?.code;
      if (!accountCode) return;

      const row = ensureRow({
        code: accountCode,
        label: line.account?.label,
        type: line.account?.type,
        enterpriseId: entry.enterpriseId || null,
        enterpriseName: entry.enterpriseName || null,
      });

      const value = amount(line.amount);
      const isOpening = startDate ? new Date(entry.entryDate).getTime() < startDate.getTime() : false;

      if (isOpening) {
        if (line.side === 'DEBIT') {
          row.openingDebit += value;
        } else {
          row.openingCredit += value;
        }
        touchLastTransaction(row, entry.entryDate);
        return;
      }

      if (line.side === 'DEBIT') {
        row.debit += value;
      } else {
        row.credit += value;
      }
      row.movementCount += 1;
      touchLastTransaction(row, entry.entryDate);
    });
  });

  const resultRows = Array.from(rows.values())
    .map(finalizeRow)
    .filter((row) => {
      if (includeZeroRows) return true;
      return (
        row.openingDebit !== 0 ||
        row.openingCredit !== 0 ||
        row.debit !== 0 ||
        row.credit !== 0 ||
        row.balanceDebit !== 0 ||
        row.balanceCredit !== 0
      );
    })
    .sort((left, right) => {
      if (groupBy === 'enterprise') {
        const enterpriseCompare = normalizeSortableText(left.enterpriseName).localeCompare(
          normalizeSortableText(right.enterpriseName),
          'fr'
        );
        if (enterpriseCompare !== 0) return enterpriseCompare;
      }
      return normalizeSortableText(left.code).localeCompare(normalizeSortableText(right.code), 'fr', { numeric: true });
    });

  return {
    period: {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    },
    generatedAt: new Date().toISOString(),
    scope: scopeContext.scope,
    groupBy,
    includeZeroRows,
    rows: resultRows,
    totals: buildTotals(resultRows),
  };
};

module.exports = {
  getAccountingBalance,
};
