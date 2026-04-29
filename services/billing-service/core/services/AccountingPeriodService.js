const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const toDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toPeriodBounds = (dateValue) => {
  const current = toDateOnly(dateValue);
  const startDate = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

const buildFiscalYearCode = (dateValue) => `FY-${dateValue.getFullYear()}`;
const buildFiscalYearLabel = (dateValue) => `Exercice ${dateValue.getFullYear()}`;
const buildPeriodCode = (dateValue) => `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
const buildPeriodLabel = (dateValue) =>
  dateValue.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, (char) => char.toUpperCase());

const isLockedStatus = (status) => ['CLOSED', 'LOCKED'].includes(String(status || '').toUpperCase());

class AccountingPeriodService {
  async listFiscalYears(client = prisma) {
    return client.fiscalYear.findMany({
      orderBy: [{ startDate: 'desc' }],
      include: {
        periods: {
          orderBy: [{ startDate: 'asc' }],
        },
      },
    });
  }

  async listPeriods(client = prisma, fiscalYearId) {
    return client.accountingPeriod.findMany({
      where: fiscalYearId ? { fiscalYearId: String(fiscalYearId) } : undefined,
      orderBy: [{ startDate: 'desc' }],
      include: {
        fiscalYear: true,
      },
    });
  }

  async createFiscalYear(client = prisma, payload) {
    return client.fiscalYear.create({
      data: payload,
    });
  }

  async createPeriod(client = prisma, payload) {
    return client.accountingPeriod.create({
      data: payload,
      include: {
        fiscalYear: true,
      },
    });
  }

  async updatePeriodStatus(client = prisma, periodId, status, userId = null) {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const data = { status: normalizedStatus };

    if (normalizedStatus === 'CLOSED') {
      data.closedAt = new Date();
      data.closedByUserId = userId ? String(userId) : null;
    }

    if (normalizedStatus === 'LOCKED') {
      data.lockedAt = new Date();
      data.lockedByUserId = userId ? String(userId) : null;
    }

    return client.accountingPeriod.update({
      where: { id: String(periodId) },
      data,
      include: {
        fiscalYear: true,
      },
    });
  }

  async getOrCreateFiscalYear(client = prisma, dateValue = new Date()) {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const code = buildFiscalYearCode(date);
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    let fiscalYear = await client.fiscalYear.findUnique({
      where: { code },
    });

    if (!fiscalYear) {
      fiscalYear = await client.fiscalYear.create({
        data: {
          code,
          label: buildFiscalYearLabel(date),
          startDate,
          endDate,
          status: 'OPEN',
        },
      });
    }

    return fiscalYear;
  }

  async getOrCreatePeriodForDate(client = prisma, dateValue = new Date()) {
    const date = new Date(dateValue);
    const fiscalYear = await this.getOrCreateFiscalYear(client, date);
    const code = buildPeriodCode(date);
    const { startDate, endDate } = toPeriodBounds(date);

    let period = await client.accountingPeriod.findFirst({
      where: {
        fiscalYearId: fiscalYear.id,
        code,
      },
      include: {
        fiscalYear: true,
      },
    });

    if (!period) {
      period = await client.accountingPeriod.create({
        data: {
          fiscalYearId: fiscalYear.id,
          code,
          label: buildPeriodLabel(date),
          startDate,
          endDate,
          periodType: 'MONTH',
          status: 'OPEN',
        },
        include: {
          fiscalYear: true,
        },
      });
    }

    return period;
  }

  assertWritable(period) {
    if (!period) {
      const error = new Error('Aucune période comptable active n a été trouvée.');
      error.statusCode = 400;
      throw error;
    }

    if (isLockedStatus(period.status)) {
      const error = new Error(`La période comptable "${period.label}" est ${String(period.status).toLowerCase()}.`);
      error.statusCode = 409;
      throw error;
    }
  }
}

module.exports = new AccountingPeriodService();
