const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const {
  amount,
  ensureAccountingReadAccess,
  ensureDefaultAccounts,
  resolveDateRange,
  computeSignedDelta,
  serializeAccountingAccount,
  serializeJournalEntry,
} = require('../utils/accounting');
const {
  ensureDefaultTreasuryAccounts,
  treasuryTypeFromPaymentMethod,
  serializeTreasuryAccount,
} = require('../utils/treasury');
const { safeAmount, safeDate, safeAccess } = require('../utils/safe-access');
const MappingService = require('../core/services/AccountingMappingService');

const prisma = new PrismaClient();

const pushMovement = (bucket, movement) => {
  bucket.push({
    id: movement.id,
    date: movement.date,
    type: movement.type,
    category: movement.category,
    description: movement.description,
    amount: movement.amount,
    reference: movement.reference || null,
    sourceType: movement.sourceType || null,
    paymentMethod: movement.paymentMethod || null,
    treasuryAccountId: movement.treasuryAccountId || null,
    treasuryAccountName: movement.treasuryAccountName || null,
    treasuryAccountType: movement.treasuryAccountType || null,
  });
};

const buildEntryId = (...parts) => parts.filter(Boolean).join('-');

const buildDateWhere = (field, startDate, endDate) => {
  if (!startDate && !endDate) return {};

  const where = {};
  if (startDate) {
    where.gte = startDate;
  }
  if (endDate) {
    where.lte = endDate;
  }

  return { [field]: where };
};


// Les fonctions expenseAccountCode et treasuryAccountCode ont été supprimées 
// au profit du MappingService dynamique.

const mergeAccounts = (persistedAccounts, dynamicAccounts) => {
  const accountMap = new Map();

  persistedAccounts.forEach((account) => {
    const serialized = serializeAccountingAccount(account);
    accountMap.set(serialized.code, {
      ...serialized,
      movementCount: 0,
      lastTransaction: serialized.lastTransaction,
    });
  });

  dynamicAccounts.forEach((account) => {
    const existing = accountMap.get(account.code);
    if (existing) {
      const existingTime = existing.lastTransaction ? new Date(existing.lastTransaction).getTime() : 0;
      const dynamicTime = account.lastTransaction ? new Date(account.lastTransaction).getTime() : 0;
      accountMap.set(account.code, {
        ...existing,
        label: existing.label || account.label,
        type: existing.type || account.type,
        balance: amount(existing.balance) + amount(account.balance),
        currentBalance: amount(existing.currentBalance) + amount(account.balance),
        movementCount: amount(existing.movementCount) + amount(account.movementCount),
        lastTransaction: dynamicTime > existingTime ? account.lastTransaction : existing.lastTransaction,
      });
      return;
    }

    accountMap.set(account.code, {
      ...account,
      currentBalance: account.balance,
    });
  });

  return [...accountMap.values()].sort((left, right) => left.code.localeCompare(right.code, 'fr'));
};

