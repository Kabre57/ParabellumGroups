const {
  MappingService,
  buildEntryId,
  getTreasuryJournalMeta,
  prisma,
  resolveTreasuryAccountingReference,
  safeAmount,
  treasuryTypeFromPaymentMethod,
} = require('./shared');

// Produit les lignes comptables affichées avec les écritures manuelles existantes.
const buildAccountingEntries = async ({
  factures, decaissements, requestedEnterpriseId, disbursedVouchers, manualEntrySourceKeys,
  manualEntries, receivedVouchers,
}) => {
    const entries = [];

    for (const invoice of factures.filter((i) => !['BROUILLON', 'ANNULEE'].includes(String(i.status)))) {
      const eid = invoice.enterpriseId || requestedEnterpriseId;
      const revenueAccount = await MappingService.resolveAccount('INVOICE', 'REVENUE', eid);
      const clientAccount = await MappingService.resolveAccount('INVOICE', 'DEBIT_CUSTOMER', eid);

      entries.push({
        id: buildEntryId('invoice', invoice.id),
        date: invoice.dateEmission,
        journalCode: 'VT',
        journalLabel: 'Journal des ventes',
        enterpriseId: invoice.enterpriseId || null,
        enterpriseName: invoice.enterpriseName || null,
        accountDebit: clientAccount?.code || '411000',
        accountDebitLabel: clientAccount?.label || 'Clients',
        accountCredit: revenueAccount?.code || '701000',
        accountCreditLabel: revenueAccount?.label || 'Ventes',
        label: `Facture ${invoice.numeroFacture}`,
        debit: safeAmount(invoice.montantHT),
        credit: safeAmount(invoice.montantHT),
        reference: invoice.numeroFacture,
        sourceType: 'INVOICE',
        sourceId: invoice.id,
      });
    }

    for (const d of disbursedVouchers) {
      if (manualEntrySourceKeys.has(`DECAISSEMENT:${d.id}`)) continue;
      const eid = d.enterpriseId || requestedEnterpriseId;
      const expenseAccount = await MappingService.resolveAccount('DECAISSEMENT', d.expenseCategory, eid);
      const supplierAccount = await MappingService.resolveAccount('DECAISSEMENT', 'CREDIT_SUPPLIER', eid);

      entries.push({
        id: buildEntryId('decaissement-booking', d.id),
        date: d.createdAt,
        journalCode: 'AC',
        journalLabel: 'Journal des achats',
        enterpriseId: d.enterpriseId || null,
        enterpriseName: d.enterpriseName || null,
        accountDebit: expenseAccount?.code || '601000',
        accountDebitLabel: expenseAccount?.label || 'Charges',
        accountCredit: supplierAccount?.code || '401000',
        accountCreditLabel: supplierAccount?.label || 'Fournisseurs',
        label: `${d.numeroPiece} - ${d.description}`,
        debit: safeAmount(d.amountHT || d.amountTTC),
        credit: safeAmount(d.amountHT || d.amountTTC),
        reference: d.reference || d.numeroPiece,
        sourceType: 'DECAISSEMENT',
        sourceId: d.id,
      });

      if (d.status === 'DECAISSE') {
        const eid = d.enterpriseId || requestedEnterpriseId;
        const treasuryAccount = await resolveTreasuryAccountingReference(d.treasuryAccount, d.paymentMethod, eid);
        const supplierDebitAccount = await MappingService.resolveAccount('DECAISSEMENT', 'DEBIT_SUPPLIER', eid);
        const treasuryJournal = await getTreasuryJournalMeta(prisma, treasuryAccount, {
          enterpriseId: eid,
          fallbackFamily: treasuryTypeFromPaymentMethod(d.paymentMethod) === 'CASH' ? 'TREASURY_CASH' : 'TREASURY_BANK',
        });

        entries.push({
          id: buildEntryId('decaissement-payment', d.id),
          date: d.dateDecaissement || d.createdAt,
          journalCode: treasuryJournal?.journalCode || 'TR',
          journalLabel: treasuryJournal?.journalLabel || 'Journal de trésorerie',
          enterpriseId: d.enterpriseId || null,
          enterpriseName: d.enterpriseName || null,
          accountDebit: supplierDebitAccount?.code || '401000',
          accountDebitLabel: supplierDebitAccount?.label || 'Fournisseurs',
          accountCredit: treasuryAccount?.code || '521000',
          accountCreditLabel: treasuryAccount?.label || 'Trésorerie',
          label: `Décaissement ${d.numeroPiece}`,
          debit: safeAmount(d.amountTTC),
          credit: safeAmount(d.amountTTC),
          reference: d.reference || d.numeroPiece,
          sourceType: 'DECAISSEMENT',
          sourceId: d.id,
        });
      }
    }

    for (const e of receivedVouchers) {
      if (manualEntrySourceKeys.has(`ENCAISSEMENT:${e.id}`)) continue;
      const eid = e.enterpriseId || requestedEnterpriseId;
      const treasuryAccount = await resolveTreasuryAccountingReference(e.treasuryAccount, e.paymentMethod, eid);
      const creditAccount = e.factureClientId
        ? await MappingService.resolveAccount('PAYMENT', 'CREDIT_CUSTOMER', eid)
        : await MappingService.resolveAccount('ENCAISSEMENT', e.expenseCategory, eid);
      const treasuryJournal = await getTreasuryJournalMeta(prisma, treasuryAccount, {
        enterpriseId: eid,
        fallbackFamily: treasuryTypeFromPaymentMethod(e.paymentMethod) === 'CASH' ? 'TREASURY_CASH' : 'TREASURY_BANK',
      });

      entries.push({
        id: buildEntryId('encaissement', e.id),
        date: e.dateEncaissement || e.createdAt,
        journalCode: treasuryJournal?.journalCode || 'TR',
        journalLabel: treasuryJournal?.journalLabel || 'Journal de trésorerie',
        enterpriseId: e.enterpriseId || null,
        enterpriseName: e.enterpriseName || null,
        accountDebit: treasuryAccount?.code || '521000',
        accountDebitLabel: treasuryAccount?.label || 'Trésorerie',
        accountCredit: creditAccount?.code || '411000',
        accountCreditLabel: creditAccount?.label || 'Clients',
        label: `${e.numeroPiece} - ${e.description}`,
        debit: safeAmount(e.amountTTC),
        credit: safeAmount(e.amountTTC),
        reference: e.reference || e.numeroPiece,
        sourceType: 'ENCAISSEMENT',
        sourceId: e.id,
      });
    }

    const orderedEntries = [...entries, ...manualEntries].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );


  return orderedEntries;
};

module.exports = { buildAccountingEntries };
