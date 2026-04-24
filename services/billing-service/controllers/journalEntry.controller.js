const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const {
  amount,
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
  parseDate,
  resolveDateRange,
  nextEntryNumber,
  computeSignedDelta,
  serializeJournalEntry,
} = require('../utils/accounting');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const buildWhere = ({ startDate, endDate, search }) => {
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

  return where;
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
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer une écriture comptable');
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
      amount: entryAmount,
      sourceType,
      sourceId,
      enterpriseId,
      enterpriseName,
    } = req.body;

    const normalizedLabel = String(label || '').trim();
    const normalizedJournalCode = String(journalCode || 'OD').trim().toUpperCase();
    const normalizedJournalLabel = String(journalLabel || 'Opérations diverses').trim();
    const normalizedDebitAccountId = String(debitAccountId || '').trim();
    const normalizedCreditAccountId = String(creditAccountId || '').trim();
    const numericAmount = amount(entryAmount);
    const normalizedEntryDate = parseDate(entryDate) || new Date();
    const resolvedEnterpriseId = enterpriseId ? Number(enterpriseId) : req.user?.enterpriseId ? Number(req.user.enterpriseId) : null;
    const resolvedEnterpriseName = enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour cette ecriture."
    );

    if (!normalizedLabel || !normalizedDebitAccountId || !normalizedCreditAccountId || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le libellé, les comptes débit/crédit et le montant sont obligatoires',
      });
    }

    if (normalizedDebitAccountId === normalizedCreditAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Les comptes débit et crédit doivent être différents',
      });
    }

    const [debitAccount, creditAccount] = await Promise.all([
      prisma.accountingAccount.findUnique({ where: { id: normalizedDebitAccountId } }),
      prisma.accountingAccount.findUnique({ where: { id: normalizedCreditAccountId } }),
    ]);

    if (!debitAccount || !creditAccount) {
      return res.status(404).json({
        success: false,
        message: 'Un des comptes comptables sélectionnés est introuvable',
      });
    }

    const createdEntry = await prisma.$transaction(async (tx) => {
      const entryNumber = await nextEntryNumber(tx);

      const entry = await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate: normalizedEntryDate,
          journalCode: normalizedJournalCode,
          journalLabel: normalizedJournalLabel,
          label: normalizedLabel,
          reference: reference ? String(reference).trim() : null,
          sourceType: sourceType ? String(sourceType).trim() : null,
          sourceId: sourceId ? String(sourceId).trim() : null,
          enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
          enterpriseName: resolvedEnterpriseName,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
          lines: {
            create: [
              {
                accountId: debitAccount.id,
                side: AccountingEntrySide.DEBIT,
                amount: numericAmount,
                description: normalizedLabel,
              },
              {
                accountId: creditAccount.id,
                side: AccountingEntrySide.CREDIT,
                amount: numericAmount,
                description: normalizedLabel,
              },
            ],
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

      await tx.accountingAccount.update({
        where: { id: debitAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(debitAccount.type, AccountingEntrySide.DEBIT, numericAmount),
          },
        },
      });

      await tx.accountingAccount.update({
        where: { id: creditAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(creditAccount.type, AccountingEntrySide.CREDIT, numericAmount),
          },
        },
      });

      return entry;
    });

    return res.status(201).json({
      success: true,
      data: serializeJournalEntry(createdEntry),
      message: 'Écriture comptable créée avec succès',
    });
  } catch (error) {
    console.error('Erreur création écriture comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l écriture comptable',
    });
  }
};
