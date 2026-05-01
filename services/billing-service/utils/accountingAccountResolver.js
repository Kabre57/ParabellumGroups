const { AccountingAccountType } = require('@prisma/client');

const AccountingFamily = {
  CUSTOMER_RECEIVABLE: 'CUSTOMER_RECEIVABLE',
  SUPPLIER_PAYABLE: 'SUPPLIER_PAYABLE',
  PURCHASE_EXPENSE: 'PURCHASE_EXPENSE',
  MISC_EXPENSE: 'MISC_EXPENSE',
  REVENUE: 'REVENUE',
  TREASURY_BANK: 'TREASURY_BANK',
  TREASURY_CASH: 'TREASURY_CASH',
};

const FAMILY_DEFINITIONS = {
  CUSTOMER_RECEIVABLE: {
    code: AccountingFamily.CUSTOMER_RECEIVABLE,
    label: 'Compte client',
    description: 'Compte utilise pour les creances clients.',
    displayType: 'Créance',
    type: AccountingAccountType.ASSET,
    accountType: AccountingAccountType.ASSET,
    isSystem: true,
    sortOrder: 10,
    errorMessage: 'Aucun compte client n est configuré dans les règles comptables.',
  },
  SUPPLIER_PAYABLE: {
    code: AccountingFamily.SUPPLIER_PAYABLE,
    label: 'Compte fournisseur',
    description: 'Compte utilise pour les dettes fournisseurs.',
    displayType: 'Dette',
    type: AccountingAccountType.LIABILITY,
    accountType: AccountingAccountType.LIABILITY,
    isSystem: true,
    sortOrder: 20,
    errorMessage: 'Aucun compte fournisseur n est configuré dans les règles comptables.',
  },
  PURCHASE_EXPENSE: {
    code: AccountingFamily.PURCHASE_EXPENSE,
    label: 'Compte de charge achat',
    description: 'Compte de charge principal pour les achats et approvisionnements.',
    displayType: 'Charge',
    type: AccountingAccountType.EXPENSE,
    accountType: AccountingAccountType.EXPENSE,
    isSystem: true,
    sortOrder: 30,
    errorMessage: 'Aucun compte de charge achat n est configuré dans les règles comptables.',
  },
  MISC_EXPENSE: {
    code: AccountingFamily.MISC_EXPENSE,
    label: 'Compte de charge diverse',
    description: 'Compte de charge pour les autres depenses.',
    displayType: 'Charge',
    type: AccountingAccountType.EXPENSE,
    accountType: AccountingAccountType.EXPENSE,
    isSystem: true,
    sortOrder: 40,
    errorMessage: 'Aucun compte de charge diverse n est configuré dans les règles comptables.',
  },
  REVENUE: {
    code: AccountingFamily.REVENUE,
    label: 'Compte de produit',
    description: 'Compte de produit principal pour les ventes et prestations.',
    displayType: 'Produit',
    type: AccountingAccountType.REVENUE,
    accountType: AccountingAccountType.REVENUE,
    isSystem: true,
    sortOrder: 50,
    errorMessage: 'Aucun compte de produit n est configuré dans les règles comptables.',
  },
  TREASURY_BANK: {
    code: AccountingFamily.TREASURY_BANK,
    label: 'Compte de banque',
    description: 'Compte de tresorerie bancaire utilise pour les virements, cheques et cartes.',
    displayType: 'Trésorerie',
    type: AccountingAccountType.ASSET,
    accountType: AccountingAccountType.ASSET,
    isSystem: true,
    sortOrder: 60,
    errorMessage: 'Aucun compte bancaire n est configuré dans les règles comptables.',
  },
  TREASURY_CASH: {
    code: AccountingFamily.TREASURY_CASH,
    label: 'Compte de caisse',
    description: 'Compte de caisse utilise pour les paiements en especes.',
    displayType: 'Trésorerie',
    type: AccountingAccountType.ASSET,
    accountType: AccountingAccountType.ASSET,
    isSystem: true,
    sortOrder: 70,
    errorMessage: 'Aucun compte de caisse n est configuré dans les règles comptables.',
  },
};

const normalizeText = (value) => String(value || '').trim();
const normalizeFamilyCode = (value) => normalizeText(value).toUpperCase().replace(/[^A-Z0-9_]/g, '_');

const normalizeFamilyDefinition = (code, definition = {}) => {
  const normalizedCode = normalizeFamilyCode(code || definition.code);
  const defaultDefinition = FAMILY_DEFINITIONS[normalizedCode] || {};
  const accountType = definition.accountType || definition.type || defaultDefinition.accountType || defaultDefinition.type;

  return {
    ...defaultDefinition,
    ...definition,
    code: normalizedCode,
    label: definition.label || defaultDefinition.label || normalizedCode,
    description:
      typeof definition.description === 'undefined'
        ? defaultDefinition.description || null
        : definition.description || null,
    displayType: definition.displayType || defaultDefinition.displayType || accountType || 'Autre',
    accountType,
    type: accountType,
    isSystem: Boolean(definition.isSystem ?? defaultDefinition.isSystem),
    sortOrder: Number.isFinite(Number(definition.sortOrder ?? defaultDefinition.sortOrder))
      ? Number(definition.sortOrder ?? defaultDefinition.sortOrder)
      : 100,
    errorMessage:
      definition.errorMessage ||
      defaultDefinition.errorMessage ||
      `Aucun compte n est configuré pour la famille comptable ${normalizedCode}.`,
  };
};

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

