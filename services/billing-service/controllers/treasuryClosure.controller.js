const { PrismaClient } = require('@prisma/client');
const { hasPermission } = require('../utils/accounting');

const prisma = new PrismaClient();

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolvePeriodRange = (period) => {
  if (!period || period === 'all') return { start: null, end: null };
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  return { start: null, end: null };
};

const paymentBucket = (method) => {
  switch (String(method || '').toUpperCase()) {
    case 'ESPECES':
      return 'cash';
    case 'CHEQUE':
      return 'cheque';
    case 'CARTE':
      return 'card';
    default:
      return 'other';
  }
};

const canValidateClosure = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  if (['ADMIN', 'ADMINISTRATEUR', 'ADMINISTRATOR', 'DG', 'DIRECTEUR_GENERAL'].includes(role)) {
    return true;
  }
  return hasPermission(user, 'payments.validate', 'expenses.approve', 'expenses.update');
};

const getExpectedTotals = async ({ start, end, treasuryAccountId }) => {
  const dateFilter = {};
  if (start) dateFilter.gte = start;
  if (end) dateFilter.lte = end;

  const paymentWhere = Object.keys(dateFilter).length
    ? { datePaiement: dateFilter }
    : {};
  if (treasuryAccountId) {
    paymentWhere.treasuryAccountId = treasuryAccountId;
  }

  const voucherWhere = Object.keys(dateFilter).length
    ? { issueDate: dateFilter }
    : {};
  if (treasuryAccountId) {
    voucherWhere.treasuryAccountId = treasuryAccountId;
  }

  const [payments, vouchers] = await Promise.all([
    prisma.paiement.findMany({
      where: paymentWhere,
      select: { montant: true, methodePaiement: true },
    }),
    prisma.cashVoucher.findMany({
      where: voucherWhere,
      select: { amountTTC: true, paymentMethod: true, flowType: true },
    }),
  ]);

  const totals = {
    cash: 0,
    cheque: 0,
    card: 0,
    other: 0,
  };

  payments.forEach((payment) => {
    const bucket = paymentBucket(payment.methodePaiement);
    totals[bucket] += toNumber(payment.montant);
  });

  vouchers.forEach((voucher) => {
    const bucket = paymentBucket(voucher.paymentMethod);
    const amount = toNumber(voucher.amountTTC);
    if (voucher.flowType === 'ENCAISSEMENT') {
      totals[bucket] += amount;
    } else {
      totals[bucket] -= amount;
    }
  });

  return {
    expectedCash: totals.cash,
    expectedCheque: totals.cheque,
    expectedCard: totals.card,
    expectedOther: totals.other,
    expectedTotal: totals.cash + totals.cheque + totals.card + totals.other,
  };
};

const serializeClosure = (closure) => ({
  id: closure.id,
  treasuryAccountId: closure.treasuryAccountId,
  treasuryAccountName: closure.treasuryAccount?.name || null,
  periodType: closure.periodType,
  periodLabel: closure.periodLabel,
  periodStart: closure.periodStart,
  periodEnd: closure.periodEnd,
  expectedCash: closure.expectedCash,
  expectedCheque: closure.expectedCheque,
  expectedCard: closure.expectedCard,
  expectedOther: closure.expectedOther,
  expectedTotal: closure.expectedTotal,
  countedCash: closure.countedCash,
  countedCheque: closure.countedCheque,
  countedCard: closure.countedCard,
  countedOther: closure.countedOther,
  countedTotal: closure.countedTotal,
  ticketZ: closure.ticketZ,
  variance: closure.variance,
  status: closure.status,
  notes: closure.notes,
  createdByUserId: closure.createdByUserId,
  createdByEmail: closure.createdByEmail,
  validatedByUserId: closure.validatedByUserId,
  validatedByEmail: closure.validatedByEmail,
  closedAt: closure.closedAt,
  validatedAt: closure.validatedAt,
  createdAt: closure.createdAt,
  updatedAt: closure.updatedAt,
});

exports.getTreasuryClosures = async (req, res) => {
  try {
    const start = parseDate(req.query.startDate);
    const end = parseDate(req.query.endDate);
    const period = req.query.period ? String(req.query.period) : null;
    const resolvedRange = (!start && !end && period) ? resolvePeriodRange(period) : null;
    const effectiveStart = resolvedRange?.start || start;
    const effectiveEnd = resolvedRange?.end || end;
    const where = {};

    if (effectiveStart || effectiveEnd) {
      where.periodStart = {};
      if (effectiveStart) where.periodStart.gte = effectiveStart;
      if (effectiveEnd) where.periodEnd.lte = effectiveEnd;
    }

    if (req.query.treasuryAccountId) {
      where.treasuryAccountId = String(req.query.treasuryAccountId);
    }

    const closures = await prisma.treasuryClosure.findMany({
      where,
      include: { treasuryAccount: true },
      orderBy: { periodStart: 'desc' },
    });

    return res.json({ success: true, data: closures.map(serializeClosure) });
  } catch (error) {
    console.error('Erreur récupération clôtures:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clôtures',
    });
  }
};

