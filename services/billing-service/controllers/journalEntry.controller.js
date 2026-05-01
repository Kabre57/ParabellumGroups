const { PrismaClient } = require('@prisma/client');
const {
  ensureAccountingReadAccess,
  ensureAccountingEntriesWriteAccess,
  resolveDateRange,
  serializeJournalEntry,
} = require('../utils/accounting');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');
const AccountingPostingService = require('../core/services/AccountingPostingService');

const prisma = new PrismaClient();

const buildWhere = ({ startDate, endDate, search, journalId, periodId, status }) => {
  const where = {};

  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) {
      where.entryDate.gte = startDate;
    }
    if (endDate) {
      where.entryDate.lte = endDate;
    }
  }

  if (search) {
    const normalizedSearch = String(search).trim();
      where.OR = [
        { entryNumber: { contains: normalizedSearch, mode: 'insensitive' } },
        { reference: { contains: normalizedSearch, mode: 'insensitive' } },
        { label: { contains: normalizedSearch, mode: 'insensitive' } },
        { journalCode: { contains: normalizedSearch, mode: 'insensitive' } },
        { enterpriseName: { contains: normalizedSearch, mode: 'insensitive' } },
        {
          lines: {
            some: {
            account: {
              OR: [
                { code: { contains: normalizedSearch, mode: 'insensitive' } },
                { label: { contains: normalizedSearch, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    ];
  }

  if (journalId) {
    where.journalId = String(journalId);
  }

  if (periodId) {
    where.periodId = String(periodId);
  }

  if (status) {
    where.status = String(status).trim().toUpperCase();
  }

  return where;
};

const normalizeEntryLinesPayload = (body) => {
  if (Array.isArray(body.lines)) {
    return body.lines.map((line) => ({
      accountId: line.accountId,
      side: line.side,
      amount: line.amount,
      description: line.description,
      thirdPartyId: line.thirdPartyId,
      thirdPartyName: line.thirdPartyName,
      currency: line.currency,
      exchangeRate: line.exchangeRate,
      amountCurrency: line.amountCurrency,
    }));
  }

  const normalizedDebitAccountId = String(body.debitAccountId || '').trim();
  const normalizedCreditAccountId = String(body.creditAccountId || '').trim();
  const entryAmount = Number(body.amount);

  if (!normalizedDebitAccountId || !normalizedCreditAccountId || entryAmount <= 0) {
    return [];
  }

  return [
    {
      accountId: normalizedDebitAccountId,
      side: 'DEBIT',
      amount: entryAmount,
      description: String(body.label || '').trim(),
    },
    {
      accountId: normalizedCreditAccountId,
      side: 'CREDIT',
      amount: entryAmount,
      description: String(body.label || '').trim(),
    },
  ];
};

exports.getAllJournalEntries = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { startDate, endDate } = resolveDateRange({
      period: req.query.period,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    const baseWhere = buildWhere({
      startDate,
      endDate,
      search: req.query.search,
      journalId: req.query.journalId,
      periodId: req.query.periodId,
      status: req.query.status,
    });

    const entries = await prisma.accountingJournalEntry.findMany({
      where: await applyEnterpriseScope({
        req,
        where: baseWhere,
        requestedEnterpriseId: req.query.enterpriseId,
      }),
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      data: entries.map(serializeJournalEntry),
    });
  } catch (error) {
    console.error('Erreur récupération écritures comptables:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des écritures comptables',
    });
  }
};

exports.createJournalEntry = async (req, res) => {
  try {
    const accessError = ensureAccountingEntriesWriteAccess(req, 'Vous n avez pas la permission de créer une écriture comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const {
      entryDate,
      journalCode,
      journalLabel,
      label,
      reference,
      debitAccountId,
      creditAccountId,
      sourceType,
      sourceId,
      enterpriseId,
      enterpriseName,
      status,
    } = req.body;

    const resolvedEnterpriseId = enterpriseId ? Number(enterpriseId) : req.user?.enterpriseId ? Number(req.user.enterpriseId) : null;
    const resolvedEnterpriseName = enterpriseName || req.user?.enterpriseName || null;
    const lines = normalizeEntryLinesPayload(req.body);

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour cette ecriture."
    );

    if (!String(label || '').trim() || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le libellé et au moins deux lignes comptables sont obligatoires',
      });
    }

    if (!Array.isArray(req.body.lines) && String(debitAccountId || '').trim() === String(creditAccountId || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Les comptes débit et crédit doivent être différents',
      });
    }

    const createdEntry = await AccountingPostingService.postEntry({
      entryDate,
      journalCode,
      journalLabel,
      label,
      reference,
      sourceType,
      sourceId,
      enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
      enterpriseName: resolvedEnterpriseName,
      status: status || 'POSTED',
      createdByUserId: req.user?.userId ? String(req.user.userId) : null,
      createdByEmail: req.user?.email || null,
      lines,
    });

    return res.status(201).json({
      success: true,
      data: createdEntry,
      message: 'Écriture comptable créée avec succès',
    });
  } catch (error) {
    console.error('Erreur création écriture comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la création de l écriture comptable',
    });
  }
};
