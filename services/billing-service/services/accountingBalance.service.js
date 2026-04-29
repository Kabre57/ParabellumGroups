const { PrismaClient } = require('@prisma/client');
const {
  amount,
  resolveDateRange,
  serializeAccountingAccount,
  serializeJournalEntry,
} = require('../utils/accounting');
const {
  ensureDefaultTreasuryAccounts,
  serializeTreasuryAccount,
} = require('../utils/treasury');
const { getTreasuryJournalMeta } = require('../utils/accountingAccountResolver');
const MappingService = require('../core/services/AccountingMappingService');
const {
  getAccessibleEnterpriseIds,
  getEnterpriseList,
  parseEnterpriseId,
} = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const buildEntryId = (...parts) => parts.filter(Boolean).join('-');

const buildAccountingReference = (account) =>
  account
    ? {
        id: account.id,
        accountId: account.id,
        code: account.code,
        label: account.label,
      }
    : null;

const resolveTreasuryAccountingReference = async (treasuryAccount, paymentMethod) => {
  const linkedAccount = treasuryAccount?.accountingAccount;
  const linkedReference = linkedAccount && linkedAccount.isActive !== false
    ? buildAccountingReference(linkedAccount)
    : null;

  return linkedReference || MappingService.resolveAccount('PAYMENT', paymentMethod);
};

const buildUpToDateWhere = (field, endDate) => {
  if (!endDate) return {};
  return {
    [field]: {
      lte: endDate,
    },
  };
};

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
  if (normalizedCode.startsWith('2') || normalizedCode.startsWith('3') || normalizedCode.startsWith('5'))
    return 'asset';
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
      return {
        scope: normalizedScope,
        enterpriseIds: [],
      };
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

const withEnterpriseFilter = (where, enterpriseIds, field = 'enterpriseId') => {
  if (!Array.isArray(enterpriseIds)) return where;
  if (!enterpriseIds.length) {
    return {
      ...where,
      [field]: {
        in: [-1],
      },
    };
  }

  return {
    ...where,
    [field]: {
      in: enterpriseIds,
    },
  };
};

const touchRow = (row, dateValue, countMovement) => {
  if (countMovement) {
    row.movementCount += 1;
  }

  if (!dateValue) return;
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return;
  const currentTimestamp = row.lastTransaction ? new Date(row.lastTransaction).getTime() : 0;
  if (timestamp > currentTimestamp) {
    row.lastTransaction = dateValue;
  }
};

const finalizeRow = (row) => {
  const net = row.openingDebit + row.debit - row.openingCredit - row.credit;
  return {
    ...row,
    balanceDebit: net > 0 ? net : 0,
    balanceCredit: net < 0 ? Math.abs(net) : 0,
  };
};

const isWithinPeriod = (dateValue, startDate, endDate) => {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (startDate && timestamp < startDate.getTime()) return false;
  if (endDate && timestamp > endDate.getTime()) return false;
  return true;
};

const isBeforePeriod = (dateValue, startDate) => {
  if (!startDate) return false;
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp < startDate.getTime();
};

const buildRows = ({
  accounts,
  entries,
  includeZeroRows,
  groupBy,
  startDate,
}) => {
  const rows = new Map();
  const accountByCode = new Map(accounts.map((account) => [account.code, account]));

  const ensureRow = ({ code, label, type, enterpriseId = null, enterpriseName = null }) => {
    const rowKey = groupBy === 'enterprise' ? `${enterpriseId || 'none'}:${code}` : code;
    const existing = rows.get(rowKey);
    if (existing) return existing;

    const account = accountByCode.get(code);
    const openingBalance =
      groupBy === 'consolidated'
        ? amount(account?.openingBalance)
        : 0;

    const row = {
      id: rowKey,
      accountId: account?.id,
      code,
      label: account?.label || label || 'Compte non référence',
      type: account?.type || type || inferAccountType(code),
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
    accounts.forEach((account) => {
      ensureRow({
        code: account.code,
        label: account.label,
        type: account.type,
      });
    });
  }

  entries.forEach((entry) => {
    const debitRow = ensureRow({
      code: entry.accountDebit,
      label: entry.accountDebitLabel,
      enterpriseId: entry.enterpriseId || null,
      enterpriseName: entry.enterpriseName || null,
    });
    const creditRow = ensureRow({
      code: entry.accountCredit,
      label: entry.accountCreditLabel,
      enterpriseId: entry.enterpriseId || null,
      enterpriseName: entry.enterpriseName || null,
    });

    if (isBeforePeriod(entry.date, startDate)) {
      debitRow.openingDebit += amount(entry.debit);
      creditRow.openingCredit += amount(entry.credit);
      touchRow(debitRow, entry.date, false);
      touchRow(creditRow, entry.date, false);
      return;
    }

    debitRow.debit += amount(entry.debit);
    creditRow.credit += amount(entry.credit);
    touchRow(debitRow, entry.date, true);
    touchRow(creditRow, entry.date, true);
  });

  return Array.from(rows.values())
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
    });
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

