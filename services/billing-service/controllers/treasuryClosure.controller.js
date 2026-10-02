const { PrismaClient, AccountingAccountType, TreasuryAccountType, TreasuryClosureStatus } = require('@prisma/client');
const { hasPermission } = require('../utils/accounting');

const prisma = new PrismaClient();
const POSTED_STATUSES = ['POSTED', 'VALIDATED'];
const CLOSABLE_STATUSES = ['CLOSED', 'VALIDATED'];
const VARIANCE_TOLERANCE = 0.005;

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const input = String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const parsed = new Date(dateOnly
    ? `${input}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolvePeriodRange = (period) => {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === 'quarter') {
    const month = Math.floor(now.getMonth() / 3) * 3;
    return {
      start: new Date(now.getFullYear(), month, 1),
      end: new Date(now.getFullYear(), month + 3, 0, 23, 59, 59, 999),
    };
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  return { start: null, end: null };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const canValidateClosure = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  if (['ADMIN', 'ADMINISTRATEUR', 'ADMINISTRATOR', 'DG', 'DIRECTEUR_GENERAL'].includes(role)) return true;
  return hasPermission(user, 'accounting.treasury.manage');
};

const closureError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Le journal comptable est la source unique des mouvements : les paiements,
 * encaissements, décaissements et transferts validés y sont déjà comptabilisés.
 * Cela exclut les brouillons/annulations et évite de recompter une pièce source.
 */
const getExpectedTotals = async ({ client = prisma, end, treasuryAccountId }) => {
  const accounts = await client.treasuryAccount.findMany({
    where: {
      type: TreasuryAccountType.CASH,
      isActive: true,
      ...(treasuryAccountId ? { id: String(treasuryAccountId) } : {}),
    },
    include: { accountingAccount: true },
    orderBy: [{ name: 'asc' }],
  });

  if (treasuryAccountId && accounts.length === 0) {
    throw closureError('La caisse choisie est introuvable, inactive ou n’est pas une caisse.', 404);
  }
  if (accounts.length === 0) {
    throw closureError('Aucune caisse active n’est configurée.');
  }

  const missingLink = accounts.find((account) =>
    !account.accountingAccount ||
    !account.accountingAccount.isActive ||
    account.accountingAccount.type !== AccountingAccountType.ASSET
  );
  if (missingLink) {
    throw closureError(`Associez un compte comptable actif de type actif à la caisse « ${missingLink.name} » avant de la clôturer.`, 422);
  }

  const accountIds = accounts.map((account) => account.accountingAccountId);
  const duplicateMapping = await client.treasuryAccount.findMany({
    where: {
      isActive: true,
      accountingAccountId: { in: accountIds },
    },
    select: { id: true, name: true, accountingAccountId: true },
  });
  const mappedIds = new Set();
  for (const account of duplicateMapping) {
    if (mappedIds.has(account.accountingAccountId)) {
      throw closureError(`Le compte comptable est lié à plusieurs caisses (dont « ${account.name} »). Chaque caisse doit avoir son propre compte pour être rapprochée séparément.`, 422);
    }
    mappedIds.add(account.accountingAccountId);
  }

  const lines = await client.accountingJournalLine.findMany({
    where: {
      accountId: { in: accountIds },
      entry: {
        entryDate: { lte: end },
        status: { in: POSTED_STATUSES },
      },
    },
    select: { accountId: true, side: true, amount: true },
  });

  const movementByAccount = new Map();
  for (const line of lines) {
    const delta = line.side === 'DEBIT' ? toNumber(line.amount) : -toNumber(line.amount);
    movementByAccount.set(line.accountId, (movementByAccount.get(line.accountId) || 0) + delta);
  }

  const perAccount = accounts.map((account) => {
    const expectedTotal = toNumber(account.openingBalance) + (movementByAccount.get(account.accountingAccountId) || 0);
    return {
      treasuryAccountId: account.id,
      treasuryAccountName: account.name,
      expectedCash: expectedTotal,
      expectedCheque: 0,
      expectedCard: 0,
      expectedOther: 0,
      expectedTotal,
    };
  });

  return perAccount;
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
    const end = parseDate(req.query.endDate, true);
    const period = req.query.period ? resolvePeriodRange(String(req.query.period)) : null;
    const effectiveStart = start || period?.start;
    const effectiveEnd = end || period?.end;
    const where = {};
    if (effectiveStart) where.periodStart = { gte: effectiveStart };
    if (effectiveEnd) where.periodEnd = { lte: effectiveEnd };
    if (req.query.treasuryAccountId) where.treasuryAccountId = String(req.query.treasuryAccountId);

    const closures = await prisma.treasuryClosure.findMany({
      where,
      include: { treasuryAccount: true },
      orderBy: { periodStart: 'desc' },
    });
    return res.json({ success: true, data: closures.map(serializeClosure) });
  } catch (error) {
    console.error('Erreur récupération clôtures :', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des clôtures.' });
  }
};

exports.createTreasuryClosure = async (req, res) => {
  try {
    const { treasuryAccountId, periodType, periodLabel, periodStart, periodEnd,
      countedCash, countedCheque, countedCard, countedOther, ticketZ, notes } = req.body || {};
    if (!treasuryAccountId) {
      return res.status(400).json({ success: false, message: 'Choisissez une caisse à clôturer.' });
    }

    const start = parseDate(periodStart);
    const end = parseDate(periodEnd, true);
    if (!start || !end || start > end) {
      return res.status(400).json({ success: false, message: 'La période de clôture est invalide.' });
    }

    const counted = {
      countedCash: toNumber(countedCash),
      countedCheque: toNumber(countedCheque),
      countedCard: toNumber(countedCard),
      countedOther: toNumber(countedOther),
    };
    if (Object.values(counted).some((value) => value < 0)) {
      return res.status(400).json({ success: false, message: 'Les montants comptés doivent être positifs ou nuls.' });
    }

    const prior = await prisma.treasuryClosure.findFirst({
      where: {
        treasuryAccountId: String(treasuryAccountId),
        status: { in: CLOSABLE_STATUSES },
        periodStart: start,
        periodEnd: end,
      },
    });
    if (prior) {
      return res.status(409).json({ success: false, message: 'Une clôture existe déjà pour cette caisse et cette période.' });
    }

    const [expected] = await getExpectedTotals({ end, treasuryAccountId });
    const countedTotal = Object.values(counted).reduce((sum, value) => sum + value, 0);
    const variance = countedTotal - expected.expectedTotal;
    const userId = String(req.user?.userId || req.user?.id || '');

    const closure = await prisma.treasuryClosure.create({
      data: {
        treasuryAccountId: expected.treasuryAccountId,
        periodType: periodType || 'CUSTOM',
        periodLabel: periodLabel || null,
        periodStart: start,
        periodEnd: end,
        expectedCash: expected.expectedCash,
        expectedCheque: expected.expectedCheque,
        expectedCard: expected.expectedCard,
        expectedOther: expected.expectedOther,
        expectedTotal: expected.expectedTotal,
        ...counted,
        countedTotal,
        ticketZ: toNumber(ticketZ),
        variance,
        status: TreasuryClosureStatus.CLOSED,
        notes: notes ? String(notes).trim() : null,
        createdByUserId: userId || null,
        createdByEmail: req.user?.email || null,
        closedAt: new Date(),
      },
      include: { treasuryAccount: true },
    });

    return res.status(201).json({ success: true, data: serializeClosure(closure), message: 'Clôture enregistrée, en attente de validation.' });
  } catch (error) {
    console.error('Erreur création clôture :', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Erreur lors de la création de la clôture.' });
  }
};

exports.updateTreasuryClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.treasuryClosure.findUnique({ where: { id }, include: { treasuryAccount: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Clôture introuvable.' });
    if (existing.status === TreasuryClosureStatus.VALIDATED) {
      return res.status(409).json({ success: false, message: 'Une clôture validée est verrouillée et ne peut plus être modifiée.' });
    }

    const counted = {
      countedCash: req.body.countedCash !== undefined ? toNumber(req.body.countedCash) : existing.countedCash,
      countedCheque: req.body.countedCheque !== undefined ? toNumber(req.body.countedCheque) : existing.countedCheque,
      countedCard: req.body.countedCard !== undefined ? toNumber(req.body.countedCard) : existing.countedCard,
      countedOther: req.body.countedOther !== undefined ? toNumber(req.body.countedOther) : existing.countedOther,
    };
    if (Object.values(counted).some((value) => value < 0)) {
      return res.status(400).json({ success: false, message: 'Les montants comptés doivent être positifs ou nuls.' });
    }

    const [expected] = await getExpectedTotals({
      end: existing.periodEnd,
      treasuryAccountId: existing.treasuryAccountId,
    });
    const countedTotal = Object.values(counted).reduce((sum, value) => sum + value, 0);
    const updated = await prisma.treasuryClosure.update({
      where: { id },
      data: {
        ...counted,
        countedTotal,
        expectedCash: expected.expectedCash,
        expectedCheque: expected.expectedCheque,
        expectedCard: expected.expectedCard,
        expectedOther: expected.expectedOther,
        expectedTotal: expected.expectedTotal,
        variance: countedTotal - expected.expectedTotal,
        ticketZ: req.body.ticketZ !== undefined ? toNumber(req.body.ticketZ) : undefined,
        notes: req.body.notes !== undefined ? String(req.body.notes) : undefined,
      },
      include: { treasuryAccount: true },
    });
    return res.json({ success: true, data: serializeClosure(updated), message: 'Clôture mise à jour.' });
  } catch (error) {
    console.error('Erreur mise à jour clôture :', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Erreur lors de la mise à jour de la clôture.' });
  }
};

exports.validateTreasuryClosure = async (req, res) => {
  try {
    if (!canValidateClosure(req.user)) {
      return res.status(403).json({ success: false, message: 'Vous n’avez pas la permission de valider une clôture.' });
    }
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.treasuryClosure.findUnique({ where: { id }, include: { treasuryAccount: true } });
      if (!existing) throw closureError('Clôture introuvable.', 404);
      if (existing.status === TreasuryClosureStatus.VALIDATED) throw closureError('Cette clôture est déjà validée.', 409);
      if (existing.status !== TreasuryClosureStatus.CLOSED) throw closureError('Seule une clôture enregistrée peut être validée.', 409);

      const [expected] = await getExpectedTotals({
        client: tx,
        end: existing.periodEnd,
        treasuryAccountId: existing.treasuryAccountId,
      });
      const countedTotal = toNumber(existing.countedCash) + toNumber(existing.countedCheque) +
        toNumber(existing.countedCard) + toNumber(existing.countedOther);
      const variance = countedTotal - expected.expectedTotal;
      if (Math.abs(variance) > VARIANCE_TOLERANCE && !String(req.body?.notes || existing.notes || '').trim()) {
        throw closureError('L’écart de caisse doit être expliqué dans les notes avant validation.', 422);
      }

      const userId = String(req.user?.userId || req.user?.id || '');
      return tx.treasuryClosure.update({
        where: { id },
        data: {
          expectedCash: expected.expectedCash,
          expectedCheque: expected.expectedCheque,
          expectedCard: expected.expectedCard,
          expectedOther: expected.expectedOther,
          expectedTotal: expected.expectedTotal,
          countedTotal,
          variance,
          notes: req.body?.notes !== undefined ? String(req.body.notes) : existing.notes,
          status: TreasuryClosureStatus.VALIDATED,
          validatedByUserId: userId || null,
          validatedByEmail: req.user?.email || null,
          validatedAt: new Date(),
        },
        include: { treasuryAccount: true },
      });
    }, { isolationLevel: 'Serializable' });

    return res.json({ success: true, data: serializeClosure(result), message: 'Clôture validée et période verrouillée.' });
  } catch (error) {
    console.error('Erreur validation clôture :', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Erreur lors de la validation de la clôture.' });
  }
};
