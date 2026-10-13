const FormulaEvaluator = require('../../utils/FormulaEvaluator');
const { amount, mergeAccounts, safeAmount, serializeTreasuryAccount } = require('./shared');

// Calcule les indicateurs et les comptes dynamiques utilisés par les rapports.
const calculateAccountingMetrics = ({ factures, paiements, commitments, encaissements, decaissements, persistedAccounts, treasuryAccounts }) => {
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
    const validatedEncaissements = encaissements.filter((item) => String(item.status || '').toUpperCase() === 'VALIDE');
    const totalInvoiceReceived = validatedEncaissements
      .filter((item) => item.factureClientId)
      .reduce((sum, item) => sum + safeAmount(item.amountTTC), 0);

    const activeDecaissements = decaissements.filter((d) => d.status !== 'ANNULE');
    const disbursedVouchers = activeDecaissements.filter((d) => d.status === 'DECAISSE');
    const receivedVouchers = validatedEncaissements;
    const totalExpenseHT = activeDecaissements.reduce((sum, d) => sum + safeAmount(d.amountHT || d.amountTTC), 0);
    const totalDeductibleVat = activeDecaissements.reduce((sum, d) => sum + safeAmount(d.amountTVA), 0);
    const totalDisbursed = disbursedVouchers.reduce((sum, d) => sum + safeAmount(d.amountTTC), 0);
    const totalOtherIncome = receivedVouchers.reduce((sum, e) => sum + safeAmount(e.amountTTC), 0);
    const totalTreasuryIncome = totalInvoiceReceived + totalOtherIncome;

    const bankInflows =
      receivedVouchers
        .filter((e) => String(e.paymentMethod || '').toUpperCase() !== 'ESPECES')
        .reduce((sum, e) => sum + amount(e.amountTTC), 0);
    const cashInflows =
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

    // 1. Build context for formulas
    const context = {
      bankInflows,
      cashInflows,
      bankOutflows,
      cashOutflows,
      clientReceivables,
      supplierLiabilities,
      totalDeductibleVat,
      totalCollectedVat,
      totalRevenue,
      totalExpenseHT,
      totalDisbursed,
      netResult: Math.max(totalRevenue - totalExpenseHT, 0),
      bankMovementCount:
        receivedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() !== 'ESPECES').length +
        disbursedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() !== 'ESPECES').length,
      cashMovementCount:
        receivedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES').length +
        disbursedVouchers.filter((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES').length,
      lastBankTransaction: receivedVouchers[0]?.dateEncaissement || disbursedVouchers[0]?.dateDecaissement || null,
      lastCashTransaction:
        receivedVouchers.find((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES')?.dateEncaissement ||
        disbursedVouchers.find((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES')?.dateDecaissement ||
        null,
      invoiceCount: factures.length,
      lastInvoiceDate: factures[0]?.dateEmission || null,
      decaissementCount: decaissements.length,
      lastDecaissementDate: decaissements[0]?.createdAt || null,
      commitmentCount: commitments.length,
      purchasesExpense: decaissements
        .filter((d) => ['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(d.sourceType || '').toUpperCase()))
        .reduce((sum, d) => sum + amount(d.amountHT || d.amountTTC), 0),
      otherExpense: decaissements
        .filter((d) => !['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(d.sourceType || '').toUpperCase()))
        .reduce((sum, d) => sum + amount(d.amountHT || d.amountTTC), 0),
      today: new Date().toISOString()
    };

    // 2. Fetch and evaluate dynamic accounts from DB
    const dynamicAccountsFromDb = persistedAccounts.filter(a => a.isDynamic);

    const evaluatedDynamicAccounts = dynamicAccountsFromDb.map(account => {
      const evaluation = FormulaEvaluator.evaluateAccount(account.formula, context);
      return {
        id: account.id,
        code: account.code,
        label: account.label,
        type: account.type.toLowerCase(),
        balance: evaluation.balance,
        lastTransaction: evaluation.lastTransaction,
        movementCount: evaluation.movementCount,
        isDynamic: true
      };
    });

    const mergedAccounts = mergeAccounts(
      persistedAccounts.filter((account) => !account.isDynamic),
      evaluatedDynamicAccounts
    );


  return {
    totalRevenue,
    totalCollectedVat,
    validatedEncaissements,
    totalInvoiceReceived,
    activeDecaissements,
    disbursedVouchers,
    receivedVouchers,
    totalExpenseHT,
    totalDeductibleVat,
    totalDisbursed,
    totalOtherIncome,
    totalTreasuryIncome,
    bankInflows,
    cashInflows,
    bankOutflows,
    cashOutflows,
    clientReceivables,
    supplierLiabilities,
    totalCommitted,
    pendingCommitments,
    serializedTreasuryAccounts,
    defaultTreasuryByType,
    context,
    mergedAccounts,
  };
};

module.exports = { calculateAccountingMetrics };
