// Fonctions et dépendances communes aux familles et règles comptables.
const { PrismaClient, AccountingAccountType } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingRulesWriteAccess, serializeAccountingAccount } = require('../../utils/accounting');
const {
  FAMILY_DEFINITIONS,
  loadAccountingFamilyRules,
  loadAccountingFamilyDefinitions,
  invalidateAccountingFamilyRulesCache,
  normalizeFamilyCode,
} = require('../../utils/accountingAccountResolver');
const {
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../../utils/enterpriseScope');
const { isAccountAllowedForFamilyScope } = require('../../utils/accountingScope');

const prisma = new PrismaClient();

const ACCOUNT_TYPES = Object.values(AccountingAccountType);

const removeAccents = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeDisplayType = (value, fallback = 'Autre') => String(value || fallback).trim();

const accountTypeFromPayload = (payload = {}) => {
  const explicitType = String(payload.accountType || payload.expectedType || '').trim().toUpperCase();
  if (ACCOUNT_TYPES.includes(explicitType)) {
    return explicitType;
  }

  const normalizedDisplayType = removeAccents(payload.displayType || payload.type).trim().toLowerCase();
  if (['charge', 'charges', 'depense', 'depenses'].includes(normalizedDisplayType)) {
    return AccountingAccountType.EXPENSE;
  }
  if (['produit', 'produits', 'vente', 'ventes', 'revenu', 'revenus'].includes(normalizedDisplayType)) {
    return AccountingAccountType.REVENUE;
  }
  if (['dette', 'dettes', 'passif', 'fournisseur', 'fournisseurs'].includes(normalizedDisplayType)) {
    return AccountingAccountType.LIABILITY;
  }
  if (['capital', 'capitaux', 'fonds propres'].includes(normalizedDisplayType)) {
    return AccountingAccountType.EQUITY;
  }
  if (['tresorerie', 'banque', 'caisse', 'creance', 'creances', 'actif'].includes(normalizedDisplayType)) {
    return AccountingAccountType.ASSET;
  }

  return null;
};

const defaultFamilyDefinitionRows = () =>
  Object.values(FAMILY_DEFINITIONS).map((definition) => ({
    id: `family_${definition.code.toLowerCase()}`,
    code: definition.code,
    label: definition.label,
    description: definition.description || null,
    displayType: definition.displayType || definition.accountType,
    accountType: definition.accountType || definition.type,
    isSystem: true,
    sortOrder: definition.sortOrder || 100,
  }));

const ensureDefaultFamilyDefinitions = async (client = prisma) => {
  await client.accountingFamilyDefinition.createMany({
    data: defaultFamilyDefinitionRows(),
    skipDuplicates: true,
  });
};

const getFamilyDefinitions = async (client = prisma, enterpriseId = null) => {
  await ensureDefaultFamilyDefinitions(client);
  return client.accountingFamilyDefinition.findMany({
    where: enterpriseId === null
      ? { enterpriseId: null }
      : {
          OR: [
            { enterpriseId },
            { enterpriseId: null, isSystem: true },
          ],
        },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });
};

const serializeFamilyRuleItem = (rule) => ({
  id: rule.id,
  family: rule.family,
  label: rule.label,
  description: rule.description || null,
  accountId: rule.accountId,
  account: rule.account ? serializeAccountingAccount(rule.account) : null,
  isPrimary: Boolean(rule.isPrimary),
  enterpriseId: rule.enterpriseId ?? null,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const serializeFamilyGroup = (definition, rules = []) => {
  const serializedRules = rules.map(serializeFamilyRuleItem);
  const primaryRule = serializedRules.find((rule) => rule.isPrimary) || serializedRules[0] || null;

  return {
    family: definition.code,
    code: definition.code,
    label: definition.label,
    description: definition.description || null,
    type: definition.displayType,
    displayType: definition.displayType,
    expectedType: definition.accountType,
    accountType: definition.accountType,
    isSystem: Boolean(definition.isSystem),
    enterpriseId: definition.enterpriseId ?? null,
    sortOrder: definition.sortOrder,
    primaryAccountId: primaryRule?.accountId || null,
    primaryAccount: primaryRule?.account || null,
    rules: serializedRules,
  };
};

const serializeFamilyDiagnostic = (definition, rules = []) => {
  const usableRules = rules.filter((rule) => rule.account);
  const primaryRule = usableRules.find((rule) => rule.isPrimary) || usableRules[0] || null;
  const invalidRuleCount = rules.length - usableRules.length;
  const issues = [];

  if (!primaryRule && definition.isSystem) {
    issues.push('Aucun compte actif compatible n est rattache a cette famille.');
  }

  if (invalidRuleCount > 0) {
    issues.push(`${invalidRuleCount} rattachement(s) pointe(nt) vers un compte inactif ou incompatible.`);
  }

  return {
    family: definition.code,
    code: definition.code,
    label: definition.label,
    type: definition.displayType,
    expectedType: definition.accountType,
    required: Boolean(definition.isSystem),
    isConfigured: Boolean(primaryRule),
    primaryAccountId: primaryRule?.accountId || null,
    primaryAccount: primaryRule?.account ? serializeAccountingAccount(primaryRule.account) : null,
    rulesCount: rules.length,
    usableRulesCount: usableRules.length,
    invalidRulesCount: invalidRuleCount,
    issues,
  };
};

const resolveRuleEnterpriseId = async (req, requestedEnterpriseId = req.body?.enterpriseId ?? req.query?.enterpriseId) => {
  const context = await resolveEnterpriseContext(req, requestedEnterpriseId);
  return context.enterpriseId;
};

const refreshCache = async (enterpriseId = null) => {
  await invalidateAccountingFamilyRulesCache(prisma, enterpriseId);
  await loadAccountingFamilyDefinitions(prisma, { enterpriseId, force: true });
  await loadAccountingFamilyRules(prisma, { enterpriseId, force: true });
};

const validateFamilyAndAccount = async (family, accountId, enterpriseId = null) => {
  const normalizedFamily = normalizeFamilyCode(family);
  const definition = await prisma.accountingFamilyDefinition.findFirst({
    where: enterpriseId === null
      ? { code: normalizedFamily, enterpriseId: null }
      : {
          code: normalizedFamily,
          OR: [
            { enterpriseId },
            { enterpriseId: null, isSystem: true },
          ],
        },
    orderBy: { enterpriseId: 'desc' },
  });

  if (!definition) {
    return { error: { status: 400, message: 'Famille comptable inconnue' } };
  }

  const normalizedAccountId = String(accountId || '').trim();
  if (!normalizedAccountId) {
    return { error: { status: 400, message: 'Le compte comptable cible est obligatoire' } };
  }

  const account = await prisma.accountingAccount.findUnique({
    where: { id: normalizedAccountId },
  });

  if (!account || account.isActive === false) {
    return { error: { status: 404, message: 'Compte comptable introuvable ou inactif' } };
  }

  if (!isAccountAllowedForFamilyScope(account.enterpriseId, enterpriseId)) {
    return {
      error: {
        status: 400,
        message: 'Ce compte comptable n appartient pas a l entreprise selectionnee.',
      },
    };
  }

  if (definition.accountType && account.type !== definition.accountType) {
    return {
      error: {
        status: 400,
        message: `Le compte ${account.code} n est pas compatible avec cette famille comptable. Type attendu: ${definition.accountType}.`,
      },
    };
  }

  return {
    family: normalizedFamily,
    definition,
    account,
  };
};

module.exports = { PrismaClient, AccountingAccountType, ensureAccountingReadAccess, ensureAccountingRulesWriteAccess, serializeAccountingAccount, FAMILY_DEFINITIONS, loadAccountingFamilyRules, loadAccountingFamilyDefinitions, invalidateAccountingFamilyRulesCache, normalizeFamilyCode, assertEnterpriseInScope, resolveEnterpriseContext, isAccountAllowedForFamilyScope, prisma, ACCOUNT_TYPES, removeAccents, normalizeDisplayType, accountTypeFromPayload, defaultFamilyDefinitionRows, ensureDefaultFamilyDefinitions, getFamilyDefinitions, serializeFamilyRuleItem, serializeFamilyGroup, serializeFamilyDiagnostic, resolveRuleEnterpriseId, refreshCache, validateFamilyAndAccount };
