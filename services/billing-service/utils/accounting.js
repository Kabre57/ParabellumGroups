const { AccountingAccountType, AccountingEntrySide } = require('@prisma/client');

const normalizePermissions = (permissions = []) =>
  (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => String(permission || '').trim().toLowerCase())
    .filter(Boolean);

const isAdminUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR'].includes(role);
};

const hasPermission = (user, ...permissions) => {
  if (isAdminUser(user)) return true;
  const permissionSet = new Set(normalizePermissions(user?.permissions));
  return permissions.some((permission) => permissionSet.has(String(permission).toLowerCase()));
};

const ensureAccountingReadAccess = (req) => {
  if (
    hasPermission(
      req.user,
      'reports.read_financial',
      'expenses.read',
      'expenses.read_all',
      'expenses.read_own',
      'payments.read',
      'payments.read_all',
      'invoices.read'
    )
  ) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message: 'Vous n avez pas la permission de consulter les données comptables',
    },
  };
};

const ensureAccountingWriteAccess = (req, message = 'Vous n avez pas la permission de modifier les données comptables') => {
  if (hasPermission(req.user, 'expenses.create', 'expenses.update', 'payments.create', 'payments.update')) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message,
    },
  };
};

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
};

const resolveDateRange = ({ period, startDate, endDate }) => {
  const parsedStartDate = parseDate(startDate, false);
  const parsedEndDate = parseDate(endDate, true);

  if (parsedStartDate || parsedEndDate) {
    return {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      periodLabel: 'custom',
    };
  }

  const normalizedPeriod = String(period || '').toLowerCase();
  if (!normalizedPeriod || normalizedPeriod === 'all') {
    return {
      startDate: null,
      endDate: null,
      periodLabel: 'all',
    };
  }

  const now = new Date();
  const start = new Date(now);

  switch (normalizedPeriod) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return {
        startDate: null,
        endDate: null,
        periodLabel: 'all',
      };
  }

  return {
    startDate: start,
    endDate: null,
    periodLabel: normalizedPeriod,
  };
};

const accountTypeToView = (type) => String(type || '').toLowerCase();

const accountTypeFromInput = (type) => {
  const normalized = String(type || '').trim().toUpperCase();
  if (Object.values(AccountingAccountType).includes(normalized)) {
    return normalized;
  }
  return null;
};

const DYNAMIC_ACCOUNT_TEMPLATES = {
  '101': {
    formula: {
      balance: 'netResult',
      lastTransaction: 'today',
      movementCount: '1',
    },
  },
  '401': {
    formula: {
      balance: 'supplierLiabilities',
      lastTransaction: 'lastDecaissementDate',
      movementCount: 'decaissementCount + commitmentCount',
    },
  },
  '411': {
    formula: {
      balance: 'clientReceivables',
      lastTransaction: 'lastInvoiceDate',
      movementCount: 'invoiceCount',
    },
  },
  '4456': {
    formula: {
      balance: 'totalDeductibleVat',
      lastTransaction: 'lastDecaissementDate',
      movementCount: 'decaissementCount',
    },
  },
  '4457': {
    formula: {
      balance: 'totalCollectedVat',
      lastTransaction: 'lastInvoiceDate',
      movementCount: 'invoiceCount',
    },
  },
  '512': {
    formula: {
      balance: 'bankInflows - bankOutflows',
      lastTransaction: 'lastBankTransaction',
      movementCount: 'bankMovementCount',
    },
  },
  '531': {
    formula: {
      balance: 'cashInflows - cashOutflows',
      lastTransaction: 'lastCashTransaction',
      movementCount: 'cashMovementCount',
    },
  },
  '607': {
    formula: {
      balance: 'purchasesExpense',
      lastTransaction: 'lastDecaissementDate',
      movementCount: 'decaissementCount',
    },
  },
  '618': {
    formula: {
      balance: 'otherExpense',
      lastTransaction: 'lastDecaissementDate',
      movementCount: 'decaissementCount',
    },
  },
  '706': {
    formula: {
      balance: 'totalRevenue',
      lastTransaction: 'lastInvoiceDate',
      movementCount: 'invoiceCount',
    },
  },
};

