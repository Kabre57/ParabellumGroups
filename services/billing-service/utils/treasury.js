const { TreasuryAccountType } = require('@prisma/client');

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const serializeLinkedAccountingAccount = (account) =>
  account
    ? {
        id: account.id,
        code: account.code,
        label: account.label,
        type: String(account.type || '').toLowerCase(),
        isActive: account.isActive !== false,
      }
    : null;

const serializeTreasuryAccount = (account) => ({
  id: account.id,
  name: account.name,
  type: account.type,
  bankName: account.bankName,
  accountNumber: account.accountNumber,
  currency: account.currency,
  openingBalance: amount(account.openingBalance),
  currentBalance: amount(account.currentBalance),
  accountingAccountId: account.accountingAccountId || null,
  accountingAccount: serializeLinkedAccountingAccount(account.accountingAccount),
  isDefault: Boolean(account.isDefault),
  isActive: Boolean(account.isActive),
  createdByUserId: account.createdByUserId,
  createdByEmail: account.createdByEmail,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

const treasuryTypeFromPaymentMethod = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES' ? TreasuryAccountType.CASH : TreasuryAccountType.BANK;

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const ensureDefaultTreasuryAccounts = async (client, user) => {
  const existing = await client.treasuryAccount.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: 'asc' }],
  });

  const hasBank = existing.some((account) => account.type === TreasuryAccountType.BANK);
  const hasCash = existing.some((account) => account.type === TreasuryAccountType.CASH);
  const defaults = existing.filter((account) => account.isDefault);

  if (!hasBank) {
    await client.treasuryAccount.create({
      data: {
        name: 'Banque principale',
        type: TreasuryAccountType.BANK,
        bankName: 'Banque principale',
        accountNumber: null,
        openingBalance: 0,
        currentBalance: 0,
        isDefault: true,
        createdByUserId: user?.userId ? String(user.userId) : null,
        createdByEmail: user?.email || null,
      },
    });
  }

  if (!hasCash) {
    await client.treasuryAccount.create({
      data: {
        name: 'Caisse principale',
        type: TreasuryAccountType.CASH,
        bankName: null,
        accountNumber: null,
        openingBalance: 0,
        currentBalance: 0,
        isDefault: true,
        createdByUserId: user?.userId ? String(user.userId) : null,
        createdByEmail: user?.email || null,
      },
    });
  }

  if (!defaults.length) {
    const accounts = await client.treasuryAccount.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'asc' }],
    });
    const firstBank = accounts.find((account) => account.type === TreasuryAccountType.BANK);
    const firstCash = accounts.find((account) => account.type === TreasuryAccountType.CASH);
    if (firstBank) {
      await client.treasuryAccount.update({
        where: { id: firstBank.id },
        data: { isDefault: true },
      });
    }
    if (firstCash) {
      await client.treasuryAccount.update({
        where: { id: firstCash.id },
        data: { isDefault: true },
      });
    }
  }
};

const resolveTreasuryAccountId = async (client, { treasuryAccountId, paymentMethod, user }) => {
  const expectedType = treasuryTypeFromPaymentMethod(paymentMethod);

  if (treasuryAccountId) {
    const found = await client.treasuryAccount.findUnique({ where: { id: treasuryAccountId } });
    if (found && found.isActive !== false) {
      if (found.type !== expectedType) {
        throw validationError(
          "Le compte de tresorerie selectionne n'est pas compatible avec le mode de paiement."
        );
      }
      return found.id;
    }
  }

  await ensureDefaultTreasuryAccounts(client, user);

  const fallback = await client.treasuryAccount.findFirst({
    where: {
      isActive: true,
      type: expectedType,
      isDefault: true,
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  if (fallback) {
    return fallback.id;
  }

  const anyAccount = await client.treasuryAccount.findFirst({
    where: { isActive: true },
    orderBy: [{ createdAt: 'asc' }],
  });

  return anyAccount ? anyAccount.id : null;
};

const getTreasuryAccountingAccountId = async (client, treasuryAccountId) => {
  if (!treasuryAccountId) return null;

  const treasuryAccount = await client.treasuryAccount.findUnique({
    where: { id: String(treasuryAccountId) },
    include: {
      accountingAccount: true,
    },
  });

  if (!treasuryAccount?.accountingAccountId || treasuryAccount.accountingAccount?.isActive === false) {
    return null;
  }

  return treasuryAccount.accountingAccountId;
};

module.exports = {
  serializeTreasuryAccount,
  treasuryTypeFromPaymentMethod,
  ensureDefaultTreasuryAccounts,
  resolveTreasuryAccountId,
  getTreasuryAccountingAccountId,
};
