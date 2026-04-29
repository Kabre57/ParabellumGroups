const { PrismaClient, AccountingAccountType } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingTreasuryWriteAccess } = require('../utils/accounting');
const {
  ensureDefaultTreasuryAccounts,
  serializeTreasuryAccount,
} = require('../utils/treasury');

const prisma = new PrismaClient();

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const resolveAccountingAccountId = async (accountingAccountId) => {
  const normalizedAccountId = String(accountingAccountId || '').trim();
  if (!normalizedAccountId) return null;

  const account = await prisma.accountingAccount.findUnique({
    where: { id: normalizedAccountId },
  });

  if (!account || account.isActive === false) {
    throw validationError('Le compte comptable de tresorerie est introuvable ou inactif.');
  }

  if (account.type !== AccountingAccountType.ASSET) {
    throw validationError('Le compte comptable lie a la tresorerie doit etre un compte d actif.');
  }

  return account.id;
};

exports.getTreasuryAccounts = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    await ensureDefaultTreasuryAccounts(prisma, req.user);

    const accounts = await prisma.treasuryAccount.findMany({
      where: { isActive: true },
      include: { accountingAccount: true },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({
      success: true,
      data: accounts.map(serializeTreasuryAccount),
    });
  } catch (error) {
    console.error('Erreur récupération comptes de trésorerie:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des comptes de trésorerie',
    });
  }
};

exports.createTreasuryAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingTreasuryWriteAccess(req, 'Vous n avez pas la permission de créer un compte de trésorerie');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const {
      name,
      type,
      bankName,
      accountNumber,
      currency,
      openingBalance,
      accountingAccountId,
      isDefault,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le type sont obligatoires',
      });
    }

    if (isDefault) {
      await prisma.treasuryAccount.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const resolvedAccountingAccountId = await resolveAccountingAccountId(accountingAccountId);

    const created = await prisma.treasuryAccount.create({
      data: {
        name: String(name).trim(),
        type,
        bankName: bankName ? String(bankName).trim() : null,
        accountNumber: accountNumber ? String(accountNumber).trim() : null,
        currency: currency ? String(currency).trim() : 'XOF',
        openingBalance: Number(openingBalance || 0),
        currentBalance: Number(openingBalance || 0),
        accountingAccountId: resolvedAccountingAccountId,
        isDefault: Boolean(isDefault),
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
      include: { accountingAccount: true },
    });

    return res.status(201).json({
      success: true,
      data: serializeTreasuryAccount(created),
      message: 'Compte de trésorerie créé',
    });
  } catch (error) {
    console.error('Erreur création compte de trésorerie:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la création du compte de trésorerie',
    });
  }
};

exports.updateTreasuryAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingTreasuryWriteAccess(req, 'Vous n avez pas la permission de modifier un compte de trésorerie');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const {
      name,
      bankName,
      accountNumber,
      currency,
      openingBalance,
      accountingAccountId,
      isDefault,
      isActive,
    } = req.body;

    const existing = await prisma.treasuryAccount.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Compte de trésorerie introuvable',
      });
    }

    if (isDefault) {
      await prisma.treasuryAccount.updateMany({
        where: { type: existing.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const resolvedAccountingAccountId =
      accountingAccountId !== undefined
        ? await resolveAccountingAccountId(accountingAccountId)
        : existing.accountingAccountId;

    const updated = await prisma.treasuryAccount.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        bankName: bankName !== undefined ? (bankName ? String(bankName).trim() : null) : existing.bankName,
        accountNumber: accountNumber !== undefined ? (accountNumber ? String(accountNumber).trim() : null) : existing.accountNumber,
        currency: currency !== undefined ? String(currency).trim() : existing.currency,
        openingBalance: openingBalance !== undefined ? Number(openingBalance || 0) : existing.openingBalance,
        currentBalance: openingBalance !== undefined ? Number(openingBalance || 0) : existing.currentBalance,
        accountingAccountId: resolvedAccountingAccountId,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
      include: { accountingAccount: true },
    });

    return res.json({
      success: true,
      data: serializeTreasuryAccount(updated),
      message: 'Compte de trésorerie mis à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour compte de trésorerie:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la mise à jour du compte de trésorerie',
    });
  }
};
