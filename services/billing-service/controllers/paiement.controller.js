const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const { resolveTreasuryAccountId } = require('../utils/treasury');
const { nextEntryNumber, computeSignedDelta } = require('../utils/accounting');
const MappingService = require('../core/services/AccountingMappingService');
const prisma = new PrismaClient();

const paymentMethodMap = {
  VIREMENT: 'VIREMENT',
  VIREMENT_BANCAIRE: 'VIREMENT',
  CHEQUE: 'CHEQUE',
  ESPECES: 'ESPECES',
  CARTE: 'CARTE',
  PRELEVEMENT: 'PRELEVEMENT',
};

const normalizeMethod = (value) => paymentMethodMap[String(value || '').toUpperCase()] || null;

const serializePaiement = (paiement) => ({
  id: paiement.id,
  factureId: paiement.factureId,
  montant: Number(paiement.montant || 0),
  datePaiement: paiement.datePaiement,
  modePaiement: paiement.methodePaiement,
  methodePaiement: paiement.methodePaiement,
  reference: paiement.reference || null,
  notes: paiement.notes || null,
  treasuryAccountId: paiement.treasuryAccountId || null,
  treasuryAccountName: paiement.treasuryAccount?.name || null,
  facture: paiement.facture || undefined,
  createdAt: paiement.createdAt,
  updatedAt: paiement.updatedAt,
});

/**
 * Crée un nouveau paiement
 */