exports.createTreasuryClosure = async (req, res) => {
  try {
    const {
      treasuryAccountId,
      periodType,
      periodLabel,
      periodStart,
      periodEnd,
      countedCash,
      countedCheque,
      countedCard,
      countedOther,
      ticketZ,
      notes,
      status,
    } = req.body;

    const start = parseDate(periodStart);
    const end = parseDate(periodEnd);
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'La période est obligatoire pour la clôture de caisse',
      });
    }

    const expectedTotals = await getExpectedTotals({
      start,
      end,
      treasuryAccountId: treasuryAccountId || null,
    });

    const countedTotal =
      toNumber(countedCash) + toNumber(countedCheque) + toNumber(countedCard) + toNumber(countedOther);

    const variance = countedTotal - expectedTotals.expectedTotal;
    const userId = String(req.user?.userId || req.user?.id || '');
    const userEmail = req.user?.email || null;

    const closure = await prisma.treasuryClosure.create({
      data: {
        treasuryAccountId: treasuryAccountId || null,
        periodType: periodType || 'MONTH',
        periodLabel: periodLabel || null,
        periodStart: start,
        periodEnd: end,
        ...expectedTotals,
        countedCash: toNumber(countedCash),
        countedCheque: toNumber(countedCheque),
        countedCard: toNumber(countedCard),
        countedOther: toNumber(countedOther),
        countedTotal,
        ticketZ: toNumber(ticketZ),
        variance,
        status: status || 'CLOSED',
        notes: notes || null,
        createdByUserId: userId || null,
        createdByEmail: userEmail,
        closedAt: status === 'CLOSED' || !status ? new Date() : null,
      },
      include: { treasuryAccount: true },
    });

    return res.status(201).json({
      success: true,
      data: serializeClosure(closure),
      message: 'Clôture de caisse enregistrée',
    });
  } catch (error) {
    console.error('Erreur création clôture:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la clôture',
    });
  }
};

exports.updateTreasuryClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      countedCash,
      countedCheque,
      countedCard,
      countedOther,
      ticketZ,
      notes,
      status,
    } = req.body;

    const existing = await prisma.treasuryClosure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Clôture introuvable' });
    }

    const countedTotal =
      toNumber(countedCash ?? existing.countedCash) +
      toNumber(countedCheque ?? existing.countedCheque) +
      toNumber(countedCard ?? existing.countedCard) +
      toNumber(countedOther ?? existing.countedOther);

    const variance = countedTotal - toNumber(existing.expectedTotal);

    const updated = await prisma.treasuryClosure.update({
      where: { id },
      data: {
        countedCash: countedCash !== undefined ? toNumber(countedCash) : undefined,
        countedCheque: countedCheque !== undefined ? toNumber(countedCheque) : undefined,
        countedCard: countedCard !== undefined ? toNumber(countedCard) : undefined,
        countedOther: countedOther !== undefined ? toNumber(countedOther) : undefined,
        countedTotal,
        ticketZ: ticketZ !== undefined ? toNumber(ticketZ) : undefined,
        variance,
        notes: notes !== undefined ? notes : undefined,
        status: status || existing.status,
        closedAt: status === 'CLOSED' ? new Date() : existing.closedAt,
      },
      include: { treasuryAccount: true },
    });

    return res.json({
      success: true,
      data: serializeClosure(updated),
      message: 'Clôture mise à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour clôture:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la clôture',
    });
  }
};

exports.validateTreasuryClosure = async (req, res) => {
  try {
    if (!canValidateClosure(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n’avez pas la permission de valider une clôture.',
      });
    }
    const { id } = req.params;
    const userId = String(req.user?.userId || req.user?.id || '');
    const userEmail = req.user?.email || null;

    const updated = await prisma.treasuryClosure.update({
      where: { id },
      data: {
        status: 'VALIDATED',
        validatedByUserId: userId || null,
        validatedByEmail: userEmail,
        validatedAt: new Date(),
      },
      include: { treasuryAccount: true },
    });

    return res.json({
      success: true,
      data: serializeClosure(updated),
      message: 'Clôture validée',
    });
  } catch (error) {
    console.error('Erreur validation clôture:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation de la clôture',
    });
  }
};
