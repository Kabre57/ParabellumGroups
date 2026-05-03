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

const resolveConfiguredTreasuryFamily = async (client, accountOrCode, fallbackFamily = null, enterpriseId = null) => {
  const { accountId, code } = getAccountIdentity(accountOrCode);
  if (!accountId && !code) {
    return fallbackFamily;
  }

  const rules = await loadAccountingFamilyRules(client, { enterpriseId });
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

const isCashAccountingCode = async (client, accountOrCode, enterpriseId = null) =>
  (await resolveConfiguredTreasuryFamily(client, accountOrCode, null, enterpriseId)) === AccountingFamily.TREASURY_CASH;

const isBankAccountingCode = async (client, accountOrCode, enterpriseId = null) =>
  (await resolveConfiguredTreasuryFamily(client, accountOrCode, null, enterpriseId)) === AccountingFamily.TREASURY_BANK;

const isTreasuryAccountingCode = async (client, accountOrCode, enterpriseId = null) =>
  Boolean(await resolveConfiguredTreasuryFamily(client, accountOrCode, null, enterpriseId));

const getTreasuryFamilyFromPaymentMethod = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES'
    ? AccountingFamily.TREASURY_CASH
    : AccountingFamily.TREASURY_BANK;

const getTreasuryJournalMeta = async (client, accountOrCode, { fallbackFamily = AccountingFamily.TREASURY_BANK, enterpriseId = null } = {}) => {
  const family = await resolveConfiguredTreasuryFamily(client, accountOrCode, fallbackFamily, enterpriseId);
  const isCash = family === AccountingFamily.TREASURY_CASH;
  return {
    journalCode: isCash ? 'CA' : 'BQ',
    journalLabel: isCash ? 'Journal de caisse' : 'Journal de banque',
    defaultPaymentMethod: isCash ? 'ESPECES' : 'VIREMENT',
  };
};

let familyRulesCache = new Map(); // Map<enterpriseId, Map<family, rules[]>>
let familyDefinitionsCache = null;
let familyRulesLoadedAt = new Map(); // Map<enterpriseId, timestamp>
let familyCacheVersions = new Map(); // Map<enterpriseId, version>
const CACHE_TTL_MS = 60 * 1000;

/** Récupère la version de cache en BDD pour une entreprise. */
const fetchDbCacheVersion = async (client, enterpriseId) => {
  const eid = enterpriseId ? Number(enterpriseId) : 1; // 1 par défaut si nul
  try {
    const config = await client.accountingCacheConfig.findUnique({
      where: { enterpriseId: eid }
    });
    return config?.cacheVersion || 1;
  } catch (e) {
    console.error('[Resolver] Error fetching cache version:', e.message);
    return 1;
  }
};

/** Incrémente la version de cache en BDD pour forcer l'invalidation globale. */
const bumpDbCacheVersion = async (client, enterpriseId) => {
  const eid = enterpriseId ? Number(enterpriseId) : 1;
  try {
    await client.accountingCacheConfig.upsert({
      where: { enterpriseId: eid },
      update: { cacheVersion: { increment: 1 } },
      create: { enterpriseId: eid, cacheVersion: 2 }
    });
  } catch (e) {
    console.error('[Resolver] Error bumping cache version:', e.message);
  }
};

const invalidateAccountingFamilyRulesCache = async (client, enterpriseId = null) => {
  if (enterpriseId) {
    const eid = Number(enterpriseId);
    familyRulesCache.delete(eid);
    familyRulesLoadedAt.delete(eid);
    familyCacheVersions.delete(eid);
    if (client) await bumpDbCacheVersion(client, eid);
  } else {
    familyRulesCache.clear();
    familyRulesLoadedAt.clear();
    familyCacheVersions.clear();
    // On ne bump pas tout d'un coup sauf si nécessaire
  }
  familyDefinitionsCache = null;
};

const loadAccountingFamilyDefinitions = async (client, { force = false } = {}) => {
  if (!force && familyDefinitionsCache) {
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
  return familyDefinitionsCache;
};

const loadAccountingFamilyRules = async (client, { enterpriseId = null, force = false } = {}) => {
  const eid = enterpriseId ? Number(enterpriseId) : null;
  const loadedAt = familyRulesLoadedAt.get(eid) || 0;
  const cacheExpired = Date.now() - loadedAt > CACHE_TTL_MS;

  // Check version in DB to see if cache was invalidated elsewhere
  const dbVersion = await fetchDbCacheVersion(client, eid);
  const localVersion = familyCacheVersions.get(eid) || 0;
  const versionMismatch = dbVersion !== localVersion;

  if (!force && familyRulesCache.has(eid) && !cacheExpired && !versionMismatch) {
    // Sliding TTL: refresh timestamp on access
    familyRulesLoadedAt.set(eid, Date.now());
    return familyRulesCache.get(eid);
  }

  const definitions = await loadAccountingFamilyDefinitions(client, { force });
  const rules = await client.accountingFamilyRule.findMany({
    where: eid === null
      ? { enterpriseId: null }
      : {
          OR: [
            { enterpriseId: eid },
            { enterpriseId: null },
          ],
        },
    include: {
      account: true,
      familyDefinition: true,
    },
    orderBy: [{ family: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  const orderedRules = [...rules].sort((left, right) => {
    const leftScopeRank = eid !== null && Number(left.enterpriseId) === eid ? 0 : 1;
    const rightScopeRank = eid !== null && Number(right.enterpriseId) === eid ? 0 : 1;
    if (leftScopeRank !== rightScopeRank) return leftScopeRank - rightScopeRank;
    if (left.family !== right.family) return left.family.localeCompare(right.family);
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });

  const enterpriseRulesMap = new Map();
  orderedRules.forEach((rule) => {
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
    const bucket = enterpriseRulesMap.get(rule.family) || [];
    bucket.push(normalizedRule);
    enterpriseRulesMap.set(rule.family, bucket);
  });
  
  familyRulesCache.set(eid, enterpriseRulesMap);
  familyRulesLoadedAt.set(eid, Date.now());
  familyCacheVersions.set(eid, dbVersion);
  return enterpriseRulesMap;
};

const findAccountById = async (client, accountId, enterpriseId = null, type = null) => {
  if (!accountId) return null;
  const eid = enterpriseId ? Number(enterpriseId) : null;
  const account = await client.accountingAccount.findUnique({
    where: { 
      id: String(accountId),
      // enterpriseId: eid // Optionnel si l'ID est globalement unique (UUID)
    },
  });
  if (!account || account.isActive === false) return null;
  if (eid !== null && account.enterpriseId !== null && account.enterpriseId !== eid) return null;
  if (type && account.type !== type) return null;
  return account;
};

const findAccountByCode = async (client, code, enterpriseId, type) => {
  const normalizedCode = normalizeText(code);
  const eid = enterpriseId ? Number(enterpriseId) : null;
  if (!normalizedCode) return null;

  const scopedAccount = eid === null
    ? null
    : await client.accountingAccount.findFirst({
        where: {
          code: normalizedCode,
          enterpriseId: eid,
          isActive: true,
        },
      });
  if (scopedAccount) {
    if (type && scopedAccount.type !== type) return null;
    return scopedAccount;
  }

  const account = await client.accountingAccount.findFirst({
    where: {
      code: normalizedCode,
      enterpriseId: null,
      isActive: true,
    },
    orderBy: [{ createdAt: 'asc' }],
  });
  if (account && type && account.type !== type) return null;
  return account || null;
};

const resolveAccountingAccount = async (
  client,
  family,
  {
    preferredAccountId = null,
    preferredCode = null,
    strict = true,
    enterpriseId = null,
    withAudit = false,
  } = {}
) => {
  const normalizedFamily = normalizeFamilyCode(family);
  const definitions = await loadAccountingFamilyDefinitions(client);
  const definition = definitions.get(normalizedFamily);
  let audit = { family: normalizedFamily, strategy: null, ruleId: null };

  if (!definition) {
    if (strict) {
      const error = new Error(`Famille comptable inconnue: ${normalizedFamily}`);
      error.statusCode = 400;
      error.code = 'ACCOUNTING_FAMILY_UNKNOWN';
      throw error;
    }
    return withAudit ? { account: null, audit } : null;
  }

  let account = await findAccountById(client, preferredAccountId, enterpriseId, definition.type);
  if (account) {
    audit.strategy = 'PREFERRED_ID';
  } else {
    account = await findAccountByCode(client, preferredCode, enterpriseId, definition.type);
    if (account) audit.strategy = 'PREFERRED_CODE';
  }
  
  if (!account) {
    const rules = await loadAccountingFamilyRules(client, { enterpriseId });
    const configuredRules = rules.get(normalizedFamily) || [];
    const configuredRule = pickPreferredRule(configuredRules, preferredAccountId || preferredCode || null);
    
    if (configuredRule?.account) {
      account = configuredRule.account;
      audit.strategy = 'FAMILY_RULE';
      audit.ruleId = configuredRule.id;
    } else if (configuredRule?.accountId) {
      account = await findAccountById(client, configuredRule.accountId, enterpriseId, definition.type);
      if (account) {
        audit.strategy = 'FAMILY_RULE_DEFERRED';
        audit.ruleId = configuredRule.id;
      } else {
        await invalidateAccountingFamilyRulesCache(client, enterpriseId);
      }
    }
  }

  if (!account && strict) {
    throw accountingConfigurationError(definition.errorMessage, normalizedFamily, definition);
  }

  return withAudit ? { account, audit } : account;
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
