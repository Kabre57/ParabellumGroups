const {
  AccountingEntrySide,
  amount,
  computeSignedDelta,
  extractPaymentIdFromNotes,
  getTreasuryJournalMeta,
  isCashAccountingCode,
  isTreasuryAccountingCode,
  prisma,
  pushMovement,
  serializeJournalEntry,
  treasuryTypeFromPaymentMethod,
} = require('./shared');

// Assemble les mouvements du journal, des encaissements, des décaissements et des transferts.
const buildTreasuryOverview = async ({
  paiements, encaissements, decaissements, manualJournalEntries, treasuryTransfers,
  validatedEncaissements, receivedVouchers, disbursedVouchers, serializedTreasuryAccounts,
  defaultTreasuryByType,
}) => {
    const manualEntries = manualJournalEntries.map(serializeJournalEntry);
    const manualEntrySourceKeys = new Set(
      manualEntries
        .filter((entry) => entry.sourceType && entry.sourceId)
        .map((entry) => `${String(entry.sourceType).toUpperCase()}:${entry.sourceId}`)
    );
    const treasuryAccountBySourceKey = new Map();
    encaissements.forEach((item) => {
      if (item.treasuryAccount) {
        treasuryAccountBySourceKey.set(`ENCAISSEMENT:${item.id}`, item.treasuryAccount);
      }
      const paymentId = extractPaymentIdFromNotes(item.notes);
      if (paymentId && item.treasuryAccount) {
        treasuryAccountBySourceKey.set(`PAYMENT:${paymentId}`, item.treasuryAccount);
      }
    });
    decaissements.forEach((item) => {
      if (item.treasuryAccount) {
        treasuryAccountBySourceKey.set(`DECAISSEMENT:${item.id}`, item.treasuryAccount);
      }
    });
    paiements.forEach((item) => {
      if (item.treasuryAccount) {
        treasuryAccountBySourceKey.set(`PAYMENT:${item.id}`, item.treasuryAccount);
      }
    });
    const postedPaymentIds = new Set(
      validatedEncaissements
        .filter((item) => manualEntrySourceKeys.has(`ENCAISSEMENT:${item.id}`))
        .map((item) => extractPaymentIdFromNotes(item.notes))
        .filter(Boolean)
    );
    const manualDeltasByType = manualJournalEntries.reduce(
      (accumulator, entry) => {
        (entry.lines || []).forEach((line) => {
          const accountType = String(line.account?.type || '').toLowerCase();
          const delta = computeSignedDelta(line.account?.type, line.side, line.amount);

          if (accountType === 'revenue') accumulator.revenue += delta;
          if (accountType === 'expense') accumulator.expense += delta;
        });

        return accumulator;
      },
      { revenue: 0, expense: 0 }
    );

    const movements = [];

    paiements.forEach((payment) => {
      if (postedPaymentIds.has(String(payment.id))) return;
      const fallbackAccount = defaultTreasuryByType[treasuryTypeFromPaymentMethod(payment.methodePaiement)];
      const treasuryAccount = payment.treasuryAccount || fallbackAccount || null;
      pushMovement(movements, {
        id: `payment-${payment.id}`,
        date: payment.datePaiement,
        type: 'income',
        category: 'Encaissement facture',
        description: payment.facture?.numeroFacture
          ? `Paiement de la facture ${payment.facture.numeroFacture}`
          : 'Paiement client',
        amount: amount(payment.montant),
        enterpriseId: payment.enterpriseId || payment.facture?.enterpriseId || null,
        enterpriseName: payment.enterpriseName || payment.facture?.enterpriseName || null,
        reference: payment.reference || payment.facture?.numeroFacture || null,
        sourceType: 'PAYMENT',
        paymentMethod: payment.methodePaiement,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    disbursedVouchers.forEach((d) => {
      if (manualEntrySourceKeys.has(`DECAISSEMENT:${d.id}`)) return;
      const fallbackAccount = defaultTreasuryByType[treasuryTypeFromPaymentMethod(d.paymentMethod)];
      const treasuryAccount = d.treasuryAccount || fallbackAccount || null;
      pushMovement(movements, {
        id: `decaissement-${d.id}`,
        date: d.dateDecaissement || d.createdAt,
        type: 'expense',
        category: 'Décaissement',
        description: `${d.numeroPiece} - ${d.description}`,
        amount: amount(d.amountTTC),
        enterpriseId: d.enterpriseId || null,
        enterpriseName: d.enterpriseName || null,
        reference: d.reference || d.numeroPiece,
        sourceType: 'DECAISSEMENT',
        paymentMethod: d.paymentMethod,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    receivedVouchers.forEach((e) => {
      if (manualEntrySourceKeys.has(`ENCAISSEMENT:${e.id}`)) return;
      const fallbackAccount = defaultTreasuryByType[treasuryTypeFromPaymentMethod(e.paymentMethod)];
      const treasuryAccount = e.treasuryAccount || fallbackAccount || null;
      pushMovement(movements, {
        id: `encaissement-${e.id}`,
        date: e.dateEncaissement || e.createdAt,
        type: 'income',
        category: 'Encaissement',
        description: `${e.numeroPiece} - ${e.description}`,
        amount: amount(e.amountTTC),
        enterpriseId: e.enterpriseId || null,
        enterpriseName: e.enterpriseName || null,
        reference: e.reference || e.numeroPiece,
        sourceType: 'ENCAISSEMENT',
        paymentMethod: e.paymentMethod,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    for (const entry of manualJournalEntries) {
      const sourceType = String(entry.sourceType || '').toUpperCase();
      if (sourceType === 'TREASURY_TRANSFER') continue;
      const sourceKey = entry.sourceType && entry.sourceId ? `${sourceType}:${entry.sourceId}` : null;
      const sourceTreasuryAccount = sourceKey ? treasuryAccountBySourceKey.get(sourceKey) : null;
      for (const line of entry.lines || []) {
        if (!(await isTreasuryAccountingCode(prisma, line.account, entry.enterpriseId))) {
          continue;
        }

        const treasuryJournal = await getTreasuryJournalMeta(prisma, line.account, { enterpriseId: entry.enterpriseId });
        const manualAccountType =
          sourceTreasuryAccount?.type ||
          ((await isCashAccountingCode(prisma, line.account, entry.enterpriseId)) ? 'CASH' : 'BANK');
        const fallbackAccount = defaultTreasuryByType[manualAccountType];
        const treasuryAccount = sourceTreasuryAccount || fallbackAccount || null;
        const category =
          sourceType === 'ENCAISSEMENT'
            ? 'Encaissement'
            : sourceType === 'DECAISSEMENT'
            ? 'Décaissement'
            : manualAccountType === 'CASH'
            ? 'Mouvement de caisse'
            : 'Mouvement bancaire';
        pushMovement(movements, {
          id: `manual-${entry.id}-${line.id}`,
          date: entry.entryDate,
          type: line.side === AccountingEntrySide.DEBIT ? 'income' : 'expense',
          category,
          description: `${entry.journalCode} - ${entry.label}`,
          amount: amount(line.amount),
          enterpriseId: entry.enterpriseId || null,
          enterpriseName: entry.enterpriseName || null,
          reference: entry.reference || entry.entryNumber,
          sourceType: entry.sourceType || 'MANUAL_ENTRY',
          paymentMethod: treasuryJournal.defaultPaymentMethod,
          treasuryAccountId: treasuryAccount?.id,
          treasuryAccountName: treasuryAccount?.name,
          treasuryAccountType: treasuryAccount?.type,
        });
      }
    }

    for (const transfer of treasuryTransfers) {
      const sourceAccountName = transfer.sourceAccount?.name || 'Compte source';
      const destinationAccountName = transfer.destinationAccount?.name || 'Compte destination';
      const movementBase = {
        date: transfer.date,
        category: 'Transfert interne',
        description: `Transfert ${sourceAccountName} → ${destinationAccountName}`,
        reference: transfer.reference,
        sourceType: 'TREASURY_TRANSFER',
        enterpriseId: transfer.enterpriseId || null,
        enterpriseName: transfer.enterpriseName || null,
      };
      pushMovement(movements, {
        ...movementBase,
        id: `transfer-out-${transfer.id}`,
        type: 'expense',
        amount: amount(transfer.amount),
        treasuryAccountId: transfer.sourceTreasuryAccountId,
        treasuryAccountName: sourceAccountName,
        treasuryAccountType: transfer.sourceAccount?.type,
      });
      pushMovement(movements, {
        ...movementBase,
        id: `transfer-in-${transfer.id}`,
        type: 'income',
        amount: amount(transfer.amount),
        treasuryAccountId: transfer.destinationTreasuryAccountId,
        treasuryAccountName: destinationAccountName,
        treasuryAccountType: transfer.destinationAccount?.type,
      });
    }

    const movementsChronological = [...movements].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    );
    let runningBalance = 0;
    const treasuryMovements = movementsChronological
      .map((movement) => {
        runningBalance += movement.type === 'income' ? movement.amount : -movement.amount;
        return {
          ...movement,
          balance: runningBalance,
        };
      })
      .reverse();

    const treasuryAccountSummaries = serializedTreasuryAccounts.map((account) => ({
      ...account,
      inflows: 0,
      outflows: 0,
      movementCount: 0,
      lastTransaction: account.updatedAt,
    }));
    const treasurySummaryMap = new Map(treasuryAccountSummaries.map((account) => [account.id, account]));

    movementsChronological.forEach((movement) => {
      if (!movement.treasuryAccountId) return;
      const summary = treasurySummaryMap.get(movement.treasuryAccountId);
      if (!summary) return;
      if (movement.type === 'income') {
        summary.inflows += movement.amount;
      } else {
        summary.outflows += movement.amount;
      }
      summary.movementCount += 1;
      summary.lastTransaction = movement.date || summary.lastTransaction;
    });

    treasuryAccountSummaries.forEach((summary) => {
      summary.balance = summary.openingBalance + summary.inflows - summary.outflows;
    });


  return { manualEntries, manualEntrySourceKeys, manualDeltasByType, treasuryMovements, treasuryAccountSummaries, runningBalance };
};

module.exports = { buildTreasuryOverview };
