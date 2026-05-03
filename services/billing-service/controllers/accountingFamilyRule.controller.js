const { PrismaClient, AccountingAccountType } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingRulesWriteAccess, serializeAccountingAccount } = require('../utils/accounting');
const {
  FAMILY_DEFINITIONS,
  loadAccountingFamilyRules,
  loadAccountingFamilyDefinitions,
  invalidateAccountingFamilyRulesCache,
  normalizeFamilyCode,
} = require('../utils/accountingAccountResolver');
const {
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const ACCOUNT_TYPES = Object.values(AccountingAccountType);
const SYSTEM_FAMILY_CODES = Object.keys(FAMILY_DEFINITIONS);

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

const getFamilyDefinitions = async (client = prisma) => {
  await ensureDefaultFamilyDefinitions(client);
  return client.accountingFamilyDefinition.findMany({
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
  await loadAccountingFamilyDefinitions(prisma, { force: true });
  await loadAccountingFamilyRules(prisma, { enterpriseId, force: true });
};

const validateFamilyAndAccount = async (family, accountId, enterpriseId = null) => {
  const normalizedFamily = normalizeFamilyCode(family);
  const definition = await prisma.accountingFamilyDefinition.findUnique({
    where: { code: normalizedFamily },
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

  if (enterpriseId !== null && Number(account.enterpriseId) !== Number(enterpriseId)) {
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

exports.getFamilyRules = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.query?.enterpriseId);
    const [definitions, configuredRules] = await Promise.all([
      getFamilyDefinitions(prisma),
      loadAccountingFamilyRules(prisma, { enterpriseId, force: true }),
    ]);

    return res.json({
      success: true,
      data: definitions.map((definition) => serializeFamilyGroup(definition, configuredRules.get(definition.code) || [])),
    });
  } catch (error) {
    console.error('Erreur récupération règles comptables par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la récupération des familles comptables',
    });
  }
};

exports.getFamilyRulesDiagnostic = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.query?.enterpriseId);
    const [definitions, configuredRules] = await Promise.all([
      getFamilyDefinitions(prisma),
      loadAccountingFamilyRules(prisma, { enterpriseId, force: true }),
    ]);
    const diagnostics = definitions.map((definition) =>
      serializeFamilyDiagnostic(definition, configuredRules.get(definition.code) || [])
    );
    const requiredDiagnostics = diagnostics.filter((item) => item.required);
    const missingFamilies = requiredDiagnostics.filter((item) => !item.isConfigured);
    const invalidFamilies = diagnostics.filter((item) => item.invalidRulesCount > 0);

    return res.json({
      success: true,
      data: {
        healthy: missingFamilies.length === 0 && invalidFamilies.length === 0,
        totalFamilies: diagnostics.length,
        configuredFamilies: diagnostics.length - diagnostics.filter((item) => !item.isConfigured).length,
        missingFamilies: missingFamilies.map((item) => item.family),
        invalidFamilies: invalidFamilies.map((item) => item.family),
        families: diagnostics,
      },
    });
  } catch (error) {
    console.error('Erreur diagnostic familles comptables:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors du diagnostic des familles comptables',
    });
  }
};

