const {
  AccountingFamily,
  FAMILY_DEFINITIONS,
  normalizeText,
  normalizeFamilyCode,
  getAccountIdentity,
  matchesConfiguredFamilyRule,
  accountingConfigurationError,
  pickPreferredRule,
  loadAccountingFamilyDefinitions,
  loadAccountingFamilyRules,
  invalidateAccountingFamilyRulesCache,
} = require('./accountingFamilyResolver.cache');

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
  const definitions = await loadAccountingFamilyDefinitions(client, { enterpriseId });
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

  const definitions = await loadAccountingFamilyDefinitions(client, { enterpriseId: options.enterpriseId });
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
