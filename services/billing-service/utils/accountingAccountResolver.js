const { AccountingAccountType, AccountingFamily } = require('@prisma/client');

const FAMILY_DEFINITIONS = {
  [AccountingFamily.CUSTOMER_RECEIVABLE]: {
    label: 'Compte client',
    description: 'Compte utilise pour les creances clients.',
    type: AccountingAccountType.ASSET,
    errorMessage: 'Aucun compte client n est configuré dans les règles comptables.',
  },
  [AccountingFamily.SUPPLIER_PAYABLE]: {
    label: 'Compte fournisseur',
    description: 'Compte utilise pour les dettes fournisseurs.',
    type: AccountingAccountType.LIABILITY,
    errorMessage: 'Aucun compte fournisseur n est configuré dans les règles comptables.',
  },
  [AccountingFamily.PURCHASE_EXPENSE]: {
    label: 'Compte de charge achat',
    description: 'Compte de charge principal pour les achats et approvisionnements.',
    type: AccountingAccountType.EXPENSE,
    errorMessage: 'Aucun compte de charge achat n est configuré dans les règles comptables.',
  },
  [AccountingFamily.MISC_EXPENSE]: {
    label: 'Compte de charge diverse',
    description: 'Compte de charge pour les autres depenses.',
    type: AccountingAccountType.EXPENSE,
    errorMessage: 'Aucun compte de charge diverse n est configuré dans les règles comptables.',
  },
  [AccountingFamily.REVENUE]: {
    label: 'Compte de produit',
    description: 'Compte de produit principal pour les ventes et prestations.',
    type: AccountingAccountType.REVENUE,
    errorMessage: 'Aucun compte de produit n est configuré dans les règles comptables.',
  },
  [AccountingFamily.TREASURY_BANK]: {
    label: 'Compte de banque',
    description: 'Compte de tresorerie bancaire utilise pour les virements, cheques et cartes.',
    type: AccountingAccountType.ASSET,
    errorMessage: 'Aucun compte bancaire n est configuré dans les règles comptables.',
  },
  [AccountingFamily.TREASURY_CASH]: {
    label: 'Compte de caisse',
    description: 'Compte de caisse utilise pour les paiements en especes.',
    type: AccountingAccountType.ASSET,
    errorMessage: 'Aucun compte de caisse n est configuré dans les règles comptables.',
  },
};

const normalizeText = (value) => String(value || '').trim();

const getAccountIdentity = (accountOrCode) => {
  if (!accountOrCode) {
    return { accountId: null, code: '' };
  }

  if (typeof accountOrCode === 'string') {
    return {
      accountId: null,
      code: normalizeText(accountOrCode),
    };
  }

  return {
    accountId: accountOrCode.id ? String(accountOrCode.id) : null,
    code: normalizeText(accountOrCode.code),
  };
};

const matchesConfiguredFamilyRule = (configuredRule, accountOrCode) => {
  if (!configuredRule) return false;

  const { accountId, code } = getAccountIdentity(accountOrCode);
  if (!accountId && !code) return false;

  if (configuredRule.accountId && accountId && String(configuredRule.accountId) === accountId) {
    return true;
  }

  if (configuredRule.account?.id && accountId && String(configuredRule.account.id) === accountId) {
    return true;
  }

  if (configuredRule.account?.code && code && normalizeText(configuredRule.account.code) === code) {
    return true;
  }

  return false;
};

const pickPreferredRule = (rules = [], accountOrCode) => {
  if (!Array.isArray(rules) || rules.length === 0) return null;

  const explicitMatch = rules.find((rule) => matchesConfiguredFamilyRule(rule, accountOrCode));
  if (explicitMatch) return explicitMatch;

  return rules.find((rule) => rule.isPrimary) || rules[0] || null;
};

const resolveConfiguredTreasuryFamily = async (client, accountOrCode, fallbackFamily = null) => {
  const { accountId, code } = getAccountIdentity(accountOrCode);
  if (!accountId && !code) {
    return fallbackFamily;
  }

  const rules = await loadAccountingFamilyRules(client);
  const cashRules = rules.get(AccountingFamily.TREASURY_CASH) || [];
  if (cashRules.some((rule) => matchesConfiguredFamilyRule(rule, accountOrCode))) {
    return AccountingFamily.TREASURY_CASH;
  }

  const bankRules = rules.get(AccountingFamily.TREASURY_BANK) || [];
  if (bankRules.some((rule) => matchesConfiguredFamilyRule(rule, accountOrCode))) {
    return AccountingFamily.TREASURY_BANK;
  }

  return fallbackFamily;
};