exports.getAccountingOverview = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    await ensureDefaultAccounts(prisma, req.user);
    await ensureDefaultTreasuryAccounts(prisma, req.user);

    const { startDate, endDate, periodLabel } = resolveDateRange({
      period: req.query.period,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    const invoiceWhere = buildDateWhere('dateEmission', startDate, endDate);
    const paymentWhere = buildDateWhere('datePaiement', startDate, endDate);
    const commitmentWhere = buildDateWhere('createdAt', startDate, endDate);
    const encaissementWhere = buildDateWhere('dateEncaissement', startDate, endDate);
    const decaissementWhere =
      !startDate && !endDate
        ? {}
        : {
            OR: [
              buildDateWhere('dateDecaissement', startDate, endDate),
              buildDateWhere('createdAt', startDate, endDate),
            ],
          };
    const journalEntryWhere = buildDateWhere('entryDate', startDate, endDate);

    console.log('[DEBUG] Step 1: Fetching core accounting data', { startDate, endDate });
    await MappingService.refreshCache();

    const [factures, paiements, commitments, encaissements, decaissements, persistedAccounts, manualJournalEntries, treasuryAccounts] = await Promise.all([
      prisma.facture.findMany({
        where: invoiceWhere,
        include: { paiements: true, lignes: true },
        orderBy: { dateEmission: 'desc' },
      }),
      prisma.paiement.findMany({
        where: paymentWhere,
        include: { facture: true, treasuryAccount: true },
        orderBy: { datePaiement: 'desc' },
      }),
      prisma.purchaseCommitment.findMany({
        where: commitmentWhere,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.encaissement.findMany({
        where: encaissementWhere,
        include: { treasuryAccount: true },
        orderBy: { dateEncaissement: 'desc' },
      }),
      prisma.decaissement.findMany({
        where: decaissementWhere,
        include: { treasuryAccount: true },
        orderBy: [{ dateDecaissement: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.accountingAccount.findMany({
        where: { isActive: true },
        orderBy: [{ code: 'asc' }],
      }),
      prisma.accountingJournalEntry.findMany({
        where: journalEntryWhere,
        include: {
          lines: {
            include: { account: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.treasuryAccount.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    console.log('[DEBUG] Step 2: Data fetched successfully', {
      factures: factures.length,
      paiements: paiements.length,
      decaissements: decaissements.length
    });

    let totalRevenue = 0;
    try {
      totalRevenue = factures
        .filter((invoice) => !['BROUILLON', 'ANNULEE'].includes(String(invoice.status)))
        .reduce((sum, invoice) => sum + safeAmount(invoice.montantHT), 0);
    } catch (e) {
      console.error('[ERROR] Revenue calculation failed', { error: e.message, firstFacture: factures[0] });
    }

    const totalCollectedVat = factures
      .filter((invoice) => !['BROUILLON', 'ANNULEE'].includes(String(invoice.status)))
      .reduce((sum, invoice) => sum + safeAmount(invoice.montantTVA), 0);
    const totalInvoiceReceived = paiements.reduce((sum, payment) => sum + safeAmount(payment.montant), 0);

    const activeDecaissements = decaissements.filter((d) => d.status !== 'ANNULE');
    const disbursedVouchers = activeDecaissements.filter((d) => d.status === 'DECAISSE');
    const receivedVouchers = encaissements; 
    const totalExpenseHT = activeDecaissements.reduce((sum, d) => sum + safeAmount(d.amountHT || d.amountTTC), 0);
    const totalDeductibleVat = activeDecaissements.reduce((sum, d) => sum + safeAmount(d.amountTVA), 0);
    const totalDisbursed = disbursedVouchers.reduce((sum, d) => sum + safeAmount(d.amountTTC), 0);
    const totalOtherIncome = receivedVouchers.reduce((sum, e) => sum + safeAmount(e.amountTTC), 0);
    const totalTreasuryIncome = totalInvoiceReceived + totalOtherIncome;

    const bankInflows =
      paiements
        .filter((payment) => String(payment.methodePaiement || '').toUpperCase() !== 'ESPECES')
        .reduce((sum, payment) => sum + amount(payment.montant), 0) +
      receivedVouchers
        .filter((e) => String(e.paymentMethod || '').toUpperCase() !== 'ESPECES')
        .reduce((sum, e) => sum + amount(e.amountTTC), 0);
    const cashInflows =
      paiements
        .filter((payment) => String(payment.methodePaiement || '').toUpperCase() === 'ESPECES')
        .reduce((sum, payment) => sum + amount(payment.montant), 0) +
      receivedVouchers
        .filter((e) => String(e.paymentMethod || '').toUpperCase() === 'ESPECES')
        .reduce((sum, e) => sum + amount(e.amountTTC), 0);
    const bankOutflows = disbursedVouchers
      .filter((d) => String(d.paymentMethod || '').toUpperCase() !== 'ESPECES')
      .reduce((sum, d) => sum + amount(d.amountTTC), 0);
    const cashOutflows = disbursedVouchers
      .filter((d) => String(d.paymentMethod || '').toUpperCase() === 'ESPECES')
      .reduce((sum, d) => sum + amount(d.amountTTC), 0);

    const clientReceivables = factures
      .filter((invoice) => !['ANNULEE'].includes(String(invoice.status)))
      .reduce((sum, invoice) => {
        const paid = invoice.paiements.reduce((paidSum, payment) => paidSum + amount(payment.montant), 0);
        return sum + Math.max(amount(invoice.montantTTC) - paid, 0);
      }, 0);

    const supplierLiabilities = decaissements
      .filter((d) => ['VALIDE'].includes(String(d.status)))
      .reduce((sum, d) => sum + safeAmount(d.amountTTC), 0);
		
	const totalCommitted = commitments.reduce((sum, item) => sum + safeAmount(item.amountTTC), 0);
    const pendingCommitments = commitments
      .filter((item) => !['PAYE', 'ANNULE'].includes(String(item.status)))
      .reduce((sum, item) => sum + safeAmount(item.amountTTC), 0);

    const serializedTreasuryAccounts = treasuryAccounts.map(serializeTreasuryAccount);
    const defaultTreasuryByType = serializedTreasuryAccounts.reduce((accumulator, account) => {
      if (account.isDefault && account.isActive) {
        accumulator[account.type] = account;
      }
      return accumulator;
    }, {});

    const dynamicAccounts = [
      {
        id: 'account-512',
        code: '512',
        label: 'Banque',
        type: 'asset',
        balance: bankInflows - bankOutflows,
        lastTransaction: paiements[0]?.datePaiement || disbursedVouchers[0]?.dateDecaissement || null,
        movementCount:
          paiements.filter((item) => String(item.methodePaiement || '').toUpperCase() !== 'ESPECES').length +
          disbursedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() !== 'ESPECES').length,
      },
      {
        id: 'account-531',
        code: '531',
        label: 'Caisse',
        type: 'asset',
        balance: cashInflows - cashOutflows,
        lastTransaction:
          paiements.find((item) => String(item.methodePaiement || '').toUpperCase() === 'ESPECES')?.datePaiement ||
          disbursedVouchers.find((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES')?.dateDecaissement ||
          null,
        movementCount:
          paiements.filter((item) => String(item.methodePaiement || '').toUpperCase() === 'ESPECES').length +
          disbursedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES').length,
      },
      {
        id: 'account-411',
        code: '411',
        label: 'Clients',
        type: 'asset',
        balance: clientReceivables,
        lastTransaction: factures[0]?.dateEmission || null,
        movementCount: factures.length,
      },
      {
        id: 'account-401',
        code: '401',
        label: 'Fournisseurs',
        type: 'liability',
        balance: supplierLiabilities,
        lastTransaction: decaissements[0]?.createdAt || commitments[0]?.createdAt || null,
        movementCount: decaissements.length + commitments.length,
      },
      {
        id: 'account-4456',
        code: '4456',
        label: 'TVA déductible',
        type: 'asset',
        balance: totalDeductibleVat,
        lastTransaction: decaissements[0]?.createdAt || null,
        movementCount: decaissements.length,
      },
      {
        id: 'account-4457',
        code: '4457',
        label: 'TVA collectée',
        type: 'liability',
        balance: totalCollectedVat,
        lastTransaction: factures[0]?.dateEmission || null,
        movementCount: factures.length,
      },
      {
        id: 'account-706',
        code: '706',
        label: 'Prestations de services',
        type: 'revenue',
        balance: totalRevenue,
        lastTransaction: factures[0]?.dateEmission || null,
        movementCount: factures.length,
      },
      {
        id: 'account-607',
        code: '607',
        label: 'Achats et approvisionnements',
        type: 'expense',
        balance: decaissements
          .filter((d) =>
            ['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(d.sourceType || '').toUpperCase())
          )
          .reduce((sum, d) => sum + amount(d.amountHT || d.amountTTC), 0),
        lastTransaction: decaissements[0]?.createdAt || commitments[0]?.createdAt || null,
        movementCount: decaissements.length,
      },
      {
        id: 'account-618',
        code: '618',
        label: 'Autres charges d exploitation',
        type: 'expense',
        balance: decaissements
          .filter((d) =>
            !['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(d.sourceType || '').toUpperCase())
          )
          .reduce((sum, d) => sum + amount(d.amountHT || d.amountTTC), 0),
        lastTransaction: decaissements[0]?.createdAt || null,
        movementCount: decaissements.length,
      },
      {
        id: 'account-101',
        code: '101',
        label: 'Capital et résultat',
        type: 'equity',
        balance: Math.max(totalRevenue - totalExpenseHT, 0),
        lastTransaction: new Date().toISOString(),
        movementCount: 1,
      },
    ];

    const mergedAccounts = mergeAccounts(persistedAccounts, dynamicAccounts);

    const manualEntries = manualJournalEntries.map(serializeJournalEntry);
    const manualDeltasByType = manualJournalEntries.reduce(
      (accumulator, entry) => {
        entry.lines.forEach((line) => {
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
        reference: payment.reference || payment.facture?.numeroFacture || null,
        sourceType: 'PAYMENT',
        paymentMethod: payment.methodePaiement,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    disbursedVouchers.forEach((d) => {
      const fallbackAccount = defaultTreasuryByType[treasuryTypeFromPaymentMethod(d.paymentMethod)];
      const treasuryAccount = d.treasuryAccount || fallbackAccount || null;
      pushMovement(movements, {
        id: `decaissement-${d.id}`,
        date: d.dateDecaissement || d.createdAt,
        type: 'expense',
        category: 'Décaissement',
        description: `${d.numeroPiece} - ${d.description}`,
        amount: amount(d.amountTTC),
        reference: d.reference || d.numeroPiece,
        sourceType: 'DECAISSEMENT',
        paymentMethod: d.paymentMethod,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    receivedVouchers.forEach((e) => {
      const fallbackAccount = defaultTreasuryByType[treasuryTypeFromPaymentMethod(e.paymentMethod)];
      const treasuryAccount = e.treasuryAccount || fallbackAccount || null;
      pushMovement(movements, {
        id: `encaissement-${e.id}`,
        date: e.dateEncaissement || e.createdAt,
        type: 'income',
        category: 'Encaissement',
        description: `${e.numeroPiece} - ${e.description}`,
        amount: amount(e.amountTTC),
        reference: e.reference || e.numeroPiece,
        sourceType: 'ENCAISSEMENT',
        paymentMethod: e.paymentMethod,
        treasuryAccountId: treasuryAccount?.id,
        treasuryAccountName: treasuryAccount?.name,
        treasuryAccountType: treasuryAccount?.type,
      });
    });

    manualJournalEntries.forEach((entry) => {
      entry.lines
        .filter((line) => ['512', '531'].includes(String(line.account?.code || '')))
        .forEach((line) => {
          const manualAccountType = String(line.account?.code || '') === '531' ? 'CASH' : 'BANK';
          const fallbackAccount = defaultTreasuryByType[manualAccountType];
          pushMovement(movements, {
            id: `manual-${entry.id}-${line.id}`,
            date: entry.entryDate,
            type: line.side === AccountingEntrySide.DEBIT ? 'income' : 'expense',
            category: line.account.code === '531' ? 'Mouvement de caisse' : 'Mouvement bancaire',
            description: `${entry.journalCode} - ${entry.label}`,
            amount: amount(line.amount),
            reference: entry.reference || entry.entryNumber,
            sourceType: entry.sourceType || 'MANUAL_ENTRY',
            paymentMethod: line.account.code === '531' ? 'ESPECES' : 'VIREMENT',
            treasuryAccountId: fallbackAccount?.id,
            treasuryAccountName: fallbackAccount?.name,
            treasuryAccountType: fallbackAccount?.type,
          });
        });
    });

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

    const entries = [];

    for (const invoice of factures.filter((i) => !['BROUILLON', 'ANNULEE'].includes(String(i.status)))) {
      const revenueAccount = await MappingService.resolveAccount('INVOICE', 'REVENUE'); 
      const clientAccount = await MappingService.resolveAccount('INVOICE', 'DEBIT_CUSTOMER');

      entries.push({
        id: buildEntryId('invoice', invoice.id),
        date: invoice.dateEmission,
        journalCode: 'VT',
        journalLabel: 'Journal des ventes',
        accountDebit: clientAccount.code,
        accountDebitLabel: clientAccount.label,
        accountCredit: revenueAccount.code,
        accountCreditLabel: revenueAccount.label,
        label: `Facture ${invoice.numeroFacture}`,
        debit: safeAmount(invoice.montantHT),
        credit: safeAmount(invoice.montantHT),
        reference: invoice.numeroFacture,
        sourceType: 'INVOICE',
        sourceId: invoice.id,
      });
    }

    for (const payment of paiements) {
      const treasuryAccount = await MappingService.resolveAccount('PAYMENT', payment.methodePaiement);
      const clientAccount = await MappingService.resolveAccount('PAYMENT', 'CREDIT_CUSTOMER');

      entries.push({
        id: buildEntryId('payment', payment.id),
        date: payment.datePaiement,
        journalCode: String(payment.methodePaiement || '').toUpperCase() === 'ESPECES' ? 'CA' : 'BQ',
        journalLabel: String(payment.methodePaiement || '').toUpperCase() === 'ESPECES' ? 'Journal de caisse' : 'Journal de banque',
        accountDebit: treasuryAccount.code,
        accountDebitLabel: treasuryAccount.label,
        accountCredit: clientAccount.code,
        accountCreditLabel: clientAccount.label,
        label: safeAccess(payment, 'facture.numeroFacture')
          ? `Encaissement facture ${payment.facture.numeroFacture}`
          : 'Encaissement client',
        debit: safeAmount(payment.montant),
        credit: safeAmount(payment.montant),
        reference: payment.reference || safeAccess(payment, 'facture.numeroFacture') || payment.id,
        sourceType: 'PAYMENT',
        sourceId: payment.id,
      });
    }

    for (const d of activeDecaissements) {
      const expenseAccount = await MappingService.resolveAccount('DECAISSEMENT', d.expenseCategory);
      const supplierAccount = await MappingService.resolveAccount('DECAISSEMENT', 'CREDIT_SUPPLIER');

      entries.push({
        id: buildEntryId('decaissement-booking', d.id),
        date: d.createdAt,
        journalCode: 'AC',
        journalLabel: 'Journal des achats',
        accountDebit: expenseAccount.code,
        accountDebitLabel: expenseAccount.label,
        accountCredit: supplierAccount.code,
        accountCreditLabel: supplierAccount.label,
        label: `${d.numeroPiece} - ${d.description}`,
        debit: safeAmount(d.amountHT || d.amountTTC),
        credit: safeAmount(d.amountHT || d.amountTTC),
        reference: d.reference || d.numeroPiece,
        sourceType: 'DECAISSEMENT',
        sourceId: d.id,
      });

      if (d.status === 'DECAISSE') {
        const treasuryAccount = await MappingService.resolveAccount('PAYMENT', d.paymentMethod);
        const supplierDebitAccount = await MappingService.resolveAccount('DECAISSEMENT', 'DEBIT_SUPPLIER');

        entries.push({
          id: buildEntryId('decaissement-payment', d.id),
          date: d.dateDecaissement || d.createdAt,
          journalCode: treasuryAccount.code === '531' ? 'CA' : 'BQ',
          journalLabel: treasuryAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
          accountDebit: supplierDebitAccount.code,
          accountDebitLabel: supplierDebitAccount.label,
          accountCredit: treasuryAccount.code,
          accountCreditLabel: treasuryAccount.label,
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
      const treasuryAccount = await MappingService.resolveAccount('PAYMENT', e.paymentMethod);
      const incomeAccount = await MappingService.resolveAccount('ENCAISSEMENT', e.expenseCategory); // Réutilise la catégorie pour le revenu

      entries.push({
        id: buildEntryId('encaissement', e.id),
        date: e.dateEncaissement || e.createdAt,
        journalCode: treasuryAccount.code === '531' ? 'CA' : 'BQ',
        journalLabel: treasuryAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
        accountDebit: treasuryAccount.code,
        accountDebitLabel: treasuryAccount.label,
        accountCredit: incomeAccount.code,
        accountCreditLabel: incomeAccount.label,
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

    const assets = mergedAccounts.filter((account) => account.type === 'asset');
    const liabilities = mergedAccounts.filter((account) => account.type === 'liability');
    const equity = mergedAccounts.filter((account) => account.type === 'equity');
    const revenues = mergedAccounts.filter((account) => account.type === 'revenue');
    const expenses = mergedAccounts.filter((account) => account.type === 'expense');

    const totalAssets = assets.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalEquity = equity.reduce((sum, account) => sum + amount(account.balance), 0);
    const reportedRevenue = totalRevenue + manualDeltasByType.revenue;
    const reportedExpenses = totalExpenseHT + manualDeltasByType.expense;
    const reportedNetResult = reportedRevenue - reportedExpenses;

    const paymentMethodBreakdown = activeDecaissements.reduce((accumulator, d) => {
      const key = String(d.paymentMethod || 'AUTRE').toUpperCase();
      accumulator[key] = (accumulator[key] || 0) + amount(d.amountTTC);
      return accumulator;
    }, {});

    const expenseCategoryBreakdown = activeDecaissements.reduce((accumulator, d) => {
      const key = d.description || 'Dépenses Diverses';
      accumulator[key] = (accumulator[key] || 0) + amount(d.amountTTC);
      return accumulator;
    }, {});

    const reports = {
      balanceSheet: {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
      incomeStatement: {
        revenues,
        expenses,
        totalRevenue: reportedRevenue,
        totalExpenses: reportedExpenses,
        netResult: reportedNetResult,
      },
      treasury: {
        inflows: totalTreasuryIncome,
        outflows: totalDisbursed,
        closingBalance: runningBalance,
        byPaymentMethod: paymentMethodBreakdown,
        accounts: treasuryAccountSummaries,
        otherIncome: totalOtherIncome,
      },
      commitments: {
        totalCommitted,
        pendingCommitted: pendingCommitments,
        byCategory: expenseCategoryBreakdown,
      },
      kpis: {
        netMargin: reportedRevenue > 0 ? (reportedNetResult / reportedRevenue) * 100 : 0,
        collectionRate:
          reportedRevenue > 0 ? (totalInvoiceReceived / Math.max(reportedRevenue + totalCollectedVat, 1)) * 100 : 0,
        disbursementCoverage: totalCommitted > 0 ? (totalDisbursed / totalCommitted) * 100 : 0,
      },
    };

    return res.json({
      success: true,
      data: {
        period: periodLabel,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        generatedAt: new Date().toISOString(),
        summary: {
          totalRevenue: reportedRevenue,
          totalReceived: totalTreasuryIncome,
          totalExpenseHT: reportedExpenses,
          totalDisbursed,
          clientReceivables,
          supplierLiabilities,
          totalCommitted,
          pendingCommitted: pendingCommitments,
          netResult: reportedNetResult,
        },
        totals: {
          totalRevenue: reportedRevenue,
          totalReceived: totalTreasuryIncome,
          totalExpenseHT: reportedExpenses,
          totalDisbursed,
          clientReceivables,
          supplierLiabilities,
          totalCommitted,
          pendingCommitted: pendingCommitments,
          netResult: reportedNetResult,
        },
        accounts: mergedAccounts,
        treasuryMovements,
        entries: orderedEntries,
        reports,
      },
    });
  } catch (error) {
    console.error('Erreur récupération overview comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de la vue comptable',
    });
  }
};
