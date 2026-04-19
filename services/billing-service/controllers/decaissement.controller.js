const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const { recordPayment } = require('../utils/accountingWorkflow');
const { nextEntryNumber, computeSignedDelta, amount, ensureDefaultAccounts } = require('../utils/accounting');

const prisma = new PrismaClient();

const resolveTreasuryAccountingCode = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES' ? '531' : '512';

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

    const result = await prisma.$transaction(async (tx) => {
      await ensureDefaultAccounts(tx, req.user);

      const decaissement = await tx.decaissement.create({
        data: {
          numeroPiece: `DEC-${Date.now()}`,
          beneficiaryName,
          description,
          amountHT: amount(amountHT),
          amountTVA: amount(amountTVA),
          amountTTC: amount(amountTTC),
          paymentMethod,
          treasuryAccountId,
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
        const commitment = await tx.purchaseCommitment.findUnique({
          where: { id: commitmentId },
        });

        if (commitment) {
          await recordPayment(tx, { commitment, decaissement, user: req.user });
        }

        return decaissement;
      }

      const expenseAccount = await tx.accountingAccount.findUnique({
        where: { id: String(accountingAccountId) },
      });

      if (!expenseAccount) {
        throw new Error('Le compte de charge sélectionné est introuvable.');
      }

      const treasuryAccountingAccount = await tx.accountingAccount.findUnique({
        where: { code: resolveTreasuryAccountingCode(paymentMethod) },
      });

      if (!treasuryAccountingAccount) {
        throw new Error(
          `Le compte comptable ${resolveTreasuryAccountingCode(paymentMethod)} n est pas configuré dans le plan comptable.`
        );
      }

      const entryNumber = await nextEntryNumber(tx);
      await tx.accountingJournalEntry.create({
        data: {
          entryNumber,
          entryDate: decaissement.dateDecaissement || new Date(),
          journalCode: treasuryAccountingAccount.code === '531' ? 'CA' : 'BQ',
          journalLabel: treasuryAccountingAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
          label: `${decaissement.numeroPiece} - ${decaissement.description}`,
          reference: decaissement.reference || decaissement.numeroPiece,
          sourceType: 'DECAISSEMENT',
          sourceId: decaissement.id,
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

      return decaissement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation decaissement:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const decaissements = await prisma.decaissement.findMany({
      include: { treasuryAccount: true },
      orderBy: { dateDecaissement: 'desc' },
    });
    res.json({ success: true, data: decaissements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
