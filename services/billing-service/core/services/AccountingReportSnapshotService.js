const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const toJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

class AccountingReportSnapshotService {
  async listSnapshots(client = prisma, filters = {}) {
    return client.accountingReportSnapshot.findMany({
      where: {
        ...(filters.reportType ? { reportType: String(filters.reportType).trim().toUpperCase() } : {}),
        ...(filters.periodId ? { periodId: String(filters.periodId) } : {}),
        ...(filters.fiscalYearId ? { fiscalYearId: String(filters.fiscalYearId) } : {}),
        ...(filters.enterpriseId ? { enterpriseId: Number(filters.enterpriseId) } : {}),
      },
      orderBy: [{ generatedAt: 'desc' }],
      take: filters.limit ? Number(filters.limit) : 100,
    });
  }

  async createSnapshot(client = prisma, payload = {}) {
    return client.accountingReportSnapshot.create({
      data: {
        reportType: String(payload.reportType || '').trim().toUpperCase(),
        periodId: payload.periodId ? String(payload.periodId) : null,
        fiscalYearId: payload.fiscalYearId ? String(payload.fiscalYearId) : null,
        enterpriseId: payload.enterpriseId !== undefined && payload.enterpriseId !== null ? Number(payload.enterpriseId) : null,
        generatedByUserId: payload.generatedByUserId ? String(payload.generatedByUserId) : null,
        parameters: toJson(payload.parameters),
        payload: toJson(payload.payload),
      },
    });
  }
}

module.exports = new AccountingReportSnapshotService();
