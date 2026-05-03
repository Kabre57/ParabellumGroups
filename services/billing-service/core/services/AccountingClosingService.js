const { PrismaClient } = require('@prisma/client');
const FinancialStatementService = require('./FinancialStatementService');
const AccountingReportSnapshotService = require('./AccountingReportSnapshotService');

const prisma = new PrismaClient();
const toJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

class AccountingClosingService {
  async listClosings(client = prisma, filters = {}) {
    return client.accountingClosing.findMany({
      where: {
        ...(filters.periodId ? { periodId: String(filters.periodId) } : {}),
        ...(filters.status ? { status: String(filters.status).trim().toUpperCase() } : {}),
      },
      include: {
        period: {
          include: { fiscalYear: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createClosing(req, payload = {}) {
    const periodId = String(payload.periodId || '').trim();
    if (!periodId) {
      const error = new Error('La période comptable est obligatoire pour créer une clôture.');
      error.statusCode = 400;
      throw error;
    }

    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
      include: { fiscalYear: true },
    });

    if (!period) {
      const error = new Error('Période comptable introuvable.');
      error.statusCode = 404;
      throw error;
    }

    const statementOptions = {
      startDate: period.startDate,
      endDate: period.endDate,
      includeZeroRows: true,
    };
    const [trialBalance, balanceSheet, incomeStatement] = await Promise.all([
      FinancialStatementService.getTrialBalance(req, statementOptions),
      FinancialStatementService.getBalanceSheet(req, statementOptions),
      FinancialStatementService.getIncomeStatement(req, statementOptions),
    ]);

    const snapshotData = {
      period: {
        id: period.id,
        code: period.code,
        label: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
      },
      fiscalYear: period.fiscalYear
        ? {
            id: period.fiscalYear.id,
            code: period.fiscalYear.code,
            label: period.fiscalYear.label,
          }
        : null,
      trialBalance,
      balanceSheet,
      incomeStatement,
    };

    const requestedStatus = String(payload.status || 'DRAFT').trim().toUpperCase();
    const status = ['DRAFT', 'CLOSED', 'VALIDATED'].includes(requestedStatus) ? requestedStatus : 'DRAFT';

    const closing = await prisma.$transaction(async (tx) => {
      const created = await tx.accountingClosing.create({
        data: {
          periodId: period.id,
          status,
          notes: payload.notes ? String(payload.notes).trim() : null,
          snapshotData: toJson(snapshotData),
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          validatedByUserId: status === 'VALIDATED' ? String(req.user?.userId || '') || null : null,
          validatedAt: status === 'VALIDATED' ? new Date() : null,
        },
        include: {
          period: {
            include: { fiscalYear: true },
          },
        },
      });

      if (status === 'CLOSED' || status === 'VALIDATED') {
        await tx.accountingPeriod.update({
          where: { id: period.id },
          data: {
            status: status === 'VALIDATED' ? 'LOCKED' : 'CLOSED',
            closedAt: new Date(),
            closedByUserId: req.user?.userId ? String(req.user.userId) : null,
            lockedAt: status === 'VALIDATED' ? new Date() : null,
            lockedByUserId: status === 'VALIDATED' && req.user?.userId ? String(req.user.userId) : null,
          },
        });

        await tx.accountingJournalEntry.updateMany({
          where: { periodId: period.id },
          data: { isLocked: true },
        });
      }

      return created;
    });

    await Promise.all([
      AccountingReportSnapshotService.createSnapshot(prisma, {
        reportType: 'TRIAL_BALANCE',
        periodId: period.id,
        fiscalYearId: period.fiscalYearId,
        generatedByUserId: req.user?.userId,
        parameters: statementOptions,
        payload: trialBalance,
      }),
      AccountingReportSnapshotService.createSnapshot(prisma, {
        reportType: 'BALANCE_SHEET',
        periodId: period.id,
        fiscalYearId: period.fiscalYearId,
        generatedByUserId: req.user?.userId,
        parameters: statementOptions,
        payload: balanceSheet,
      }),
      AccountingReportSnapshotService.createSnapshot(prisma, {
        reportType: 'INCOME_STATEMENT',
        periodId: period.id,
        fiscalYearId: period.fiscalYearId,
        generatedByUserId: req.user?.userId,
        parameters: statementOptions,
        payload: incomeStatement,
      }),
    ]);

    return closing;
  }
}

module.exports = new AccountingClosingService();
