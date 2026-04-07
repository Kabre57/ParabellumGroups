const { AccountingEntrySide, PurchaseCommitmentStatus } = require('@prisma/client');
const { nextEntryNumber, computeSignedDelta } = require('./accounting');

/**
 * Enregistre l'engagement comptable (D: 6xxx / C: 401)
 */
async function recordEngagement(tx, { commitment, user }) {
  const account401 = await tx.accountingAccount.findUnique({ where: { code: '401' } });
  // Par défaut 607 (Achats), on pourra affiner selon la catégorie plus tard
  const account607 = await tx.accountingAccount.findUnique({ where: { code: '607' } });

  if (!account401 || !account607) {
    throw new Error('Comptes comptables (401/607) non configurés');
  }

  const entryNumber = await nextEntryNumber(tx);
  const label = `Engagement BC ${commitment.sourceNumber} - ${commitment.supplierName || 'Fournisseur'}`;

  const entry = await tx.accountingJournalEntry.create({
    data: {
      entryNumber,
      journalCode: 'AC',
      journalLabel: 'Achats',
      label,
      reference: commitment.sourceNumber,
      sourceType: 'PURCHASE_ORDER',
      sourceId: commitment.sourceId,
      createdByUserId: user?.userId ? String(user.userId) : null,
      createdByEmail: user?.email || null,
      lines: {
        create: [
          {
            accountId: account607.id,
            side: AccountingEntrySide.DEBIT,
            amount: commitment.amountTTC,
            description: `Charge engagement ${commitment.sourceNumber}`,
          },
          {
            accountId: account401.id,
            side: AccountingEntrySide.CREDIT,
            amount: commitment.amountTTC,
            description: `Dette fournisseur estimée ${commitment.sourceNumber}`,
          },
        ],
      },
    },
  });

  // Mise à jour des soldes
  await tx.accountingAccount.update({
    where: { id: account607.id },
    data: { currentBalance: { increment: computeSignedDelta(account607.type, AccountingEntrySide.DEBIT, commitment.amountTTC) } },
  });

  await tx.accountingAccount.update({
    where: { id: account401.id },
    data: { currentBalance: { increment: computeSignedDelta(account401.type, AccountingEntrySide.CREDIT, commitment.amountTTC) } },
  });

  return entry;
}

/**
 * Enregistre la liquidation (Facture Fournisseur) et régularise si besoin
 */
async function recordLiquidation(tx, { commitment, invoice, user }) {
  const difference = invoice.montantTTC - commitment.amountTTC;

  if (Math.abs(difference) > 0.01) {
    // Écriture de régularisation séparée
    const account401 = await tx.accountingAccount.findUnique({ where: { code: '401' } });
    const account607 = await tx.accountingAccount.findUnique({ where: { code: '607' } });

    const entryNumber = await nextEntryNumber(tx);
    const label = `Régularisation Engagement BC ${commitment.sourceNumber} / Facture ${invoice.numeroFacture}`;

    await tx.accountingJournalEntry.create({
      data: {
        entryNumber,
        journalCode: 'AC',
        journalLabel: 'Achats',
        label,
        reference: invoice.numeroFacture,
        sourceType: 'SUPPLIER_INVOICE_REGUL',
        sourceId: invoice.id,
        createdByUserId: user?.userId ? String(user.userId) : null,
        createdByEmail: user?.email || null,
        lines: {
          create: [
            {
              accountId: account607.id,
              side: difference > 0 ? AccountingEntrySide.DEBIT : AccountingEntrySide.CREDIT,
              amount: Math.abs(difference),
              description: `Ajustement charge facture ${invoice.numeroFacture}`,
            },
            {
              accountId: account401.id,
              side: difference > 0 ? AccountingEntrySide.CREDIT : AccountingEntrySide.DEBIT,
              amount: Math.abs(difference),
              description: `Ajustement dette fournisseur facture ${invoice.numeroFacture}`,
            },
          ],
        },
      },
    });

    // Mise à jour des soldes
    await tx.accountingAccount.update({
      where: { id: account607.id },
      data: { currentBalance: { increment: computeSignedDelta(account607.type, difference > 0 ? AccountingEntrySide.DEBIT : AccountingEntrySide.CREDIT, Math.abs(difference)) } },
    });

    await tx.accountingAccount.update({
      where: { id: account401.id },
      data: { currentBalance: { increment: computeSignedDelta(account401.type, difference > 0 ? AccountingEntrySide.CREDIT : AccountingEntrySide.DEBIT, Math.abs(difference)) } },
    });
  }

  // Mise à jour du statut de l'engagement
  await tx.purchaseCommitment.update({
    where: { id: commitment.id },
    data: { status: PurchaseCommitmentStatus.LIQUIDE },
  });
}

/**
 * Enregistre le paiement (D: 401 / C: 512/531)
 */
async function recordPayment(tx, { commitment, decaissement, user }) {
  const account401 = await tx.accountingAccount.findUnique({ where: { code: '401' } });
  const treasuryAccount = await tx.treasuryAccount.findUnique({
    where: { id: decaissement.treasuryAccountId },
  });

  // On cherche le compte comptable lié au compte de trésorerie (ex: 512 ou 531)
  const treasuryCode = decaissement.paymentMethod === 'ESPECES' ? '531' : '512';
  const accountTreasury = await tx.accountingAccount.findUnique({ where: { code: treasuryCode } });

  if (!account401 || !accountTreasury) {
    throw new Error('Comptes comptables (401/Trésorerie) non configurés');
  }

  const entryNumber = await nextEntryNumber(tx);
  const label = `Paiement ${decaissement.numeroPiece} - Engagement ${commitment.sourceNumber}`;

  await tx.accountingJournalEntry.create({
    data: {
      entryNumber,
      journalCode: 'BQ', // ou CA pour caisse
      journalLabel: decaissement.paymentMethod === 'ESPECES' ? 'Caisse' : 'Banque',
      label,
      reference: decaissement.numeroPiece,
      sourceType: 'DECAISSEMENT',
      sourceId: decaissement.id,
      createdByUserId: user?.userId ? String(user.userId) : null,
      createdByEmail: user?.email || null,
      lines: {
        create: [
          {
            accountId: account401.id,
            side: AccountingEntrySide.DEBIT,
            amount: decaissement.amountTTC,
            description: `Règlement fournisseur BC ${commitment.sourceNumber}`,
          },
          {
            accountId: accountTreasury.id,
            side: AccountingEntrySide.CREDIT,
            amount: decaissement.amountTTC,
            description: `Sortie de fonds ${decaissement.numeroPiece}`,
          },
        ],
      },
    },
  });

  // Mise à jour des soldes
  await tx.accountingAccount.update({
    where: { id: account401.id },
    data: { currentBalance: { increment: computeSignedDelta(account401.type, AccountingEntrySide.DEBIT, decaissement.amountTTC) } },
  });

  await tx.accountingAccount.update({
    where: { id: accountTreasury.id },
    data: { currentBalance: { increment: computeSignedDelta(accountTreasury.type, AccountingEntrySide.CREDIT, decaissement.amountTTC) } },
  });

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