exports.createFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const code = normalizeFamilyCode(req.body?.code);
    const label = String(req.body?.label || '').trim();
    const displayType = normalizeDisplayType(req.body?.displayType || req.body?.type);
    const accountType = accountTypeFromPayload({ ...req.body, displayType });

    if (!code || !label || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Le code, l intitulé et le type de famille sont obligatoires.',
      });
    }

    const maxSort = await prisma.accountingFamilyDefinition.aggregate({
      _max: { sortOrder: true },
    });

    const created = await prisma.accountingFamilyDefinition.create({
      data: {
        code,
        label,
        description: String(req.body?.description || '').trim() || null,
        displayType,
        accountType,
        isSystem: SYSTEM_FAMILY_CODES.includes(code),
        sortOrder: Number(maxSort._max.sortOrder || 100) + 10,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
    });

    await refreshCache();

    return res.status(201).json({
      success: true,
      message: 'Famille comptable créée',
      data: serializeFamilyGroup(created, []),
    });
  } catch (error) {
    console.error('Erreur création famille comptable:', error.message);
    return res.status(error.code === 'P2002' ? 409 : 500).json({
      success: false,
      message: error.code === 'P2002' ? 'Ce code famille existe déjà' : 'Erreur lors de la création de la famille comptable',
    });
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const code = normalizeFamilyCode(req.params.family);
    const existing = await prisma.accountingFamilyDefinition.findUnique({
      where: { code },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Famille comptable introuvable',
      });
    }

    const nextAccountType =
      req.body?.accountType || req.body?.expectedType || req.body?.displayType || req.body?.type
        ? accountTypeFromPayload(req.body)
        : existing.accountType;

    if (!nextAccountType) {
      return res.status(400).json({
        success: false,
        message: 'Type comptable invalide.',
      });
    }

    if (nextAccountType !== existing.accountType) {
      const incompatibleRule = await prisma.accountingFamilyRule.findFirst({
        where: {
          family: code,
          account: {
            type: { not: nextAccountType },
          },
        },
        include: { account: true },
      });

      if (incompatibleRule) {
        return res.status(400).json({
          success: false,
          message: `Impossible de changer le type: le compte ${incompatibleRule.account.code} est déjà rattaché et incompatible.`,
        });
      }
    }

    const updated = await prisma.accountingFamilyDefinition.update({
      where: { code },
      data: {
        label: req.body?.label !== undefined ? String(req.body.label || '').trim() || existing.label : existing.label,
        description:
          req.body?.description !== undefined
            ? String(req.body.description || '').trim() || null
            : existing.description,
        displayType:
          req.body?.displayType !== undefined || req.body?.type !== undefined
            ? normalizeDisplayType(req.body.displayType || req.body.type, existing.displayType)
            : existing.displayType,
        accountType: nextAccountType,
        sortOrder:
          req.body?.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))
            ? Number(req.body.sortOrder)
            : existing.sortOrder,
        createdByUserId: req.user?.userId ? String(req.user.userId) : existing.createdByUserId,
        createdByEmail: req.user?.email || existing.createdByEmail,
      },
    });

    const configuredRules = await loadAccountingFamilyRules(prisma, { force: true });
    await refreshCache();

    return res.json({
      success: true,
      message: 'Famille comptable mise à jour',
      data: serializeFamilyGroup(updated, configuredRules.get(updated.code) || []),
    });
  } catch (error) {
    console.error('Erreur mise à jour famille comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la famille comptable',
    });
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const code = normalizeFamilyCode(req.params.family);
    const existing = await prisma.accountingFamilyDefinition.findUnique({
      where: { code },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Famille comptable introuvable',
      });
    }

    if (existing.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Une famille système ne peut pas être supprimée.',
      });
    }

    await prisma.accountingFamilyDefinition.delete({
      where: { code },
    });

    await refreshCache();

    return res.json({
      success: true,
      message: 'Famille comptable supprimée',
    });
  } catch (error) {
    console.error('Erreur suppression famille comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la famille comptable',
    });
  }
};

