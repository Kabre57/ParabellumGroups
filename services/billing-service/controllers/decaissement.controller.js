const { PrismaClient, AccountingEntrySide, PurchaseCommitmentStatus } = require('@prisma/client');
const { recordEngagement, recordLiquidation, recordPayment } = require('../utils/accountingWorkflow');
const { nextEntryNumber, computeSignedDelta, amount } = require('../utils/accounting');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');
const {
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  resolveAccountingAccount,
} = require('../utils/accountingAccountResolver');

const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const {
      beneficiaryName,
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
      dateDecaissement,
      reference,
      notes,
      commitmentId,
      factureFournisseurId,
      accountingAccountId,
    } = req.body;

    if (!commitmentId && !accountingAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un compte de charge pour l imputation comptable.',
      });
    }

    const resolvedEnterpriseId = enterpriseId ? Number(enterpriseId) : req.user?.enterpriseId ? Number(req.user.enterpriseId) : null;
    const resolvedEnterpriseName = enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour ce decaissement."
    );

    const result = await prisma.$transaction(async (tx) => {
      const decaissement = await tx.decaissement.create({
        data: {
          numeroPiece: `DEC-${Date.now()}`,
          beneficiaryName,
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
          dateDecaissement: dateDecaissement ? new Date(dateDecaissement) : new Date(),
          reference,
          notes,
          status: 'VALIDE',
          commitmentId,
          factureFournisseurId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
      });

      if (commitmentId) {
        await tx.purchaseCommitment.update({
          where: { id: commitmentId },
          data: { status: PurchaseCommitmentStatus.ORDONNANCE },
        });

        return decaissement;
      }

      return decaissement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation decaissement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || '').toUpperCase();

    if (!['DECAISSE', 'ANNULE'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Statut de décaissement invalide.',
      });
    }

    const decaissement = await prisma.decaissement.findUnique({
      where: { id },
    });

    if (!decaissement) {
      return res.status(404).json({
        success: false,
        message: 'Décaissement introuvable.',
      });
    }

    await assertEnterpriseInScope(
      req,
      decaissement.enterpriseId,
      "Vous n'avez pas acces a ce decaissement."
    );

    if (nextStatus === 'ANNULE') {
      const updated = await prisma.decaissement.update({
        where: { id },
        data: {
          status: 'ANNULE',
          approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
          approvedByEmail: req.user?.email || null,
        },
      });
      return res.json({ success: true, data: updated });
    }

    if (decaissement.status === 'DECAISSE') {
      return res.json({ success: true, data: decaissement });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (decaissement.commitmentId) {
        const commitment = await tx.purchaseCommitment.findUnique({
          where: { id: decaissement.commitmentId },
          include: { factureFournisseur: true },
        });

        if (!commitment) {
          throw new Error("L'engagement lié à ce décaissement est introuvable.");
        }

        const existingEngagementEntry = await tx.accountingJournalEntry.findFirst({
          where: {
            sourceType: 'PURCHASE_ORDER',
            sourceId: commitment.sourceId,
          },
        });

        if (!existingEngagementEntry) {
          await recordEngagement(tx, { commitment, user: req.user });
        }

        if (
          commitment.factureFournisseur &&
          [PurchaseCommitmentStatus.LIQUIDE, PurchaseCommitmentStatus.ORDONNANCE].includes(commitment.status)
        ) {
          const existingLiquidationEntry = await tx.accountingJournalEntry.findFirst({
            where: {
              sourceType: 'SUPPLIER_INVOICE_REGUL',
              sourceId: commitment.factureFournisseur.id,
            },
          });

          if (!existingLiquidationEntry) {
            await recordLiquidation(tx, {
              commitment,
              invoice: commitment.factureFournisseur,
              user: req.user,
            });
          }
        }

        const updatedDecaissement = await tx.decaissement.update({
          where: { id },
          data: {
            status: 'DECAISSE',
            approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
            approvedByEmail: req.user?.email || null,
          },
        });

        await recordPayment(tx, { commitment, decaissement: updatedDecaissement, user: req.user });

        if (updatedDecaissement.factureFournisseurId) {
          await tx.factureFournisseur.update({
            where: { id: updatedDecaissement.factureFournisseurId },
            data: { status: 'PAYEE' },
          });
        }

        return updatedDecaissement;
      }

      const expenseAccount = decaissement.accountingAccountId
        ? await tx.accountingAccount.findUnique({
            where: { id: String(decaissement.accountingAccountId) },
          })
        : null;

      if (!expenseAccount) {
        throw new Error('Le compte de charge sélectionné est introuvable.');
      }

      const treasuryAccountingAccount = await resolveAccountingAccount(
        tx,
        getTreasuryFamilyFromPaymentMethod(decaissement.paymentMethod),
        {
          user: req.user,
        }
      );
      const treasuryJournal = await getTreasuryJournalMeta(tx, treasuryAccountingAccount);

      const entryNumber = await nextEntryNumber(tx);
      await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate: decaissement.dateDecaissement || new Date(),
          journalCode: treasuryJournal.journalCode,
          journalLabel: treasuryJournal.journalLabel,
          label: `${decaissement.numeroPiece} - ${decaissement.description}`,
          reference: decaissement.reference || decaissement.numeroPiece,
          sourceType: 'DECAISSEMENT',
          sourceId: decaissement.id,
          enterpriseId: decaissement.enterpriseId ?? null,
          enterpriseName: decaissement.enterpriseName || null,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
          lines: {
            create: [
              {
                accountId: expenseAccount.id,
                side: AccountingEntrySide.DEBIT,
                amount: decaissement.amountTTC,
                description: decaissement.description,
              },
              {
                accountId: treasuryAccountingAccount.id,
                side: AccountingEntrySide.CREDIT,
                amount: decaissement.amountTTC,
                description: `Décaissement ${decaissement.numeroPiece}`,
              },
            ],
          },
        },
      });

      await tx.accountingAccount.update({
        where: { id: expenseAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(expenseAccount.type, AccountingEntrySide.DEBIT, decaissement.amountTTC),
          },
        },
      });

      await tx.accountingAccount.update({
        where: { id: treasuryAccountingAccount.id },
        data: {
          currentBalance: {
            increment: computeSignedDelta(
              treasuryAccountingAccount.type,
              AccountingEntrySide.CREDIT,
              decaissement.amountTTC
            ),
          },
        },
      });

      return tx.decaissement.update({
        where: { id },
        data: {
          status: 'DECAISSE',
          approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
          approvedByEmail: req.user?.email || null,
        },
      });
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erreur validation decaissement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const decaissements = await prisma.decaissement.findMany({
      where: await applyEnterpriseScope({
        req,
        where: {},
      }),
      include: { treasuryAccount: true },
      orderBy: { dateDecaissement: 'desc' },
    });
    res.json({ success: true, data: decaissements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
