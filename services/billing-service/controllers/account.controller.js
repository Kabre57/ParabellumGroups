const { PrismaClient } = require('@prisma/client');
const {
  amount,
  accountTypeFromInput,
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
  ensureDefaultAccounts,
  getDynamicAccountTemplate,
  serializeAccountingAccount,
} = require('../utils/accounting');

const prisma = new PrismaClient();

exports.getAllAccounts = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    await ensureDefaultAccounts(prisma, req.user);

    const accounts = await prisma.accountingAccount.findMany({
      where: { isActive: true },
      orderBy: [{ code: 'asc' }],
    });

    return res.json({
      success: true,
      data: accounts.map(serializeAccountingAccount),
    });
  } catch (error) {
    console.error('Erreur récupération plan comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du plan comptable',
    });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { code, label, type, description, openingBalance } = req.body;
    const normalizedCode = String(code || '').trim();
    const normalizedLabel = String(label || '').trim();
    const normalizedType = accountTypeFromInput(type);

    if (!normalizedCode || !normalizedLabel || !normalizedType) {
      return res.status(400).json({
        success: false,
        message: 'Le code, le libellé et le type du compte sont obligatoires',
      });
    }

    const existing = await prisma.accountingAccount.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec ce code existe déjà',
      });
    }

    const initialBalance = amount(openingBalance);
    const dynamicTemplate = getDynamicAccountTemplate(normalizedCode);

    const account = await prisma.accountingAccount.create({
      data: {
        code: normalizedCode,
        label: normalizedLabel,
        type: normalizedType,
        description: description ? String(description).trim() : null,
        openingBalance: initialBalance,
        currentBalance: initialBalance,
        isDynamic: Boolean(dynamicTemplate),
        formula: dynamicTemplate?.formula || null,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeAccountingAccount(account),
      message: dynamicTemplate
        ? 'Compte comptable créé avec succès. Les calculs automatiques ont été activés pour ce code.'
        : 'Compte comptable créé avec succès',
    });
  } catch (error) {
    console.error('Erreur création compte comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte comptable',
    });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de modifier un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const { code, label, type, description, openingBalance, isActive } = req.body;

    const account = await prisma.accountingAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte comptable introuvable',
      });
    }

    const data = {};
    if (code) {
      const normalizedCode = String(code).trim();
      if (normalizedCode && normalizedCode !== account.code) {
        const existing = await prisma.accountingAccount.findUnique({
          where: { code: normalizedCode },
          select: { id: true },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Un compte avec ce code existe déjà',
          });
        }
        data.code = normalizedCode;
      }
    }

    if (label) {
      data.label = String(label).trim();
    }

    if (typeof description !== 'undefined') {
      data.description = description ? String(description).trim() : null;
    }

    const normalizedType = accountTypeFromInput(type);
    if (normalizedType) {
      data.type = normalizedType;
    }

    if (typeof openingBalance !== 'undefined') {
      const normalizedOpening = amount(openingBalance);
      data.openingBalance = normalizedOpening;
      data.currentBalance = normalizedOpening;
    }

    if (typeof isActive !== 'undefined') {
      data.isActive = Boolean(isActive);
    }

    const nextCode = data.code || account.code;
    const dynamicTemplate = getDynamicAccountTemplate(nextCode);

    if (dynamicTemplate) {
      data.isDynamic = true;
      data.formula = dynamicTemplate.formula;
    } else if (data.code && account.isDynamic) {
      data.isDynamic = false;
      data.formula = null;
    }

    const updated = await prisma.accountingAccount.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: serializeAccountingAccount(updated),
      message: 'Compte comptable mis à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour compte comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du compte comptable',
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de supprimer un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const account = await prisma.accountingAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journalLines: true,
            mappings: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte comptable introuvable',
      });
    }

    const hasDependencies = account._count.journalLines > 0 || account._count.mappings > 0;

    if (hasDependencies) {
      await prisma.accountingAccount.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Le compte est déjà utilisé. Il a été désactivé au lieu d être supprimé.',
      });
    }

    await prisma.accountingAccount.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Compte comptable supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression compte comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte comptable',
    });
  }
};
