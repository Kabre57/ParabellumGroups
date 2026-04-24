const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const { nextEntryNumber, computeSignedDelta, amount } = require('../utils/accounting');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const resolveTreasuryAccountingCode = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES' ? '531' : '512';

exports.create = async (req, res) => {
  try {
    const {
      clientName,
      description,
      amountHT,
      amountTVA,
      amountTTC,
      paymentMethod,
      treasuryAccountId,
      enterpriseId,
      enterpriseName,
      serviceId,
      serviceName,
      dateEncaissement,
      reference,
      notes,
      factureClientId,
      accountingAccountId,
    } = req.body;

    if (!accountingAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un compte de produit pour l imputation comptable.',
      });
    }

    const resolvedEnterpriseId = enterpriseId ? Number(enterpriseId) : req.user?.enterpriseId ? Number(req.user.enterpriseId) : null;
    const resolvedEnterpriseName = enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour cet encaissement."
    );

    const result = await prisma.$transaction(async (tx) => {
      const revenueAccount = await tx.accountingAccount.findUnique({
        where: { id: String(accountingAccountId) },
      });

      if (!revenueAccount) {
        throw new Error('Le compte de produit sélectionné est introuvable.');
      }

      const treasuryAccountingAccount = await tx.accountingAccount.findUnique({
        where: { code: resolveTreasuryAccountingCode(paymentMethod) },
      });

      if (!treasuryAccountingAccount) {
        throw new Error(
          `Le compte comptable ${resolveTreasuryAccountingCode(paymentMethod)} n est pas configuré dans le plan comptable.`
        );
      }

      const encaissement = await tx.encaissement.create({
        data: {
          numeroPiece: `ENC-${Date.now()}`,
          clientName,
          description,
          enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
          enterpriseName: resolvedEnterpriseName,
          amountHT: amount(amountHT),
          amountTVA: amount(amountTVA),
          amountTTC: amount(amountTTC),
          paymentMethod,
          treasuryAccountId,
          serviceId: serviceId ? Number(serviceId) : null,
          serviceName,
          dateEncaissement: dateEncaissement ? new Date(dateEncaissement) : new Date(),
          reference,
          notes,
          factureClientId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
      });

      const entryNumber = await nextEntryNumber(tx);
      await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate: encaissement.dateEncaissement || new Date(),
          journalCode: treasuryAccountingAccount.code === '531' ? 'CA' : 'BQ',
          journalLabel: treasuryAccountingAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
          label: `${encaissement.numeroPiece} - ${encaissement.description}`,
          reference: encaissement.reference || encaissement.numeroPiece,
          sourceType: 'ENCAISSEMENT',
          sourceId: encaissement.id,
          enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
          enterpriseName: resolvedEnterpriseName,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
          lines: {
            create: [
              {
                accountId: treasuryAccountingAccount.id,
                side: AccountingEntrySide.DEBIT,
                amount: encaissement.amountTTC,
                description: `Encaissement ${encaissement.numeroPiece}`,
              },
              {
                accountId: revenueAccount.id,
                side: AccountingEntrySide.CREDIT,
                amount: encaissement.amountTTC,
                description: encaissement.description,
              },
            ],
          },
        },
      });

      await tx.accountingAccount.update({
        where: { id: treasuryAccountingAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(treasuryAccountingAccount.type, AccountingEntrySide.DEBIT, encaissement.amountTTC),
          },
        },
      });

      await tx.accountingAccount.update({
        where: { id: revenueAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(revenueAccount.type, AccountingEntrySide.CREDIT, encaissement.amountTTC),
          },
        },
      });

      return encaissement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation encaissement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const encaissements = await prisma.encaissement.findMany({
      where: await applyEnterpriseScope({
        req,
        where: {},
      }),
      include: { treasuryAccount: true },
      orderBy: { dateEncaissement: 'desc' },
    });
    res.json({ success: true, data: encaissements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
