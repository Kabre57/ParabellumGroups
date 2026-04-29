const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JOURNAL_TYPE_BY_CODE = {
  VE: 'SALES',
  VT: 'SALES',
  AC: 'PURCHASE',
  ACH: 'PURCHASE',
  BQ: 'BANK',
  CA: 'CASH',
  OD: 'GENERAL',
  PA: 'PAYROLL',
  PL: 'INVESTMENT',
};

class AccountingJournalService {
  inferTypeFromCode(journalCode) {
    const normalizedCode = String(journalCode || '').trim().toUpperCase();
    return JOURNAL_TYPE_BY_CODE[normalizedCode] || 'GENERAL';
  }

  async listJournals(client = prisma) {
    return client.accountingJournal.findMany({
      orderBy: [{ code: 'asc' }],
    });
  }

  async createJournal(client = prisma, payload) {
    return client.accountingJournal.create({
      data: {
        ...payload,
        type: payload.type || this.inferTypeFromCode(payload.code),
      },
    });
  }

  async getOrCreateJournal(client = prisma, { journalCode, journalLabel, enterpriseId = null }) {
    const normalizedCode = String(journalCode || 'OD').trim().toUpperCase();
    const normalizedLabel = String(journalLabel || 'Opérations diverses').trim() || 'Opérations diverses';

    let journal = await client.accountingJournal.findUnique({
      where: { code: normalizedCode },
    });

    if (!journal) {
      journal = await client.accountingJournal.create({
        data: {
          code: normalizedCode,
          label: normalizedLabel,
          type: this.inferTypeFromCode(normalizedCode),
          enterpriseId: Number.isInteger(enterpriseId) ? enterpriseId : null,
        },
      });
    }

    return journal;
  }
}

module.exports = new AccountingJournalService();
