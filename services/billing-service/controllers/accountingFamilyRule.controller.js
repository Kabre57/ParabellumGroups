const { PrismaClient, AccountingFamily } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingWriteAccess, serializeAccountingAccount } = require('../utils/accounting');
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

exports.addFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(
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

    const existingFamilyRules = await prisma.accountingFamilyRule.findMany({
      where: { family },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const duplicate = existingFamilyRules.find((rule) => rule.accountId === account.id);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Ce compte est déjà rattaché à cette famille',
      });
    }

    const createdRule = await prisma.$transaction(async (tx) => {
      return tx.accountingFamilyRule.create({
        data: {
          family,
          label: nextLabel,
          description: nextDescription,
          accountId: account.id,
          isPrimary: existingFamilyRules.length === 0 || Boolean(req.body?.isPrimary),
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    if (createdRule.isPrimary) {
      await prisma.accountingFamilyRule.updateMany({
        where: {
          family,
          id: { not: createdRule.id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

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
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l ajout de la règle comptable',
    });
  }
};

exports.updateFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(
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

    const updatedRule = await prisma.$transaction(async (tx) => {
      if (nextIsPrimary) {
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
          isPrimary: nextIsPrimary ? true : existingRule.isPrimary,
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
    const accessError = ensureAccountingWriteAccess(
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
          orderBy: { createdAt: 'asc' },
        });
        if (nextRule) {
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
