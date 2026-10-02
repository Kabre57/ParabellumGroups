const { PrismaClient } = require('@prisma/client');
const {
  computeSignedDelta,
  serializeJournalEntry,
} = require('../../utils/accounting');
const {
  amount,
  normalizeAccountingLines,
  validateBalancedAccountingLines,
} = require('../../utils/accountingLines');
const AccountingPeriodService = require('./AccountingPeriodService');
const AccountingJournalService = require('./AccountingJournalService');

const prisma = new PrismaClient();

class AccountingPostingService {
  async assertTreasuryPeriodOpen(client, accountIds, entryDate) {
    const treasuryAccounts = await client.treasuryAccount.findMany({
      where: { accountingAccountId: { in: accountIds }, isActive: true },
      select: { id: true },
    });
    const treasuryAccountIds = treasuryAccounts.map((account) => account.id);
    if (!treasuryAccountIds.length) return;

    const lockedClosure = await client.treasuryClosure.findFirst({
      where: {
        status: 'VALIDATED',
        periodStart: { lte: entryDate },
        periodEnd: { gte: entryDate },
        OR: [
          { treasuryAccountId: null },
          { treasuryAccountId: { in: treasuryAccountIds } },
        ],
      },
      include: { treasuryAccount: true },
    });
    if (lockedClosure) {
      const error = new Error(
        `La caisse ${lockedClosure.treasuryAccount?.name || ''} est clôturée et validée pour cette date. Aucune nouvelle écriture rétroactive n’est autorisée.`.trim()
      );
      error.statusCode = 409;
      throw error;
    }
  }

  async assertTreasuryAccountPeriodOpen(treasuryAccountId, entryDate, client = prisma) {
    if (!treasuryAccountId) return;
    const account = await client.treasuryAccount.findUnique({
      where: { id: String(treasuryAccountId) },
      select: { accountingAccountId: true },
    });
    if (account?.accountingAccountId && entryDate && !Number.isNaN(new Date(entryDate).getTime())) {
      await this.assertTreasuryPeriodOpen(client, [account.accountingAccountId], new Date(entryDate));
    }
  }

