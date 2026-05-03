const { PrismaClient, AccountingAccountType } = require('@prisma/client');
const { amount } = require('../utils/accounting');
const MappingService = require('../core/services/AccountingMappingService');
const AccountingPostingService = require('../core/services/AccountingPostingService');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');
const { enrichEncaissementsWithInvoiceContext } = require('../utils/encaissementEnrichment');
const { getTreasuryAccountingAccountId, resolveTreasuryAccountId } = require('../utils/treasury');
const {
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  resolveAccountingAccount,
} = require('../utils/accountingAccountResolver');

const prisma = new PrismaClient();

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const ensureManualAccountingAccount = (account) => {
  if (!account || account.isActive === false) {
    throw validationError('Le compte comptable sélectionné est introuvable ou inactif.');
  }

  if (account.allowManualPosting === false) {
    throw validationError("Le compte comptable sélectionné n'autorise pas la saisie manuelle.");
  }

  return account;
};

const ensureVatAccountingAccount = (account) => {
  if (!account || account.isActive === false) {
    throw validationError('Le compte TVA selectionne est introuvable ou inactif.');
  }

  if (account.type !== AccountingAccountType.LIABILITY) {
    throw validationError('Le compte TVA d un encaissement doit etre un compte de passif, par exemple TVA collectee.');
  }

  if (account.allowManualPosting === false) {
    throw validationError("Le compte TVA selectionne n'autorise pas la saisie manuelle.");
  }

  return account;
};

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
      vatAccountingAccountId,
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
      const resolvedTreasuryAccountId = await resolveTreasuryAccountId(tx, {
        treasuryAccountId,
        paymentMethod,
        user: req.user,
      });

      if (accountingAccountId) {
        const revenueAccount = await tx.accountingAccount.findUnique({
          where: { id: String(accountingAccountId) },
        });

        ensureManualAccountingAccount(revenueAccount);
      }

      let resolvedVatAccountingAccountId = null;
      if (vatAccountingAccountId) {
        const vatAccount = await tx.accountingAccount.findUnique({
          where: { id: String(vatAccountingAccountId) },
        });

        resolvedVatAccountingAccountId = ensureVatAccountingAccount(vatAccount).id;
      }

      if (!factureClientId && amount(amountTVA) > 0 && !resolvedVatAccountingAccountId) {
        throw validationError('Veuillez selectionner un compte TVA collectee pour cet encaissement.');
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
          treasuryAccountId: resolvedTreasuryAccountId,
          accountingAccountId: accountingAccountId || null,
          vatAccountingAccountId: resolvedVatAccountingAccountId,
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
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
      const resolvedTreasuryAccountId = await resolveTreasuryAccountId(tx, {
        treasuryAccountId: encaissement.treasuryAccountId,
        paymentMethod: encaissement.paymentMethod,
        user: req.user,
      });
      const preferredTreasuryAccountingAccountId = await getTreasuryAccountingAccountId(
        tx,
        resolvedTreasuryAccountId
      );
      const treasuryAccountingAccount = await resolveAccountingAccount(
        tx,
        getTreasuryFamilyFromPaymentMethod(encaissement.paymentMethod),
        {
          preferredAccountId: preferredTreasuryAccountingAccountId,
          enterpriseId: encaissement.enterpriseId,
          user: req.user,
        }
      );
      const treasuryJournal = await getTreasuryJournalMeta(tx, treasuryAccountingAccount, { enterpriseId: encaissement.enterpriseId });

      let creditAccount = null;
      if (encaissement.factureClientId) {
        const customerAccount = await MappingService.resolveAccount('PAYMENT', 'CREDIT_CUSTOMER', encaissement.enterpriseId);
        creditAccount = await resolveAccountingAccount(tx, 'CUSTOMER_RECEIVABLE', {
          preferredAccountId: customerAccount?.accountId,
          preferredCode: customerAccount?.code,
          enterpriseId: encaissement.enterpriseId,
          user: req.user,
        });
      } else if (encaissement.accountingAccountId) {
        creditAccount = await tx.accountingAccount.findUnique({
          where: { id: String(encaissement.accountingAccountId) },
        });
        ensureManualAccountingAccount(creditAccount);
      }

      if (!creditAccount) {
        throw new Error("Aucun compte de contrepartie n'est configuré pour cet encaissement.");
      }

      const totalAmount = amount(encaissement.amountTTC);
      const vatAmount = amount(encaissement.amountTVA);
      const baseAmount = amount(encaissement.amountHT) || Math.max(totalAmount - vatAmount, 0);
      const shouldSplitVat = !encaissement.factureClientId && vatAmount > 0 && encaissement.vatAccountingAccountId;
      const postingLines = [
        {
          accountId: treasuryAccountingAccount.id,
          side: 'DEBIT',
          amount: totalAmount,
          description: `Encaissement ${encaissement.numeroPiece}`,
        },
      ];

      if (shouldSplitVat) {
        const vatAccount = await tx.accountingAccount.findUnique({
          where: { id: String(encaissement.vatAccountingAccountId) },
        });
        ensureVatAccountingAccount(vatAccount);

        postingLines.push(
          {
            accountId: creditAccount.id,
            side: 'CREDIT',
            amount: baseAmount,
            description: encaissement.description,
          },
          {
            accountId: vatAccount.id,
            side: 'CREDIT',
            amount: vatAmount,
            description: `TVA collectee ${encaissement.numeroPiece}`,
          }
        );
      } else {
        postingLines.push({
          accountId: creditAccount.id,
          side: 'CREDIT',
          amount: totalAmount,
          description: encaissement.description,
        });
      }

      await AccountingPostingService.postEntry({
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
        manual: false,
        lines: postingLines,
      }, tx);

      if (resolvedTreasuryAccountId) {
        await tx.treasuryAccount.update({
          where: { id: resolvedTreasuryAccountId },
          data: {
            currentBalance: {
              increment: amount(encaissement.amountTTC),
            },
          },
        });
      }

      return tx.encaissement.update({
        where: { id },
        data: {
          status: 'VALIDE',
          treasuryAccountId: resolvedTreasuryAccountId,
          approvedByUserId: req.user?.userId ? String(req.user.userId) : null,
          approvedByEmail: req.user?.email || null,
        },
      });
    });

    const [enriched] = await enrichEncaissementsWithInvoiceContext(prisma, req, [updated]);
    res.json({ success: true, data: enriched || updated });
  } catch (error) {
    console.error("Erreur validation encaissement:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      code: error.code,
      family: error.family,
      expectedType: error.expectedType,
    });
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