const DEFAULT_ACCOUNT_CATALOG = [
  { code: '101', label: 'Capital social', type: AccountingAccountType.EQUITY },
  { code: '121', label: 'Resultat net', type: AccountingAccountType.EQUITY },
  { code: '161', label: 'Emprunts obligataires', type: AccountingAccountType.LIABILITY },
  { code: '211', label: 'Frais de developpement', type: AccountingAccountType.ASSET },
  { code: '241', label: 'Materiel et outillage', type: AccountingAccountType.ASSET },
  { code: '244', label: 'Materiel de transport', type: AccountingAccountType.ASSET },
  { code: '245', label: 'Materiel de bureau', type: AccountingAccountType.ASSET },
  { code: '311', label: 'Marchandises', type: AccountingAccountType.ASSET },
  { code: '401', label: 'Fournisseurs', type: AccountingAccountType.LIABILITY },
  { code: '411', label: 'Clients', type: AccountingAccountType.ASSET },
  { code: '422', label: 'Personnel, remunerations dues', type: AccountingAccountType.LIABILITY },
  { code: '431', label: 'CNPS', type: AccountingAccountType.LIABILITY },
  { code: '442', label: 'Etat, impots et taxes', type: AccountingAccountType.LIABILITY },
  { code: '445', label: 'Etat, TVA', type: AccountingAccountType.LIABILITY },
  { code: '4456', label: 'TVA deductible', type: AccountingAccountType.ASSET },
  { code: '4457', label: 'TVA collectee', type: AccountingAccountType.LIABILITY },
  { code: '512', label: 'Banques', type: AccountingAccountType.ASSET },
  { code: '521', label: 'Instruments de tresorerie', type: AccountingAccountType.ASSET },
  { code: '531', label: 'Caisse', type: AccountingAccountType.ASSET },
  { code: '601', label: 'Achats de matieres premieres', type: AccountingAccountType.EXPENSE },
  { code: '607', label: 'Achats de marchandises', type: AccountingAccountType.EXPENSE },
  { code: '611', label: 'Transports', type: AccountingAccountType.EXPENSE },
  { code: '615', label: 'Entretien et maintenance', type: AccountingAccountType.EXPENSE },
  { code: '618', label: 'Autres charges externes', type: AccountingAccountType.EXPENSE },
  { code: '625', label: 'Deplacements et missions', type: AccountingAccountType.EXPENSE },
  { code: '631', label: 'Impots et taxes directs', type: AccountingAccountType.EXPENSE },
  { code: '661', label: 'Charges de personnel', type: AccountingAccountType.EXPENSE },
  { code: '701', label: 'Ventes de produits finis', type: AccountingAccountType.REVENUE },
  { code: '706', label: 'Services vendus / Prestations', type: AccountingAccountType.REVENUE },
  { code: '707', label: 'Ventes de marchandises', type: AccountingAccountType.REVENUE },
  { code: '811', label: 'Valeurs comptables des cessions', type: AccountingAccountType.EXPENSE },
];

const getDynamicAccountTemplate = (code) => {
  const normalizedCode = String(code || '').trim();
  return DYNAMIC_ACCOUNT_TEMPLATES[normalizedCode] || null;
};

const ensureDefaultAccounts = async (client, user) => {
  const createdByUserId = user?.userId ? String(user.userId) : null;
  const createdByEmail = user?.email || null;

  for (const account of DEFAULT_ACCOUNT_CATALOG) {
    const dynamicTemplate = getDynamicAccountTemplate(account.code);

    await client.accountingAccount.upsert({
      where: { code: account.code },
      update: {
        label: account.label,
        type: account.type,
        isSystem: true,
        isActive: true,
        isDynamic: Boolean(dynamicTemplate),
        formula: dynamicTemplate?.formula || null,
      },
      create: {
        code: account.code,
        label: account.label,
        type: account.type,
        isSystem: true,
        isActive: true,
        openingBalance: 0,
        currentBalance: 0,
        isDynamic: Boolean(dynamicTemplate),
        formula: dynamicTemplate?.formula || null,
        createdByUserId,
        createdByEmail,
      },
    });
  }
};

const serializeAccountingAccount = (account) => ({
  id: account.id,
  code: account.code,
  label: account.label,
  type: accountTypeToView(account.type),
  description: account.description || null,
  isSystem: Boolean(account.isSystem),
  isActive: Boolean(account.isActive),
  openingBalance: amount(account.openingBalance),
  balance: amount(account.currentBalance),
  currentBalance: amount(account.currentBalance),
  lastTransaction: account.updatedAt || account.createdAt || null,
  isDynamic: Boolean(account.isDynamic),
});

const nextEntryNumber = async (client) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `ECR-${year}${month}`;

  const count = await client.accountingJournalEntry.count({
    where: {
      entryNumber: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

const sideFromInput = (side) => {
  const normalized = String(side || '').trim().toUpperCase();
  if (Object.values(AccountingEntrySide).includes(normalized)) {
    return normalized;
  }
  return null;
};

const computeSignedDelta = (accountType, side, value) => {
  const normalizedType = String(accountType || '').toUpperCase();
  const normalizedSide = String(side || '').toUpperCase();
  const numericValue = amount(value);

  const debitIncreases = [AccountingAccountType.ASSET, AccountingAccountType.EXPENSE].includes(normalizedType);
  const isDebit = normalizedSide === AccountingEntrySide.DEBIT;

  if (debitIncreases) {
    return isDebit ? numericValue : -numericValue;
  }

  return isDebit ? -numericValue : numericValue;
};

const serializeJournalEntry = (entry) => {
  const debitLine = entry.lines.find((line) => line.side === AccountingEntrySide.DEBIT);
  const creditLine = entry.lines.find((line) => line.side === AccountingEntrySide.CREDIT);

  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    date: entry.entryDate,
    journalCode: entry.journalCode,
    journalLabel: entry.journalLabel,
    accountDebit: debitLine?.account?.code || '',
    accountDebitId: debitLine?.account?.id || null,
    accountDebitLabel: debitLine?.account?.label || '',
    accountCredit: creditLine?.account?.code || '',
    accountCreditId: creditLine?.account?.id || null,
    accountCreditLabel: creditLine?.account?.label || '',
    label: entry.label,
    debit: amount(debitLine?.amount),
    credit: amount(creditLine?.amount),
    reference: entry.reference || entry.entryNumber,
    sourceType: entry.sourceType || null,
    sourceId: entry.sourceId || null,
    createdAt: entry.createdAt,
  };
};

module.exports = {
  normalizePermissions,
  isAdminUser,
  hasPermission,
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
  amount,
  parseDate,
  resolveDateRange,
  accountTypeToView,
  accountTypeFromInput,
  getDynamicAccountTemplate,
  ensureDefaultAccounts,
  serializeAccountingAccount,
  nextEntryNumber,
  sideFromInput,
  computeSignedDelta,
  serializeJournalEntry,
};