const buildGeneratedEntries = async ({
  factures,
  paiements,
  encaissements,
  decaissements,
  manualEntries,
}) => {
  const entries = [];
  const manualEntrySourceKeys = new Set(
    manualEntries
      .filter((entry) => entry.sourceType && entry.sourceId)
      .map((entry) => `${String(entry.sourceType).toUpperCase()}:${entry.sourceId}`)
  );

  for (const invoice of factures.filter((item) => !['BROUILLON', 'ANNULEE'].includes(String(item.status)))) {
    const revenueAccount = await MappingService.resolveAccount('INVOICE', 'REVENUE');
    const clientAccount = await MappingService.resolveAccount('INVOICE', 'DEBIT_CUSTOMER');

    entries.push({
      id: buildEntryId('invoice', invoice.id),
      date: invoice.dateEmission,
      journalCode: 'VT',
      journalLabel: 'Journal des ventes',
      enterpriseId: invoice.enterpriseId || null,
      enterpriseName: invoice.enterpriseName || null,
      accountDebit: clientAccount.code,
      accountDebitLabel: clientAccount.label,
      accountCredit: revenueAccount.code,
      accountCreditLabel: revenueAccount.label,
      label: `Facture ${invoice.numeroFacture}`,
      debit: amount(invoice.montantHT),
      credit: amount(invoice.montantHT),
      reference: invoice.numeroFacture,
      sourceType: 'INVOICE',
      sourceId: invoice.id,
    });
  }

  for (const decaissement of decaissements.filter((item) => item.status === 'DECAISSE')) {
    if (manualEntrySourceKeys.has(`DECAISSEMENT:${decaissement.id}`)) continue;

    const expenseAccount = await MappingService.resolveAccount('DECAISSEMENT', decaissement.expenseCategory);
    const supplierAccount = await MappingService.resolveAccount('DECAISSEMENT', 'CREDIT_SUPPLIER');

    entries.push({
      id: buildEntryId('decaissement-booking', decaissement.id),
      date: decaissement.createdAt,
      journalCode: 'AC',
      journalLabel: 'Journal des achats',
      enterpriseId: decaissement.enterpriseId || null,
      enterpriseName: decaissement.enterpriseName || null,
      accountDebit: expenseAccount.code,
      accountDebitLabel: expenseAccount.label,
      accountCredit: supplierAccount.code,
      accountCreditLabel: supplierAccount.label,
      label: `${decaissement.numeroPiece} - ${decaissement.description}`,
      debit: amount(decaissement.amountHT || decaissement.amountTTC),
      credit: amount(decaissement.amountHT || decaissement.amountTTC),
      reference: decaissement.reference || decaissement.numeroPiece,
      sourceType: 'DECAISSEMENT',
      sourceId: decaissement.id,
    });

    if (decaissement.status === 'DECAISSE') {
      const treasuryAccount = await resolveTreasuryAccountingReference(
        decaissement.treasuryAccount,
        decaissement.paymentMethod
      );
      const supplierDebitAccount = await MappingService.resolveAccount('DECAISSEMENT', 'DEBIT_SUPPLIER');
      const treasuryJournal = await getTreasuryJournalMeta(prisma, treasuryAccount, {
        fallbackFamily: String(decaissement.paymentMethod || '').toUpperCase() === 'ESPECES' ? 'TREASURY_CASH' : 'TREASURY_BANK',
      });

      entries.push({
        id: buildEntryId('decaissement-payment', decaissement.id),
        date: decaissement.dateDecaissement || decaissement.createdAt,
        journalCode: treasuryJournal.journalCode,
        journalLabel: treasuryJournal.journalLabel,
        enterpriseId: decaissement.enterpriseId || null,
        enterpriseName: decaissement.enterpriseName || null,
        accountDebit: supplierDebitAccount.code,
        accountDebitLabel: supplierDebitAccount.label,
        accountCredit: treasuryAccount.code,
        accountCreditLabel: treasuryAccount.label,
        label: `Décaissement ${decaissement.numeroPiece}`,
        debit: amount(decaissement.amountTTC),
        credit: amount(decaissement.amountTTC),
        reference: decaissement.reference || decaissement.numeroPiece,
        sourceType: 'DECAISSEMENT',
        sourceId: decaissement.id,
      });
    }
  }

  for (const encaissement of encaissements.filter((item) => item.status === 'VALIDE')) {
    if (manualEntrySourceKeys.has(`ENCAISSEMENT:${encaissement.id}`)) continue;

    const treasuryAccount = await resolveTreasuryAccountingReference(
      encaissement.treasuryAccount,
      encaissement.paymentMethod
    );
    const creditAccount = encaissement.factureClientId
      ? await MappingService.resolveAccount('PAYMENT', 'CREDIT_CUSTOMER')
      : await MappingService.resolveAccount('ENCAISSEMENT', encaissement.expenseCategory);
    const treasuryJournal = await getTreasuryJournalMeta(prisma, treasuryAccount, {
      fallbackFamily: String(encaissement.paymentMethod || '').toUpperCase() === 'ESPECES' ? 'TREASURY_CASH' : 'TREASURY_BANK',
    });

    entries.push({
      id: buildEntryId('encaissement', encaissement.id),
      date: encaissement.dateEncaissement || encaissement.createdAt,
      journalCode: treasuryJournal.journalCode,
      journalLabel: treasuryJournal.journalLabel,
      enterpriseId: encaissement.enterpriseId || null,
      enterpriseName: encaissement.enterpriseName || null,
      accountDebit: treasuryAccount.code,
      accountDebitLabel: treasuryAccount.label,
      accountCredit: creditAccount.code,
      accountCreditLabel: creditAccount.label,
      label: `${encaissement.numeroPiece} - ${encaissement.description}`,
      debit: amount(encaissement.amountTTC),
      credit: amount(encaissement.amountTTC),
      reference: encaissement.reference || encaissement.numeroPiece,
      sourceType: 'ENCAISSEMENT',
      sourceId: encaissement.id,
    });
  }

  return [...entries, ...manualEntries].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
};