const isCashAccountingCode = async (client, accountOrCode) =>
  (await resolveConfiguredTreasuryFamily(client, accountOrCode)) === AccountingFamily.TREASURY_CASH;

const isBankAccountingCode = async (client, accountOrCode) =>
  (await resolveConfiguredTreasuryFamily(client, accountOrCode)) === AccountingFamily.TREASURY_BANK;

const isTreasuryAccountingCode = async (client, accountOrCode) =>
  Boolean(await resolveConfiguredTreasuryFamily(client, accountOrCode));

const getTreasuryFamilyFromPaymentMethod = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES'
    ? AccountingFamily.TREASURY_CASH
    : AccountingFamily.TREASURY_BANK;

const getTreasuryJournalMeta = async (client, accountOrCode, { fallbackFamily = AccountingFamily.TREASURY_BANK } = {}) => {
  const family = await resolveConfiguredTreasuryFamily(client, accountOrCode, fallbackFamily);
  const isCash = family === AccountingFamily.TREASURY_CASH;
  return {
    journalCode: isCash ? 'CA' : 'BQ',
    journalLabel: isCash ? 'Journal de caisse' : 'Journal de banque',
    defaultPaymentMethod: isCash ? 'ESPECES' : 'VIREMENT',
  };
};

let familyRulesCache = null;
let familyRulesLoadedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

const invalidateAccountingFamilyRulesCache = () => {
  familyRulesCache = null;
  familyRulesLoadedAt = 0;
};

const loadAccountingFamilyRules = async (client, { force = false } = {}) => {
  const cacheExpired = Date.now() - familyRulesLoadedAt > CACHE_TTL_MS;
  if (!force && familyRulesCache && !cacheExpired) {
    return familyRulesCache;
  }

  const rules = await client.accountingFamilyRule.findMany({
    include: {
      account: true,
    },
    orderBy: [{ family: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  familyRulesCache = new Map();
  rules.forEach((rule) => {
    const normalizedRule = {
      ...rule,
      account: rule.account && rule.account.isActive !== false ? rule.account : null,
    };
    const bucket = familyRulesCache.get(rule.family) || [];
    bucket.push(normalizedRule);
    familyRulesCache.set(rule.family, bucket);
  });
  familyRulesLoadedAt = Date.now();
  return familyRulesCache;
};

const findAccountById = async (client, accountId) => {
  if (!accountId) return null;
  const account = await client.accountingAccount.findUnique({
    where: { id: String(accountId) },
  });
  if (!account || account.isActive === false) return null;
  return account;
};

const findAccountByCode = async (client, code, type) => {
  const normalizedCode = normalizeText(code);
  if (!normalizedCode) return null;
  const account = await client.accountingAccount.findFirst({
    where: {
      code: normalizedCode,
      ...(type ? { type } : {}),
      isActive: true,
    },
  });
  return account || null;
};

const resolveAccountingAccount = async (
  client,
  family,
  {
    preferredAccountId = null,
    preferredCode = null,
    strict = true,
  } = {}
) => {
  const definition = FAMILY_DEFINITIONS[family];
  if (!definition) {
    if (strict) {
      throw new Error(`Famille comptable inconnue: ${family}`);
    }
    return null;
  }

  let account = await findAccountById(client, preferredAccountId);
  if (!account) {
    account = await findAccountByCode(client, preferredCode, definition.type);
  }

  if (!account) {
    const rules = await loadAccountingFamilyRules(client);
    const configuredRule = pickPreferredRule(rules.get(family) || [], preferredAccountId || preferredCode || null);
    if (configuredRule?.account) {
      account = configuredRule.account;
    } else if (configuredRule?.accountId) {
      account = await findAccountById(client, configuredRule.accountId);
      if (!account) {
        invalidateAccountingFamilyRulesCache();
      }
    }
  }

  if (!account && strict) {
    throw new Error(definition.errorMessage);
  }

  return account;
};

const resolveAccountingReference = async (client, family, options = {}) => {
  const account = await resolveAccountingAccount(client, family, {
    ...options,
    strict: false,
  });
  if (account) {
    return {
      accountId: account.id,
      code: account.code,
      label: account.label,
    };
  }

  const definition = FAMILY_DEFINITIONS[family];
  if (!definition) return null;
  return {
    accountId: null,
    code: null,
    label: definition.label,
  };
};

module.exports = {
  AccountingFamily,
  FAMILY_DEFINITIONS,
  isCashAccountingCode,
  isBankAccountingCode,
  isTreasuryAccountingCode,
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  loadAccountingFamilyRules,
  invalidateAccountingFamilyRulesCache,
  resolveAccountingAccount,
  resolveAccountingReference,
};