const accountingConfigurationError = (message, family, definition) => {
  const error = new Error(message);
  error.statusCode = 422;
  error.code = 'ACCOUNTING_FAMILY_NOT_CONFIGURED';
  error.family = family || null;
  error.expectedType = definition?.type || null;
  return error;
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
let familyDefinitionsCache = null;
let familyRulesLoadedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

const invalidateAccountingFamilyRulesCache = () => {
  familyRulesCache = null;
  familyDefinitionsCache = null;
  familyRulesLoadedAt = 0;
};

const loadAccountingFamilyDefinitions = async (client, { force = false } = {}) => {
  const cacheExpired = Date.now() - familyRulesLoadedAt > CACHE_TTL_MS;
  if (!force && familyDefinitionsCache && !cacheExpired) {
    return familyDefinitionsCache;
  }

  const definitions = new Map(
    Object.entries(FAMILY_DEFINITIONS).map(([code, definition]) => [
      code,
      normalizeFamilyDefinition(code, definition),
    ])
  );

  if (client.accountingFamilyDefinition) {
    const storedDefinitions = await client.accountingFamilyDefinition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    storedDefinitions.forEach((definition) => {
      definitions.set(
        definition.code,
        normalizeFamilyDefinition(definition.code, {
          label: definition.label,
          description: definition.description,
          displayType: definition.displayType,
          accountType: definition.accountType,
          isSystem: definition.isSystem,
          sortOrder: definition.sortOrder,
        })
      );
    });
  }

  familyDefinitionsCache = definitions;
  familyRulesLoadedAt = Date.now();
  return familyDefinitionsCache;
};

const loadAccountingFamilyRules = async (client, { force = false } = {}) => {
  const cacheExpired = Date.now() - familyRulesLoadedAt > CACHE_TTL_MS;
  if (!force && familyRulesCache && !cacheExpired) {
    return familyRulesCache;
  }

  const definitions = await loadAccountingFamilyDefinitions(client, { force });
  const rules = await client.accountingFamilyRule.findMany({
    include: {
      account: true,
      familyDefinition: true,
    },
    orderBy: [{ family: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  familyRulesCache = new Map();
  rules.forEach((rule) => {
    const definition =
      definitions.get(rule.family) ||
      normalizeFamilyDefinition(rule.family, {
        label: rule.familyDefinition?.label,
        description: rule.familyDefinition?.description,
        displayType: rule.familyDefinition?.displayType,
        accountType: rule.familyDefinition?.accountType,
        isSystem: rule.familyDefinition?.isSystem,
        sortOrder: rule.familyDefinition?.sortOrder,
      });
    const isUsableAccount =
      rule.account &&
      rule.account.isActive !== false &&
      (!definition?.type || rule.account.type === definition.type);
    const normalizedRule = {
      ...rule,
      account: isUsableAccount ? rule.account : null,
    };
    const bucket = familyRulesCache.get(rule.family) || [];
    bucket.push(normalizedRule);
    familyRulesCache.set(rule.family, bucket);
  });
  familyRulesLoadedAt = Date.now();
  return familyRulesCache;
};

const findAccountById = async (client, accountId, type = null) => {
  if (!accountId) return null;
  const account = await client.accountingAccount.findUnique({
    where: { id: String(accountId) },
  });
  if (!account || account.isActive === false) return null;
  if (type && account.type !== type) return null;
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
  const normalizedFamily = normalizeFamilyCode(family);
  const definitions = await loadAccountingFamilyDefinitions(client);
  const definition = definitions.get(normalizedFamily);
  if (!definition) {
    if (strict) {
      const error = new Error(`Famille comptable inconnue: ${normalizedFamily}`);
      error.statusCode = 400;
      error.code = 'ACCOUNTING_FAMILY_UNKNOWN';
      throw error;
    }
    return null;
  }

  let account = await findAccountById(client, preferredAccountId, definition.type);
  if (!account) {
    account = await findAccountByCode(client, preferredCode, definition.type);
  }

  if (!account) {
    const rules = await loadAccountingFamilyRules(client);
    const configuredRule = pickPreferredRule(rules.get(normalizedFamily) || [], preferredAccountId || preferredCode || null);
    if (configuredRule?.account) {
      account = configuredRule.account;
    } else if (configuredRule?.accountId) {
      account = await findAccountById(client, configuredRule.accountId, definition.type);
      if (!account) {
        invalidateAccountingFamilyRulesCache();
      }
    }
  }

  if (!account && strict) {
    throw accountingConfigurationError(definition.errorMessage, normalizedFamily, definition);
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

  const definitions = await loadAccountingFamilyDefinitions(client);
  const definition = definitions.get(normalizeFamilyCode(family));
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
  normalizeFamilyCode,
  loadAccountingFamilyRules,
  loadAccountingFamilyDefinitions,
  invalidateAccountingFamilyRulesCache,
  resolveAccountingAccount,
  resolveAccountingReference,
};
