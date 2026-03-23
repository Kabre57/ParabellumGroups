const { PrismaClient } = require('@prisma/client');
const {
  amount,
  accountTypeFromInput,
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
  ensureDefaultAccounts,
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
    const account = await prisma.accountingAccount.create({
      data: {
        code: normalizedCode,
        label: normalizedLabel,
        type: normalizedType,
        description: description ? String(description).trim() : null,
        openingBalance: initialBalance,
        currentBalance: initialBalance,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeAccountingAccount(account),
      message: 'Compte comptable créé avec succès',
    });
  } catch (error) {
    console.error('Erreur création compte comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte comptable',
    });
  }
};