const fetchBalanceSourceData = async (req, { endDate, enterpriseIds }) => {
  const invoiceWhere = withEnterpriseFilter(buildUpToDateWhere('dateEmission', endDate), enterpriseIds);
  const paymentWhere = withEnterpriseFilter(buildUpToDateWhere('datePaiement', endDate), enterpriseIds);
  const encaissementWhere = withEnterpriseFilter(buildUpToDateWhere('dateEncaissement', endDate), enterpriseIds);
  const decaissementWhere = withEnterpriseFilter(
    endDate
      ? {
          OR: [
            buildUpToDateWhere('dateDecaissement', endDate),
            buildUpToDateWhere('createdAt', endDate),
          ],
        }
      : {},
    enterpriseIds
  );
  const journalEntryWhere = withEnterpriseFilter(buildUpToDateWhere('entryDate', endDate), enterpriseIds);

  const [factures, paiements, encaissements, decaissements, persistedAccounts, manualJournalEntries] =
    await Promise.all([
      prisma.facture.findMany({
        where: invoiceWhere,
        include: { paiements: true, lignes: true },
        orderBy: { dateEmission: 'desc' },
      }),
      prisma.paiement.findMany({
        where: paymentWhere,
        include: { facture: true, treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: { datePaiement: 'desc' },
      }),
      prisma.encaissement.findMany({
        where: encaissementWhere,
        include: { treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: { dateEncaissement: 'desc' },
      }),
      prisma.decaissement.findMany({
        where: decaissementWhere,
        include: { treasuryAccount: { include: { accountingAccount: true } } },
        orderBy: [{ dateDecaissement: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.accountingAccount.findMany({
        where: { isActive: true },
        orderBy: [{ code: 'asc' }],
      }),
      prisma.accountingJournalEntry.findMany({
        where: journalEntryWhere,
        include: {
          lines: {
            include: { account: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

  return {
    factures,
    paiements,
    encaissements,
    decaissements,
    accounts: persistedAccounts.map(serializeAccountingAccount),
    manualEntries: manualJournalEntries.map(serializeJournalEntry),
  };
};

const getAccountingBalance = async (req, options = {}) => {
  await ensureDefaultTreasuryAccounts(prisma, req.user);
  await MappingService.refreshCache();

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

  const sourceData = await fetchBalanceSourceData(req, {
    endDate,
    enterpriseIds: scopeContext.enterpriseIds,
  });
  const entries = await buildGeneratedEntries(sourceData);
  const rows = buildRows({
    accounts: sourceData.accounts,
    entries: entries.filter((entry) => isWithinPeriod(entry.date, null, endDate) || isBeforePeriod(entry.date, startDate)),
    includeZeroRows,
    groupBy,
    startDate,
  }).sort((left, right) => {
    if (groupBy === 'enterprise') {
      const enterpriseCompare = String(left.enterpriseName || '').localeCompare(String(right.enterpriseName || ''), 'fr');
      if (enterpriseCompare !== 0) return enterpriseCompare;
    }
    return left.code.localeCompare(right.code, 'fr', { numeric: true });
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
    rows,
    totals: buildTotals(rows),
  };
};

module.exports = {
  getAccountingBalance,
};
