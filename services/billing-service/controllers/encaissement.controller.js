const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const { nextEntryNumber, computeSignedDelta, amount } = require('../utils/accounting');
const MappingService = require('../core/services/AccountingMappingService');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');
const { enrichEncaissementsWithInvoiceContext } = require('../utils/encaissementEnrichment');
const {
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  resolveAccountingAccount,
} = require('../utils/accountingAccountResolver');

const prisma = new PrismaClient();

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

    if (!factureClientId && !accountingAccountId) {
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
      if (accountingAccountId) {
        const revenueAccount = await tx.accountingAccount.findUnique({
          where: { id: String(accountingAccountId) },
        });

        if (!revenueAccount) {
          throw new Error('Le compte de produit sélectionné est introuvable.');
        }
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
          accountingAccountId: accountingAccountId || null,
          serviceId: serviceId ? Number(serviceId) : null,
          serviceName,
          dateEncaissement: dateEncaissement ? new Date(dateEncaissement) : new Date(),
          reference,
          notes,
          status: 'EN_ATTENTE',
          factureClientId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
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

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || '').toUpperCase();

    if (!['VALIDE', 'ANNULE'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Le statut d'encaissement demandé est invalide.",
      });
    }

    const encaissement = await prisma.encaissement.findUnique({
      where: { id },
    });

    if (!encaissement) {
      return res.status(404).json({
        success: false,
        message: 'Encaissement introuvable.',
      });
    }

    await assertEnterpriseInScope(
      req,
      encaissement.enterpriseId,
      "Vous n'avez pas acces a cet encaissement."
    );

    if (nextStatus === 'ANNULE') {
      const updated = await prisma.encaissement.update({
        where: { id },
        data: {
          status: 'ANNULE',
          approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
          approvedByEmail: req.user?.email || null,
        },
      });

      const [enriched] = await enrichEncaissementsWithInvoiceContext(prisma, req, [updated]);
      return res.json({ success: true, data: enriched || updated });
    }

    if (encaissement.status === 'VALIDE') {
      const [enriched] = await enrichEncaissementsWithInvoiceContext(prisma, req, [encaissement]);
      return res.json({ success: true, data: enriched || encaissement });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const treasuryAccountingAccount = await resolveAccountingAccount(
        tx,
        getTreasuryFamilyFromPaymentMethod(encaissement.paymentMethod),
        {
          user: req.user,
        }
      );
      const treasuryJournal = await getTreasuryJournalMeta(tx, treasuryAccountingAccount);

      let creditAccount = null;
      if (encaissement.factureClientId) {
        const customerAccount = await MappingService.resolveAccount('PAYMENT', 'CREDIT_CUSTOMER');
        creditAccount = await resolveAccountingAccount(tx, 'CUSTOMER_RECEIVABLE', {
          preferredAccountId: customerAccount?.accountId,
          preferredCode: customerAccount?.code,
          user: req.user,
        });
      } else if (encaissement.accountingAccountId) {
        creditAccount = await tx.accountingAccount.findUnique({
          where: { id: String(encaissement.accountingAccountId) },
        });
      }

      if (!creditAccount) {
        throw new Error("Aucun compte de contrepartie n'est configuré pour cet encaissement.");
      }

      const entryNumber = await nextEntryNumber(tx);
      await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate: encaissement.dateEncaissement || new Date(),
          journalCode: treasuryJournal.journalCode,
          journalLabel: treasuryJournal.journalLabel,
          label: `${encaissement.numeroPiece} - ${encaissement.description}`,
          reference: encaissement.reference || encaissement.numeroPiece,
          sourceType: 'ENCAISSEMENT',
          sourceId: encaissement.id,
          enterpriseId: encaissement.enterpriseId ?? null,
          enterpriseName: encaissement.enterpriseName || null,
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
                accountId: creditAccount.id,
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
        where: { id: creditAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(creditAccount.type, AccountingEntrySide.CREDIT, encaissement.amountTTC),
          },
        },
      });

      return tx.encaissement.update({
        where: { id },
        data: {
          status: 'VALIDE',
          approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
          approvedByEmail: req.user?.email || null,
        },
      });
    });

    const [enriched] = await enrichEncaissementsWithInvoiceContext(prisma, req, [updated]);
    res.json({ success: true, data: enriched || updated });
  } catch (error) {
    console.error("Erreur validation encaissement:", error.message);
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
    const enrichedEncaissements = await enrichEncaissementsWithInvoiceContext(prisma, req, encaissements);
    res.json({ success: true, data: enrichedEncaissements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
