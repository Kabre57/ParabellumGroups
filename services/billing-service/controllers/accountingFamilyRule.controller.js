const { PrismaClient, AccountingFamily } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingRulesWriteAccess, serializeAccountingAccount } = require('../utils/accounting');
const {
  FAMILY_DEFINITIONS,
  loadAccountingFamilyRules,
  invalidateAccountingFamilyRulesCache,
} = require('../utils/accountingAccountResolver');

const prisma = new PrismaClient();

const serializeFamilyRuleItem = (rule) => ({
  id: rule.id,
  family: rule.family,
  label: rule.label,
  description: rule.description || null,
  accountId: rule.accountId,
  account: rule.account ? serializeAccountingAccount(rule.account) : null,
  isPrimary: Boolean(rule.isPrimary),
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const serializeFamilyGroup = (family, rules = []) => {
  const definition = FAMILY_DEFINITIONS[family];
  const serializedRules = rules.map(serializeFamilyRuleItem);
  const primaryRule = serializedRules.find((rule) => rule.isPrimary) || serializedRules[0] || null;

  return {
    family,
    label: definition.label,
    description: definition.description || null,
    primaryAccountId: primaryRule?.accountId || null,
    primaryAccount: primaryRule?.account || null,
    rules: serializedRules,
  };
};

const serializeFamilyDiagnostic = (family, rules = []) => {
  const definition = FAMILY_DEFINITIONS[family];
  const usableRules = rules.filter((rule) => rule.account);
  const primaryRule = usableRules.find((rule) => rule.isPrimary) || usableRules[0] || null;
  const invalidRuleCount = rules.length - usableRules.length;
  const issues = [];

  if (!primaryRule) {
    issues.push('Aucun compte actif compatible n est rattache a cette famille.');
  }

  if (invalidRuleCount > 0) {
    issues.push(`${invalidRuleCount} rattachement(s) pointe(nt) vers un compte inactif ou incompatible.`);
  }

  return {
    family,
    label: definition.label,
    expectedType: definition.type,
    required: true,
    isConfigured: Boolean(primaryRule),
    primaryAccountId: primaryRule?.accountId || null,
    primaryAccount: primaryRule?.account ? serializeAccountingAccount(primaryRule.account) : null,
    rulesCount: rules.length,
    usableRulesCount: usableRules.length,
    invalidRulesCount: invalidRuleCount,
    issues,
  };
};

const refreshCache = async () => {
  invalidateAccountingFamilyRulesCache();
  await loadAccountingFamilyRules(prisma, { force: true });
};

const validateFamilyAndAccount = async (family, accountId) => {
  const normalizedFamily = String(family || '').trim().toUpperCase();
  const definition = FAMILY_DEFINITIONS[normalizedFamily];
  if (!definition || !Object.values(AccountingFamily).includes(normalizedFamily)) {
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

  if (definition.type && account.type !== definition.type) {
    return {
      error: {
        status: 400,
        message: `Le compte ${account.code} n est pas compatible avec cette famille comptable. Type attendu: ${definition.type}.`,
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

    const configuredRules = await loadAccountingFamilyRules(prisma, { force: true });
    const rules = Object.values(AccountingFamily).map((family) => {
      const familyRules = configuredRules.get(family) || [];
      return serializeFamilyGroup(family, familyRules);
    });

    return res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Erreur récupération règles comptables par famille:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des familles comptables',
    });
  }
};

exports.getFamilyRulesDiagnostic = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const configuredRules = await loadAccountingFamilyRules(prisma, { force: true });
    const diagnostics = Object.values(AccountingFamily).map((family) =>
      serializeFamilyDiagnostic(family, configuredRules.get(family) || [])
    );
    const missingFamilies = diagnostics.filter((item) => !item.isConfigured);
    const invalidFamilies = diagnostics.filter((item) => item.invalidRulesCount > 0);

    return res.json({
      success: true,
      data: {
        healthy: missingFamilies.length === 0 && invalidFamilies.length === 0,
        totalFamilies: diagnostics.length,
        configuredFamilies: diagnostics.length - missingFamilies.length,
        missingFamilies: missingFamilies.map((item) => item.family),
        invalidFamilies: invalidFamilies.map((item) => item.family),
        families: diagnostics,
      },
    });
  } catch (error) {
    console.error('Erreur diagnostic familles comptables:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du diagnostic des familles comptables',
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

    const validation = await validateFamilyAndAccount(req.params.family, req.body?.accountId);
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
        where: { family },
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
          where: { family },
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
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    await refreshCache();

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

    await refreshCache();

    return res.json({
      success: true,
      message: 'Règle comptable mise à jour',
      data: serializeFamilyRuleItem(updatedRule),
    });
  } catch (error) {
    console.error('Erreur mise à jour règle comptable par famille:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la règle comptable',
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

    await prisma.$transaction(async (tx) => {
      await tx.accountingFamilyRule.delete({
        where: { id: existingRule.id },
      });

      if (existingRule.isPrimary) {
        const nextRule = await tx.accountingFamilyRule.findFirst({
          where: { family: existingRule.family },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        if (nextRule) {
          await tx.accountingFamilyRule.updateMany({
            where: { family: existingRule.family },
            data: { isPrimary: false },
          });
          await tx.accountingFamilyRule.update({
            where: { id: nextRule.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    await refreshCache();

    return res.json({
      success: true,
      message: 'Compte retiré de la famille comptable',
    });
  } catch (error) {
    console.error('Erreur suppression règle comptable par famille:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la règle comptable',
    });
  }
};
