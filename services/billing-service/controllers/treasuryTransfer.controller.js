const { PrismaClient, AccountingAccountType, AccountingEntrySide } = require('@prisma/client');
const AccountingPostingService = require('../core/services/AccountingPostingService');
const { ensureAccountingReadAccess, ensureAccountingTreasuryWriteAccess } = require('../utils/accounting');
const { normalizeTreasuryCurrency } = require('../utils/treasury');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const accessError = ensureAccountingReadAccess(req);
  if (accessError) return res.status(accessError.status).json(accessError.body);

  try {
    const where = {};
    if (req.query.startDate || req.query.endDate) {
      where.date = {};
      if (req.query.startDate) where.date.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.date.lte = new Date(req.query.endDate);
    }
    if (req.query.treasuryAccountId) {
      where.OR = [
        { sourceTreasuryAccountId: String(req.query.treasuryAccountId) },
        { destinationTreasuryAccountId: String(req.query.treasuryAccountId) },
      ];
    }
    const transfers = await prisma.treasuryTransfer.findMany({
      where,
      include: { sourceAccount: true, destinationAccount: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Erreur de lecture des transferts internes :', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de charger les transferts internes.' });
  }
};

exports.create = async (req, res) => {
  const accessError = ensureAccountingTreasuryWriteAccess(req, 'Vous n’avez pas la permission de transférer des fonds.');
  if (accessError) return res.status(accessError.status).json(accessError.body);

  const { sourceTreasuryAccountId, destinationTreasuryAccountId, amount: rawAmount, date, reference, notes } = req.body || {};
  const transferAmount = Number(rawAmount);
  const transferDate = new Date(date);
  const normalizedReference = String(reference || '').trim();

  if (!sourceTreasuryAccountId || !destinationTreasuryAccountId || sourceTreasuryAccountId === destinationTreasuryAccountId) {
    return res.status(400).json({ success: false, message: 'Choisissez deux caisses différentes.' });
  }
  if (!Number.isFinite(transferAmount) || transferAmount <= 0 || Math.abs(transferAmount * 100 - Math.round(transferAmount * 100)) > 1e-8) {
    return res.status(400).json({ success: false, message: 'Le montant doit être positif et comporter au maximum deux décimales.' });
  }
  if (!date || Number.isNaN(transferDate.getTime()) || !normalizedReference) {
    return res.status(400).json({ success: false, message: 'La date et la référence sont obligatoires.' });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ids = [String(sourceTreasuryAccountId), String(destinationTreasuryAccountId)];
      const accounts = await tx.treasuryAccount.findMany({
        where: { id: { in: ids }, isActive: true },
        include: { accountingAccount: true },
      });
      const source = accounts.find((account) => account.id === ids[0]);
      const destination = accounts.find((account) => account.id === ids[1]);
      if (!source || !destination) {
        const error = new Error('Une des caisses est introuvable ou inactive.'); error.statusCode = 404; throw error;
      }
      if (normalizeTreasuryCurrency(source.currency) !== normalizeTreasuryCurrency(destination.currency)) {
        const error = new Error('Les deux caisses doivent utiliser la même devise.'); error.statusCode = 400; throw error;
      }
      for (const account of [source, destination]) {
        if (!account.accountingAccount || !account.accountingAccount.isActive || account.accountingAccount.type !== AccountingAccountType.ASSET) {
          const error = new Error(`Associez un compte comptable actif de type actif à la caisse « ${account.name} » avant le transfert.`); error.statusCode = 422; throw error;
        }
      }

      const debit = await tx.treasuryAccount.updateMany({
        where: { id: source.id, isActive: true, currentBalance: { gte: transferAmount } },
        data: { currentBalance: { decrement: transferAmount } },
      });
      if (!debit.count) {
        const error = new Error('Le solde disponible de la caisse source est insuffisant.'); error.statusCode = 422; throw error;
      }
      const credit = await tx.treasuryAccount.updateMany({
        where: { id: destination.id, isActive: true },
        data: { currentBalance: { increment: transferAmount } },
      });
      if (!credit.count) {
        const error = new Error('La caisse destinataire a été désactivée avant le transfert.'); error.statusCode = 409; throw error;
      }

      const enterpriseId = req.user?.enterpriseId !== undefined && req.user?.enterpriseId !== null
        ? Number(req.user.enterpriseId)
        : null;
      const transfer = await tx.treasuryTransfer.create({
        data: {
          sourceTreasuryAccountId: source.id,
          destinationTreasuryAccountId: destination.id,
          amount: transferAmount,
          date: transferDate,
          reference: normalizedReference,
          notes: notes ? String(notes).trim() : null,
          enterpriseId: Number.isInteger(enterpriseId) ? enterpriseId : null,
          enterpriseName: req.user?.enterpriseName || null,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
      });

      const entry = await AccountingPostingService.postEntry({
        entryDate: transferDate,
        journalCode: 'OD',
        journalLabel: 'Transferts internes de trésorerie',
        label: `Transfert interne de ${source.name} vers ${destination.name}`,
        reference: normalizedReference,
        sourceType: 'TREASURY_TRANSFER',
        sourceId: transfer.id,
        enterpriseId: Number.isInteger(enterpriseId) ? enterpriseId : null,
        enterpriseName: req.user?.enterpriseName || null,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
        manual: false,
        lines: [
          { accountId: destination.accountingAccountId, side: AccountingEntrySide.DEBIT, amount: transferAmount, description: `Entrée dans ${destination.name}`, currency: normalizeTreasuryCurrency(source.currency) },
          { accountId: source.accountingAccountId, side: AccountingEntrySide.CREDIT, amount: transferAmount, description: `Sortie de ${source.name}`, currency: normalizeTreasuryCurrency(source.currency) },
        ],
      }, tx);

      return { ...transfer, sourceAccount: source, destinationAccount: destination, accountingEntry: entry };
    });

    return res.status(201).json({ success: true, data: created, message: 'Transfert interne enregistré.' });
  } catch (error) {
    console.error('Erreur lors du transfert interne :', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Le transfert interne a échoué.' });
  }
};