exports.createPaiement = async (req, res) => {
  try {
    const { factureId, montant, datePaiement, methodePaiement, modePaiement, reference, notes, treasuryAccountId } = req.body;
    const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);

    if (!factureId || !normalizedMethod || !Number.isFinite(Number(montant))) {
      return res.status(400).json({ error: 'factureId, montant et methode de paiement sont requis' });
    }

    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: { paiements: true }
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const totalPaye = facture.paiements.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const montantNumerique = Number(montant);
    const restant = Math.max(Number(facture.montantTTC || 0) - totalPaye, 0);

    if (montantNumerique > restant) {
      return res.status(400).json({
        error: 'Le montant du paiement dépasse le reste à payer de la facture.',
      });
    }

    const resolvedTreasuryAccountId = await resolveTreasuryAccountId(prisma, {
      treasuryAccountId,
      paymentMethod: normalizedMethod,
      user: req.user,
    });

    const resultPaiement = await prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          factureId,
          montant: montantNumerique,
          datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
          methodePaiement: normalizedMethod,
          treasuryAccountId: resolvedTreasuryAccountId,
          reference,
          notes
        }
      });

      const totalPaiements = totalPaye + montantNumerique;
      const newStatus = totalPaiements >= facture.montantTTC ? 'PAYEE' : totalPaiements > 0 ? 'PARTIELLEMENT_PAYEE' : facture.status;

      if (newStatus !== facture.status) {
        await tx.facture.update({
          where: { id: factureId },
          data: { status: newStatus }
        });
      }

      const resolveTreasuryAccountingCode = (method) => String(method || '').toUpperCase() === 'ESPECES' ? '531' : '512';
      const treasuryAccountingAccount = await tx.accountingAccount.findUnique({
        where: { code: resolveTreasuryAccountingCode(normalizedMethod) }
      });
      const revenueAccountMapped = await MappingService.resolveAccount('INVOICE', 'REVENUE');
      const revenueAccount = revenueAccountMapped?.code ? await tx.accountingAccount.findFirst({
        where: { code: revenueAccountMapped.code }
      }) : null;

      if (treasuryAccountingAccount && revenueAccount) {
        const entryNumber = await nextEntryNumber(tx);
        await tx.accountingJournalEntry.create({
          data: {
            entryNumber,
            entryDate: paiement.datePaiement,
            journalCode: treasuryAccountingAccount.code === '531' ? 'CA' : 'BQ',
            journalLabel: treasuryAccountingAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
            label: `Paiement - Facture ${facture.numeroFacture || facture.id}`,
            reference: paiement.reference || `FAC-${facture.numeroFacture || facture.id}`,
            sourceType: 'PAYMENT',
            sourceId: paiement.id,
            createdByUserId: req.user?.userId ? String(req.user.userId) : null,
            createdByEmail: req.user?.email || null,
            lines: {
              create: [
                {
                  accountId: treasuryAccountingAccount.id,
                  side: AccountingEntrySide.DEBIT,
                  amount: montantNumerique,
                  description: `Paiement Facture ${facture.numeroFacture || facture.id}`,
                },
                {
                  accountId: revenueAccount.id,
                  side: AccountingEntrySide.CREDIT,
                  amount: montantNumerique,
                  description: `Encaissement Facture ${facture.numeroFacture || facture.id}`,
                }
              ]
            }
          }
        });
        await tx.accountingAccount.update({
          where: { id: treasuryAccountingAccount.id },
          data: { currentBalance: { increment: computeSignedDelta(treasuryAccountingAccount.type, AccountingEntrySide.DEBIT, montantNumerique) } }
        });
        await tx.accountingAccount.update({
          where: { id: revenueAccount.id },
          data: { currentBalance: { increment: computeSignedDelta(revenueAccount.type, AccountingEntrySide.CREDIT, montantNumerique) } }
        });
      }

      return paiement;
    });

    res.status(201).json({ success: true, data: serializePaiement(resultPaiement) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère tous les paiements d'une facture
 */
exports.getByFacture = async (req, res) => {
  try {
    const { factureId } = req.params;

    const paiements = await prisma.paiement.findMany({
      where: { factureId },
      include: { treasuryAccount: true },
      orderBy: { datePaiement: 'desc' }
    });

    res.json({ success: true, data: paiements.map(serializePaiement) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère le total des paiements d'une facture
 */
exports.getTotal = async (req, res) => {
  try {
    const { factureId } = req.params;

    const paiements = await prisma.paiement.findMany({
      where: { factureId }
    });

    const total = paiements.reduce((sum, p) => sum + p.montant, 0);

    res.json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprime un paiement
 */
exports.deletePaiement = async (req, res) => {
  try {
    const { id } = req.params;

    const paiement = await prisma.paiement.findUnique({
      where: { id }
    });

    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    await prisma.$transaction(async (tx) => {
      const entryToDelete = await tx.accountingJournalEntry.findFirst({
        where: { sourceType: 'PAYMENT', sourceId: id },
        include: { lines: { include: { account: true } } }
      });

      if (entryToDelete) {
        for (const line of entryToDelete.lines) {
          const inverseSide = line.side === AccountingEntrySide.DEBIT ? AccountingEntrySide.CREDIT : AccountingEntrySide.DEBIT;
          await tx.accountingAccount.update({
            where: { id: line.accountId },
            data: { currentBalance: { increment: computeSignedDelta(line.account.type, inverseSide, line.amount) } }
          });
        }
        await tx.accountingJournalEntryLine.deleteMany({ where: { journalEntryId: entryToDelete.id } });
        await tx.accountingJournalEntry.delete({ where: { id: entryToDelete.id } });
      }

      await tx.paiement.delete({ where: { id } });

      const facture = await tx.facture.findUnique({
        where: { id: paiement.factureId },
        include: { paiements: true }
      });
      const totalPaiements = facture.paiements.reduce((sum, p) => sum + p.montant, 0);

      if (totalPaiements < facture.montantTTC && facture.status === 'PAYEE') {
        await tx.facture.update({
          where: { id: paiement.factureId },
          data: { status: totalPaiements > 0 ? 'PARTIELLEMENT_PAYEE' : 'EMISE' }
        });
      }
    });

    res.json({ success: true, message: 'Paiement supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère tous les paiements avec filtres
 */
exports.getAllPaiements = async (req, res) => {
  try {
    const { dateDebut, dateFin, methodePaiement, modePaiement, factureId } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.datePaiement = {};
      if (dateDebut) where.datePaiement.gte = new Date(dateDebut);
      if (dateFin) where.datePaiement.lte = new Date(dateFin);
    }
    if (factureId) where.factureId = factureId;
    if (methodePaiement || modePaiement) {
      const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);
      if (normalizedMethod) where.methodePaiement = normalizedMethod;
    }

    const paiements = await prisma.paiement.findMany({
      where,
      include: {
        facture: true,
        treasuryAccount: true
      },
      orderBy: { datePaiement: 'desc' }
    });

    res.json({ success: true, data: paiements.map(serializePaiement) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
