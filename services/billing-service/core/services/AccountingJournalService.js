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
    
    // 1. Exact match
    if (JOURNAL_TYPE_BY_CODE[normalizedCode]) {
      return JOURNAL_TYPE_BY_CODE[normalizedCode];
    }

    // 2. Prefix match (e.g., BQ_SGBCI -> BANK)
    for (const [code, type] of Object.entries(JOURNAL_TYPE_BY_CODE)) {
      if (normalizedCode.startsWith(`${code}_`) || normalizedCode.startsWith(code)) {
        // We check for exact prefix or prefix with underscore
        // To avoid "ACH" matching "AC", we should check longer prefixes first or be careful
        // But for now, let's use a simple logic:
        if (normalizedCode.startsWith(`${code}_`)) return type;
      }
    }

    // 3. Common patterns
    if (normalizedCode.includes('BANK') || normalizedCode.includes('BNK')) return 'BANK';
    if (normalizedCode.includes('CASH') || normalizedCode.includes('CSH')) return 'CASH';
    if (normalizedCode.includes('PAY') || normalizedCode.includes('SAL')) return 'PAYROLL';
    if (normalizedCode.includes('INV') || normalizedCode.includes('PL')) return 'INVESTMENT';

    return 'GENERAL';
  }

  async listJournals(enterpriseId, client = prisma) {
    const where = enterpriseId ? { enterpriseId: Number(enterpriseId) } : {};
    return client.accountingJournal.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async createJournal(client = prisma, payload) {
    return client.accountingJournal.create({
      data: {
        ...payload,
        type: payload.type || this.inferTypeFromCode(payload.code),
        enterpriseId: payload.enterpriseId ? Number(payload.enterpriseId) : null,
      },
    });
  }

  async getOrCreateJournal(client = prisma, { journalCode, journalLabel, enterpriseId = null }) {
    const normalizedCode = String(journalCode || 'OD').trim().toUpperCase();
    const normalizedLabel = String(journalLabel || 'Opérations diverses').trim() || 'Opérations diverses';
    const eid = enterpriseId ? Number(enterpriseId) : null;

    // Utilisation de la clé composée code_enterpriseId
    let journal = await client.accountingJournal.findUnique({
      where: { 
        code_enterpriseId: {
          code: normalizedCode,
          enterpriseId: eid
        }
      },
    });

    if (!journal) {
      journal = await client.accountingJournal.create({
        data: {
          code: normalizedCode,
          label: normalizedLabel,
          type: this.inferTypeFromCode(normalizedCode),
          enterpriseId: eid,
        },
      });
    }

    return journal;
  }
}

module.exports = new AccountingJournalService();
