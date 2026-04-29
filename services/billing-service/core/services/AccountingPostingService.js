const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const {
  amount,
  computeSignedDelta,
  serializeJournalEntry,
} = require('../../utils/accounting');
const AccountingPeriodService = require('./AccountingPeriodService');
const AccountingJournalService = require('./AccountingJournalService');

const prisma = new PrismaClient();

class AccountingPostingService {
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
    return `${journal.code}-${period.code.replace('-', '')}-${String(sequenceNumber).padStart(4, '0')}`;
  }

  normalizeLines(lines = [], label, enterpriseId = null) {
    return lines
      .filter((line) => line && line.accountId && amount(line.amount) > 0)
      .map((line) => ({
        accountId: String(line.accountId).trim(),
        side: String(line.side || '').trim().toUpperCase(),
        amount: amount(line.amount),
        description: line.description ? String(line.description).trim() : label,
        enterpriseId: Number.isInteger(enterpriseId) ? enterpriseId : line.enterpriseId ?? null,
        thirdPartyId: line.thirdPartyId ? String(line.thirdPartyId).trim() : null,
        thirdPartyName: line.thirdPartyName ? String(line.thirdPartyName).trim() : null,
        currency: line.currency ? String(line.currency).trim().toUpperCase() : 'XOF',
        exchangeRate: line.exchangeRate ?? null,
        amountCurrency: line.amountCurrency ?? null,
      }));
  }

  validateBalancedLines(lines) {
    if (!Array.isArray(lines) || lines.length < 2) {
      const error = new Error('Une écriture comptable doit contenir au moins deux lignes.');
      error.statusCode = 400;
      throw error;
    }

    const invalidSide = lines.find((line) => ![AccountingEntrySide.DEBIT, AccountingEntrySide.CREDIT].includes(line.side));
    if (invalidSide) {
      const error = new Error('Chaque ligne doit avoir un sens débit ou crédit valide.');
      error.statusCode = 400;
      throw error;
    }

    const totalDebit = lines
      .filter((line) => line.side === AccountingEntrySide.DEBIT)
      .reduce((sum, line) => sum + amount(line.amount), 0);
    const totalCredit = lines
      .filter((line) => line.side === AccountingEntrySide.CREDIT)
      .reduce((sum, line) => sum + amount(line.amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      const error = new Error('L écriture comptable doit être équilibrée.');
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

    return client.$transaction(async (tx) => {
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
    });
  }
}

module.exports = new AccountingPostingService();
