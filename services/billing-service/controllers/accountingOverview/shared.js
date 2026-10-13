const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const {
  amount,
  ensureAccountingReadAccess,
  resolveDateRange,
  computeSignedDelta,
  serializeAccountingAccount,
  serializeJournalEntry,
} = require('../../utils/accounting');
const {
  treasuryTypeFromPaymentMethod,
  serializeTreasuryAccount,
} = require('../../utils/treasury');
const {
  getTreasuryJournalMeta,
  isCashAccountingCode,
  isTreasuryAccountingCode,
} = require('../../utils/accountingAccountResolver');
const { safeAmount, safeDate, safeAccess } = require('../../utils/safe-access');
const MappingService = require('../../core/services/AccountingMappingService');
const { applyEnterpriseScope, resolveEnterpriseIdsForRequest, resolveEnterpriseContext } = require('../../utils/enterpriseScope');

// Regroupe les dépendances comptables et les transformations partagées par la vue d'ensemble.
const prisma = new PrismaClient();

const pushMovement = (bucket, movement) => {
  bucket.push({
    id: movement.id,
    date: movement.date,
    type: movement.type,
    category: movement.category,
    description: movement.description,
    amount: movement.amount,
    enterpriseId: movement.enterpriseId || null,
    enterpriseName: movement.enterpriseName || null,
    reference: movement.reference || null,
    sourceType: movement.sourceType || null,
    paymentMethod: movement.paymentMethod || null,
    treasuryAccountId: movement.treasuryAccountId || null,
    treasuryAccountName: movement.treasuryAccountName || null,
    treasuryAccountType: movement.treasuryAccountType || null,
  });
};

const buildEntryId = (...parts) => parts.filter(Boolean).join('-');
const extractPaymentIdFromNotes = (notes) => {
  const match = String(notes || '').match(/\[PAYMENT:([^\]]+)\]/);
  return match?.[1] || null;
};

const buildAccountingReference = (account) =>
  account
    ? {
        id: account.id,
        accountId: account.id,
        code: account.code,
        label: account.label,
      }
    : null;

const resolveTreasuryAccountingReference = async (treasuryAccount, paymentMethod, enterpriseId = null) => {
  const linkedAccount = treasuryAccount?.accountingAccount;
  const linkedReference = linkedAccount && linkedAccount.isActive !== false
    ? buildAccountingReference(linkedAccount)
    : null;

  return linkedReference || MappingService.resolveAccount('PAYMENT', paymentMethod, enterpriseId);
};

const buildDateWhere = (field, startDate, endDate) => {
  if (!startDate && !endDate) return {};

  const where = {};
  if (startDate) {
    where.gte = startDate;
  }
  if (endDate) {
    where.lte = endDate;
  }

  return { [field]: where };
};


// Les fonctions expenseAccountCode et treasuryAccountCode ont été supprimées
// au profit du MappingService dynamique.

const mergeAccounts = (persistedAccounts, dynamicAccounts) => {
  const accountMap = new Map();

  persistedAccounts.forEach((account) => {
    const serialized = serializeAccountingAccount(account);
    accountMap.set(serialized.code, {
      ...serialized,
      movementCount: 0,
      lastTransaction: serialized.lastTransaction,
    });
  });

  dynamicAccounts.forEach((account) => {
    const existing = accountMap.get(account.code);
    if (existing) {
      const existingTime = existing.lastTransaction ? new Date(existing.lastTransaction).getTime() : 0;
      const dynamicTime = account.lastTransaction ? new Date(account.lastTransaction).getTime() : 0;
      accountMap.set(account.code, {
        ...existing,
        label: existing.label || account.label,
        type: existing.type || account.type,
        balance: amount(existing.balance) + amount(account.balance),
        currentBalance: amount(existing.currentBalance) + amount(account.balance),
        movementCount: amount(existing.movementCount) + amount(account.movementCount),
        lastTransaction: dynamicTime > existingTime ? account.lastTransaction : existing.lastTransaction,
      });
      return;
    }

    accountMap.set(account.code, {
      ...account,
      currentBalance: account.balance,
    });
  });

  return [...accountMap.values()].sort((left, right) => left.code.localeCompare(right.code, 'fr'));
};

module.exports = {
  AccountingEntrySide,
  MappingService,
  amount,
  applyEnterpriseScope,
  buildAccountingReference,
  buildDateWhere,
  buildEntryId,
  computeSignedDelta,
  ensureAccountingReadAccess,
  extractPaymentIdFromNotes,
  getTreasuryJournalMeta,
  isCashAccountingCode,
  isTreasuryAccountingCode,
  mergeAccounts,
  prisma,
  resolveDateRange,
  resolveEnterpriseContext,
  resolveEnterpriseIdsForRequest,
  resolveTreasuryAccountingReference,
  safeAccess,
  safeAmount,
  safeDate,
  serializeAccountingAccount,
  serializeJournalEntry,
  serializeTreasuryAccount,
  treasuryTypeFromPaymentMethod,
  pushMovement,
};