  async assertSourceNotPosted(sourceType, sourceId, client = prisma) {
    const entry = await client.accountingJournalEntry.findFirst({
      where: { sourceType, sourceId, status: { in: ['POSTED', 'VALIDATED'] } },
      select: { id: true, entryNumber: true },
    });
    if (entry) {
      const error = new Error(
        `Cette opération est déjà comptabilisée (${entry.entryNumber}). Passez une écriture de contrepassation avant de l’annuler ou de modifier son statut.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  async nextEntryNumber(client, journal, period) {
    const sequence = await client.accountingEntrySequence.upsert({
      where: {
        journalId_periodId: {
          journalId: journal.id,
          periodId: period.id,
        },
      },
      update: {
        nextNumber: {
          increment: 1,
        },
      },
      create: {
        journalId: journal.id,
        periodId: period.id,
        nextNumber: 2,
      },
    });

    const sequenceNumber = sequence.nextNumber - 1;
    const entPart = journal.enterpriseId ? `E${journal.enterpriseId}-` : '';
    return `${entPart}${journal.code}-${period.code.replace('-', '')}-${String(sequenceNumber).padStart(4, '0')}`;
  }

  normalizeLines(lines = [], label, enterpriseId = null) {
    return normalizeAccountingLines(lines, label, enterpriseId);
  }

  validateBalancedLines(lines) {
    validateBalancedAccountingLines(lines);
  }

  validateJournalPaymentConsistency(journal, paymentMethod) {
    if (!paymentMethod) return;

    const method = String(paymentMethod).trim().toUpperCase();
    const journalType = String(journal.type).trim().toUpperCase();

    if (journalType === 'CASH' && method !== 'ESPECES') {
      const error = new Error(`Cohérence : Un journal de CAISSE ne peut pas recevoir un règlement de type ${method}.`);
      error.statusCode = 400;
      throw error;
    }

    if (journalType === 'BANK' && method === 'ESPECES') {
      const error = new Error('Cohérence : Un journal de BANQUE ne peut pas recevoir un règlement en ESPECES (utiliser le journal de CAISSE).');
      error.statusCode = 400;
      throw error;
    }
  }

  async postEntry(payload, client = prisma) {
    const entryDate = payload.entryDate ? new Date(payload.entryDate) : new Date();
    const normalizedLabel = String(payload.label || '').trim();
    const resolvedEnterpriseId = payload.enterpriseId !== undefined && payload.enterpriseId !== null
      ? Number(payload.enterpriseId)
      : null;
    const resolvedEnterpriseName = payload.enterpriseName ? String(payload.enterpriseName).trim() : null;

    if (!normalizedLabel) {
      const error = new Error('Le libellé de l écriture est obligatoire.');
      error.statusCode = 400;
      throw error;
    }

    const lines = this.normalizeLines(payload.lines, normalizedLabel, resolvedEnterpriseId);
    this.validateBalancedLines(lines);

    const persistEntry = async (tx) => {
      const journal = await AccountingJournalService.getOrCreateJournal(tx, {
        journalCode: payload.journalCode,
        journalLabel: payload.journalLabel,
        enterpriseId: resolvedEnterpriseId,
      });

      const period = await AccountingPeriodService.getOrCreatePeriodForDate(tx, entryDate);
      AccountingPeriodService.assertWritable(period);

      const entryNumber = await this.nextEntryNumber(tx, journal, period);
      const fiscalYearId = period.fiscalYearId || period.fiscalYear?.id || null;

      const accounts = await tx.accountingAccount.findMany({
        where: {
          id: {
            in: lines.map((line) => line.accountId),
          },
        },
      });
      const accountById = new Map(accounts.map((account) => [account.id, account]));

      lines.forEach((line) => {
        const account = accountById.get(line.accountId);
        if (!account) {
          const error = new Error('Un des comptes comptables sélectionnés est introuvable.');
          error.statusCode = 404;
          throw error;
        }
        if (!account.isActive) {
          const error = new Error(`Le compte ${account.code} est inactif.`);
          error.statusCode = 400;
          throw error;
        }
        if (!account.allowManualPosting && payload.manual !== false) {
          const error = new Error(`Le compte ${account.code} n'autorise pas de saisie directe.`);
          error.statusCode = 400;
          throw error;
        }
      });

      // Les transferts et opérations passés sur une période verrouillée sont refusés.
      await this.assertTreasuryPeriodOpen(tx, lines.map((line) => line.accountId), entryDate);

      this.validateJournalPaymentConsistency(journal, payload.paymentMethod);

      const createdEntry = await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate,
          journalCode: journal.code,
          journalLabel: journal.label,
          journalId: journal.id,
          periodId: period.id,
          fiscalYearId,
          label: normalizedLabel,
          reference: payload.reference ? String(payload.reference).trim() : null,
          paymentMethod: payload.paymentMethod ? String(payload.paymentMethod).trim().toUpperCase() : null,
          sourceType: payload.sourceType ? String(payload.sourceType).trim() : null,
          sourceId: payload.sourceId ? String(payload.sourceId).trim() : null,
          enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
          enterpriseName: resolvedEnterpriseName,
          status: payload.status || 'POSTED',
          postedAt: payload.status && payload.status !== 'POSTED' ? null : new Date(),
          validatedAt: payload.status && payload.status === 'DRAFT' ? null : new Date(),
          validatedByUserId: payload.validatedByUserId ? String(payload.validatedByUserId) : payload.createdByUserId ? String(payload.createdByUserId) : null,
          createdByUserId: payload.createdByUserId ? String(payload.createdByUserId) : null,
          createdByEmail: payload.createdByEmail || null,
          lines: {
            create: lines,
          },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      await Promise.all(
        lines.map((line) =>
          tx.accountingAccount.update({
            where: { id: line.accountId },
            data: {
              currentBalance: {
                increment: computeSignedDelta(accountById.get(line.accountId).type, line.side, line.amount),
              },
            },
          })
        )
      );

      return serializeJournalEntry(createdEntry);
    };

    if (typeof client.$transaction === 'function') {
      return client.$transaction(persistEntry);
    }

    return persistEntry(client);
  }
}

module.exports = new AccountingPostingService();
