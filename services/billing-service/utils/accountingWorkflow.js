const { PurchaseCommitmentStatus } = require('@prisma/client');
const AccountingPostingService = require('../core/services/AccountingPostingService');
const { getTreasuryAccountingAccountId } = require('./treasury');
const {
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
  resolveAccountingAccount,
} = require('./accountingAccountResolver');

/**
 * Enregistre l'engagement comptable (charge achat / dette fournisseur configurée)
 */
async function recordEngagement(tx, { commitment, user }) {
  const account401 = await resolveAccountingAccount(tx, 'SUPPLIER_PAYABLE');
  const account607 = await resolveAccountingAccount(tx, 'PURCHASE_EXPENSE');

  const label = `Engagement BC ${commitment.sourceNumber} - ${commitment.supplierName || 'Fournisseur'}`;

  const entry = await AccountingPostingService.postEntry(
    {
      entryDate: commitment.createdAt || new Date(),
      journalCode: 'AC',
      journalLabel: 'Achats',
      label,
      reference: commitment.sourceNumber,
      sourceType: 'PURCHASE_ORDER',
      sourceId: commitment.sourceId,
      enterpriseId: commitment.enterpriseId ?? null,
      enterpriseName: commitment.enterpriseName || null,
      createdByUserId: user?.userId ? String(user.userId) : null,
      createdByEmail: user?.email || null,
      manual: false,
      lines: [
        {
          accountId: account607.id,
          side: 'DEBIT',
          amount: commitment.amountTTC,
          description: `Charge engagement ${commitment.sourceNumber}`,
        },
        {
          accountId: account401.id,
          side: 'CREDIT',
          amount: commitment.amountTTC,
          description: `Dette fournisseur estimée ${commitment.sourceNumber}`,
        },
      ],
    },
    tx
  );

  return entry;
}

/**
 * Enregistre la liquidation (Facture Fournisseur) et régularise si besoin
 */
async function recordLiquidation(tx, { commitment, invoice, user }) {
  const difference = invoice.montantTTC - commitment.amountTTC;

  if (Math.abs(difference) > 0.01) {
    // Écriture de régularisation séparée
    const account401 = await resolveAccountingAccount(tx, 'SUPPLIER_PAYABLE');
    const account607 = await resolveAccountingAccount(tx, 'PURCHASE_EXPENSE');

    const label = `Régularisation Engagement BC ${commitment.sourceNumber} / Facture ${invoice.numeroFacture}`;

    await AccountingPostingService.postEntry(
      {
        entryDate: invoice.dateFacture || invoice.createdAt || new Date(),
        journalCode: 'AC',
        journalLabel: 'Achats',
        label,
        reference: invoice.numeroFacture,
        sourceType: 'SUPPLIER_INVOICE_REGUL',
        sourceId: invoice.id,
        enterpriseId: commitment.enterpriseId ?? null,
        enterpriseName: commitment.enterpriseName || null,
        createdByUserId: user?.userId ? String(user.userId) : null,
        createdByEmail: user?.email || null,
        manual: false,
        lines: [
          {
            accountId: account607.id,
            side: difference > 0 ? 'DEBIT' : 'CREDIT',
            amount: Math.abs(difference),
            description: `Ajustement charge facture ${invoice.numeroFacture}`,
          },
          {
            accountId: account401.id,
            side: difference > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(difference),
            description: `Ajustement dette fournisseur facture ${invoice.numeroFacture}`,
          },
        ],
      },
      tx
    );
  }

  // Mise à jour du statut de l'engagement
  await tx.purchaseCommitment.update({
    where: { id: commitment.id },
    data: { status: PurchaseCommitmentStatus.LIQUIDE },
  });
}

/**
 * Enregistre le paiement (débit fournisseur / crédit trésorerie)
 */
async function recordPayment(tx, { commitment, decaissement, user }) {
  const account401 = await resolveAccountingAccount(tx, 'SUPPLIER_PAYABLE');
  const preferredTreasuryAccountingAccountId = await getTreasuryAccountingAccountId(
    tx,
    decaissement.treasuryAccountId
  );
  const accountTreasury = await resolveAccountingAccount(
    tx,
    getTreasuryFamilyFromPaymentMethod(decaissement.paymentMethod),
    {
      preferredAccountId: preferredTreasuryAccountingAccountId,
      user,
    }
  );
  const treasuryJournal = await getTreasuryJournalMeta(tx, accountTreasury);

  if (!account401 || !accountTreasury) {
    throw new Error('Comptes comptables fournisseur / trésorerie non configurés');
  }

  const label = `Paiement ${decaissement.numeroPiece} - Engagement ${commitment.sourceNumber}`;

  await AccountingPostingService.postEntry({
    entryDate: decaissement.dateDecaissement || new Date(),
    journalCode: treasuryJournal.journalCode,
    journalLabel: treasuryJournal.journalLabel,
    label,
    reference: decaissement.numeroPiece,
    sourceType: 'DECAISSEMENT',
    sourceId: decaissement.id,
    enterpriseId: decaissement.enterpriseId ?? commitment.enterpriseId ?? null,
    enterpriseName: decaissement.enterpriseName || commitment.enterpriseName || null,
    createdByUserId: user?.userId ? String(user.userId) : null,
    createdByEmail: user?.email || null,
    manual: false,
    lines: [
      {
        accountId: account401.id,
        side: 'DEBIT',
        amount: decaissement.amountTTC,
        description: `Règlement fournisseur BC ${commitment.sourceNumber}`,
      },
      {
        accountId: accountTreasury.id,
        side: 'CREDIT',
        amount: decaissement.amountTTC,
        description: `Sortie de fonds ${decaissement.numeroPiece}`,
      },
    ],
  }, tx);

  if (decaissement.treasuryAccountId) {
    await tx.treasuryAccount.update({
      where: { id: decaissement.treasuryAccountId },
      data: {
        currentBalance: {
          decrement: decaissement.amountTTC,
        },
      },
    });
  }

  // Mise à jour de l'engagement
  await tx.purchaseCommitment.update({
    where: { id: commitment.id },
    data: { status: PurchaseCommitmentStatus.PAYE },
  });
}

module.exports = {
  recordEngagement,
  recordLiquidation,
  recordPayment,
};
