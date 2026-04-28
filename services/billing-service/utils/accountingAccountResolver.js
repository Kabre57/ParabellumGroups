const { AccountingAccountType } = require('@prisma/client');

const FAMILY_RULES = {
  CUSTOMER_RECEIVABLE: {
    exactCodes: ['411'],
    prefixes: ['411'],
    type: AccountingAccountType.ASSET,
    create: {
      code: '411',
      label: 'Clients',
      type: AccountingAccountType.ASSET,
    },
    errorMessage: 'Aucun compte client n est configuré dans le plan comptable.',
  },
  SUPPLIER_PAYABLE: {
    exactCodes: ['401'],
    prefixes: ['401'],
    type: AccountingAccountType.LIABILITY,
    create: {
      code: '401',
      label: 'Fournisseurs',
      type: AccountingAccountType.LIABILITY,
    },
    errorMessage: 'Aucun compte fournisseur n est configuré dans le plan comptable.',
  },
  PURCHASE_EXPENSE: {
    exactCodes: ['607', '601'],
    prefixes: ['607', '601', '605', '60', '61', '62'],
    type: AccountingAccountType.EXPENSE,
    create: {
      code: '607',
      label: 'Achats de biens et services',
      type: AccountingAccountType.EXPENSE,
    },
    errorMessage: 'Aucun compte de charge achat n est configuré dans le plan comptable.',
  },
  MISC_EXPENSE: {
    exactCodes: ['618', '615', '625'],
    prefixes: ['618', '615', '625', '61', '62', '60'],
    type: AccountingAccountType.EXPENSE,
    create: {
      code: '618',
      label: 'Autres charges d exploitation',
      type: AccountingAccountType.EXPENSE,
    },
    errorMessage: 'Aucun compte de charge n est configuré dans le plan comptable.',
  },
  REVENUE: {
    exactCodes: ['706', '707', '708'],
    prefixes: ['706', '707', '708', '70'],
    type: AccountingAccountType.REVENUE,
    create: {
      code: '706',
      label: 'Prestations de services',
      type: AccountingAccountType.REVENUE,
    },
    errorMessage: 'Aucun compte de produit n est configuré dans le plan comptable.',
  },
  TREASURY_BANK: {
    exactCodes: ['521100', '521', '512'],
    prefixes: ['521', '512'],
    type: AccountingAccountType.ASSET,
    create: {
      code: '521100',
      label: 'BANQUES EN MONNAIE NATIONALE',
      type: AccountingAccountType.ASSET,
    },
    errorMessage: 'Aucun compte bancaire n est configuré dans le plan comptable.',
  },
  TREASURY_CASH: {
    exactCodes: ['571100', '571', '531'],
    prefixes: ['571', '531'],
    type: AccountingAccountType.ASSET,
    create: {
      code: '571100',
      label: 'CAISSE EN MONNAIE NATIONALE',
      type: AccountingAccountType.ASSET,
    },
    errorMessage: 'Aucun compte de caisse n est configuré dans le plan comptable.',
  },
};

const normalizeText = (value) => String(value || '').trim();

const isCashAccountingCode = (code) => {
  const normalized = normalizeText(code);
  return normalized.startsWith('571') || normalized.startsWith('531');
};

const isBankAccountingCode = (code) => {
  const normalized = normalizeText(code);
  return normalized.startsWith('521') || normalized.startsWith('512');
};

const isTreasuryAccountingCode = (code) => isCashAccountingCode(code) || isBankAccountingCode(code);

const getTreasuryFamilyFromPaymentMethod = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES' ? 'TREASURY_CASH' : 'TREASURY_BANK';

const getTreasuryJournalMeta = (accountOrCode) => {
  const code = typeof accountOrCode === 'string' ? accountOrCode : accountOrCode?.code;
  const isCash = isCashAccountingCode(code);
  return {
    journalCode: isCash ? 'CA' : 'BQ',
    journalLabel: isCash ? 'Journal de caisse' : 'Journal de banque',
    defaultPaymentMethod: isCash ? 'ESPECES' : 'VIREMENT',
  };
};

const findAccountById = async (client, accountId) => {
  if (!accountId) return null;
  const account = await client.accountingAccount.findUnique({
    where: { id: String(accountId) },
  });
  if (!account || account.isActive === false) return null;
  return account;
};

const findAccountByExactCodes = async (client, codes, type) => {
  for (const code of codes) {
    const normalizedCode = normalizeText(code);
    if (!normalizedCode) continue;
    const account = await client.accountingAccount.findFirst({
      where: {
        code: normalizedCode,
        ...(type ? { type } : {}),
        isActive: true,
      },
    });
    if (account) return account;
  }
  return null;
};

const findAccountByPrefixes = async (client, prefixes, type) => {
  for (const prefix of prefixes) {
    const normalizedPrefix = normalizeText(prefix);
    if (!normalizedPrefix) continue;
    const account = await client.accountingAccount.findFirst({
      where: {
        code: {
          startsWith: normalizedPrefix,
        },
        ...(type ? { type } : {}),
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
    if (account) return account;
  }
  return null;
};

const ensureSystemAccount = async (client, spec, user) =>
  client.accountingAccount.upsert({
    where: { code: spec.code },
    update: {
      label: spec.label,
      type: spec.type,
      isSystem: true,
      isActive: true,
    },
    create: {
      code: spec.code,
      label: spec.label,
      type: spec.type,
      isSystem: true,
      isActive: true,
      createdByUserId: user?.userId ? String(user.userId) : null,
      createdByEmail: user?.email || null,
    },
  });

const resolveAccountingAccount = async (
  client,
  family,
  {
    preferredAccountId = null,
    preferredCode = null,
    allowCreate = true,
    strict = true,
    user = null,
  } = {}
) => {
  const rule = FAMILY_RULES[family];
  if (!rule) {
    if (strict) {
      throw new Error(`Famille comptable inconnue: ${family}`);
    }
    return null;
  }

  let account = await findAccountById(client, preferredAccountId);
  if (!account) {
    account = await findAccountByExactCodes(
      client,
      [preferredCode, ...rule.exactCodes].filter(Boolean),
      rule.type
    );
  }
  if (!account) {
    account = await findAccountByPrefixes(client, rule.prefixes, rule.type);
  }
  if (!account && allowCreate && rule.create) {
    account = await ensureSystemAccount(client, rule.create, user);
  }
  if (!account && strict) {
    throw new Error(rule.errorMessage);
  }

  return account;
};

const resolveAccountingReference = async (client, family, options = {}) => {
  const account = await resolveAccountingAccount(client, family, {
    ...options,
    strict: false,
    allowCreate: false,
  });
  if (account) {
    return {
      accountId: account.id,
      code: account.code,
      label: account.label,
    };
  }

  const rule = FAMILY_RULES[family];
  if (!rule?.create) return null;
  return {
    accountId: null,
    code: rule.create.code,
    label: rule.create.label,
  };
};

module.exports = {
  FAMILY_RULES,
  isCashAccountingCode,
  isBankAccountingCode,
  isTreasuryAccountingCode,
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  resolveAccountingAccount,
  resolveAccountingReference,
};