exports.addFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    await ensureDefaultFamilyDefinitions(prisma);
    const enterpriseId = await resolveRuleEnterpriseId(req, req.body?.enterpriseId);
    const validation = await validateFamilyAndAccount(req.params.family, req.body?.accountId, enterpriseId);
    if (validation.error) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message,
      });
    }

    const { family, definition, account } = validation;
    const nextLabel = String(req.body?.label || '').trim() || definition.label;
    const nextDescription =
      typeof req.body?.description === 'undefined'
        ? definition.description || null
        : String(req.body.description || '').trim() || null;

    const requestedPrimary = Boolean(req.body?.isPrimary);

    const createdRule = await prisma.$transaction(async (tx) => {
      const existingFamilyRules = await tx.accountingFamilyRule.findMany({
        where: { family, enterpriseId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });

      const duplicate = existingFamilyRules.find((rule) => rule.accountId === account.id);
      if (duplicate) {
        const error = new Error('Ce compte est déjà rattaché à cette famille');
        error.statusCode = 409;
        throw error;
      }

      const shouldBePrimary = existingFamilyRules.length === 0 || requestedPrimary;

      if (shouldBePrimary) {
        await tx.accountingFamilyRule.updateMany({
          where: { family, enterpriseId },
          data: { isPrimary: false },
        });
      }

      return tx.accountingFamilyRule.create({
        data: {
          family,
          label: nextLabel,
          description: nextDescription,
          accountId: account.id,
          isPrimary: shouldBePrimary,
          enterpriseId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    await refreshCache(enterpriseId);

    return res.status(201).json({
      success: true,
      message: 'Compte ajouté à la famille comptable',
      data: serializeFamilyRuleItem(
        await prisma.accountingFamilyRule.findUnique({
          where: { id: createdRule.id },
          include: { account: true },
        })
      ),
    });
  } catch (error) {
    console.error('Erreur ajout règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de l ajout de la règle comptable',
    });
  }
};

exports.updateFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const existingRule = await prisma.accountingFamilyRule.findUnique({
      where: { id: String(req.params.ruleId) },
      include: { account: true },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Règle comptable introuvable',
      });
    }

    await assertEnterpriseInScope(
      req,
      existingRule.enterpriseId,
      "Vous n'avez pas acces a cette règle comptable."
    );

    const nextLabel = String(req.body?.label || '').trim() || existingRule.label;
    const nextDescription =
      typeof req.body?.description === 'undefined'
        ? existingRule.description || null
        : String(req.body.description || '').trim() || null;
    const nextIsPrimary = req.body?.isPrimary === true;
    const shouldPromotePrimary = nextIsPrimary && !existingRule.isPrimary;

    const updatedRule = await prisma.$transaction(async (tx) => {
      if (shouldPromotePrimary) {
        await tx.accountingFamilyRule.updateMany({
          where: {
            family: existingRule.family,
            enterpriseId: existingRule.enterpriseId,
            id: { not: existingRule.id },
          },
          data: { isPrimary: false },
        });
      }

      return tx.accountingFamilyRule.update({
        where: { id: existingRule.id },
        data: {
          label: nextLabel,
          description: nextDescription,
          isPrimary: shouldPromotePrimary ? true : existingRule.isPrimary,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    await refreshCache(existingRule.enterpriseId);

    return res.json({
      success: true,
      message: 'Règle comptable mise à jour',
      data: serializeFamilyRuleItem(updatedRule),
    });
  } catch (error) {
    console.error('Erreur mise à jour règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la mise à jour de la règle comptable',
    });
  }
};

exports.deleteFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const existingRule = await prisma.accountingFamilyRule.findUnique({
      where: { id: String(req.params.ruleId) },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Règle comptable introuvable',
      });
    }

    await assertEnterpriseInScope(
      req,
      existingRule.enterpriseId,
      "Vous n'avez pas acces a cette règle comptable."
    );

    await prisma.$transaction(async (tx) => {
      await tx.accountingFamilyRule.delete({
        where: { id: existingRule.id },
      });

      if (existingRule.isPrimary) {
        const nextRule = await tx.accountingFamilyRule.findFirst({
          where: {
            family: existingRule.family,
            enterpriseId: existingRule.enterpriseId,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        if (nextRule) {
          await tx.accountingFamilyRule.updateMany({
            where: {
              family: existingRule.family,
              enterpriseId: existingRule.enterpriseId,
            },
            data: { isPrimary: false },
          });
          await tx.accountingFamilyRule.update({
            where: { id: nextRule.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    await refreshCache(existingRule.enterpriseId);

    return res.json({
      success: true,
      message: 'Compte retiré de la famille comptable',
    });
  } catch (error) {
    console.error('Erreur suppression règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la suppression de la règle comptable',
    });
  }
};
