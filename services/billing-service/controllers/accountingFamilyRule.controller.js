const { PrismaClient, AccountingFamily } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingWriteAccess, serializeAccountingAccount } = require('../utils/accounting');
const {
  FAMILY_DEFINITIONS,
  loadAccountingFamilyRules,
  invalidateAccountingFamilyRulesCache,
} = require('../utils/accountingAccountResolver');

const prisma = new PrismaClient();

const serializeFamilyRule = (rule) => ({
  id: rule.id,
  family: rule.family,
  label: rule.label,
  description: rule.description || null,
  accountId: rule.accountId,
  account: rule.account ? serializeAccountingAccount(rule.account) : null,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

exports.getFamilyRules = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const configuredRules = await loadAccountingFamilyRules(prisma, { force: true });
    const rules = Object.values(AccountingFamily).map((family) => {
      const definition = FAMILY_DEFINITIONS[family];
      const configuredRule = configuredRules.get(family);

      if (!configuredRule) {
        return {
          id: null,
          family,
          label: definition.label,
          description: definition.description || null,
          accountId: null,
          account: null,
          createdAt: null,
          updatedAt: null,
        };
      }

      return serializeFamilyRule(configuredRule);
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

exports.upsertFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { family } = req.params;
    const normalizedFamily = String(family || '').trim().toUpperCase();
    const definition = FAMILY_DEFINITIONS[normalizedFamily];
    if (!definition || !Object.values(AccountingFamily).includes(normalizedFamily)) {
      return res.status(400).json({
        success: false,
        message: 'Famille comptable inconnue',
      });
    }

    const accountId = String(req.body?.accountId || '').trim();
    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Le compte comptable cible est obligatoire',
      });
    }

    const account = await prisma.accountingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Compte comptable introuvable ou inactif',
      });
    }

    if (account.type !== definition.type) {
      return res.status(400).json({
        success: false,
        message: `Le compte sélectionné doit être de type ${String(definition.type).toLowerCase()}`,
      });
    }

    const nextLabel = String(req.body?.label || '').trim() || definition.label;
    const nextDescription =
      typeof req.body?.description === 'undefined'
        ? definition.description || null
        : String(req.body.description || '').trim() || null;

    const updatedRule = await prisma.accountingFamilyRule.upsert({
      where: { family: normalizedFamily },
      update: {
        label: nextLabel,
        description: nextDescription,
        accountId: account.id,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
      create: {
        family: normalizedFamily,
        label: nextLabel,
        description: nextDescription,
        accountId: account.id,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
      include: { account: true },
    });

    invalidateAccountingFamilyRulesCache();
    await loadAccountingFamilyRules(prisma, { force: true });

    return res.json({
      success: true,
      message: 'Règle comptable mise à jour',
      data: serializeFamilyRule(updatedRule),
    });
  } catch (error) {
    console.error('Erreur mise à jour règle comptable par famille:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la règle comptable',
    });
  }
};
