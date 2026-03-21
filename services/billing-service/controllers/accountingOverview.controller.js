const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalizePermissions = (permissions = []) =>
  (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => String(permission || '').trim().toLowerCase())
    .filter(Boolean);

const isAdminUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR'].includes(role);
};

const hasPermission = (user, ...permissions) => {
  if (isAdminUser(user)) return true;
  const permissionSet = new Set(normalizePermissions(user?.permissions));
  return permissions.some((permission) => permissionSet.has(String(permission).toLowerCase()));
};

const ensureAccountingReadAccess = (req) => {
  if (
    hasPermission(
      req.user,
      'reports.read_financial',
      'expenses.read',
      'expenses.read_all',
      'expenses.read_own',
      'payments.read',
      'payments.read_all',
      'invoices.read'
    )
  ) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message: 'Vous n avez pas la permission de consulter les données comptables',
    },
  };
};

const resolveStartDate = (period) => {
  const now = new Date();
  const start = new Date(now);

  switch (String(period || '').toLowerCase()) {
    case 'week':
      start.setDate(now.getDate() - 7);
      return start;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      return start;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      return start;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      return start;
    default:
      return null;
  }
};

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

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
  });
};

const buildEntryId = (...parts) => parts.filter(Boolean).join('-');

const expenseAccountCode = (voucher) => {
  const category = String(voucher.expenseCategory || '').toLowerCase();
  const sourceType = String(voucher.sourceType || '').toUpperCase();

  if (sourceType === 'PURCHASE_ORDER' || sourceType === 'PURCHASE_QUOTE' || category.includes('achat')) {
    return { code: '607', label: 'Achats de biens et services' };
  }
  if (category.includes('transport') || category.includes('mission')) {
    return { code: '625', label: 'Déplacements et missions' };
  }
  if (category.includes('maintenance') || category.includes('technique')) {
    return { code: '615', label: 'Entretien et maintenance' };
  }

  return { code: '618', label: 'Autres charges d exploitation' };
};

const treasuryAccountCode = (paymentMethod) =>
  String(paymentMethod || '').toUpperCase() === 'ESPECES'
    ? { code: '531', label: 'Caisse' }
    : { code: '512', label: 'Banque' };

exports.getAccountingOverview = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const startDate = resolveStartDate(req.query.period);
    const invoiceWhere = startDate ? { dateEmission: { gte: startDate } } : {};
    const paymentWhere = startDate ? { datePaiement: { gte: startDate } } : {};
    const commitmentWhere = startDate ? { createdAt: { gte: startDate } } : {};
    const voucherWhere = startDate
      ? {
          OR: [{ issueDate: { gte: startDate } }, { disbursementDate: { gte: startDate } }],
        }
      : {};

    const [factures, paiements, commitments, vouchers] = await Promise.all([
      prisma.facture.findMany({
        where: invoiceWhere,
        include: { paiements: true, lignes: true },
        orderBy: { dateEmission: 'desc' },
      }),
      prisma.paiement.findMany({
        where: paymentWhere,
        include: { facture: true },
        orderBy: { datePaiement: 'desc' },
      }),
      prisma.purchaseCommitment.findMany({
        where: commitmentWhere,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cashVoucher.findMany({
        where: voucherWhere,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const totalRevenue = factures
      .filter((invoice) => !['BROUILLON', 'ANNULEE'].includes(String(invoice.status)))
      .reduce((sum, invoice) => sum + amount(invoice.montantHT), 0);
    const totalCollectedVat = factures
      .filter((invoice) => !['BROUILLON', 'ANNULEE'].includes(String(invoice.status)))
      .reduce((sum, invoice) => sum + amount(invoice.montantTVA), 0);
    const totalReceived = paiements.reduce((sum, payment) => sum + amount(payment.montant), 0);

    const disbursedVouchers = vouchers.filter((voucher) => voucher.status === 'DECAISSE');
    const totalExpenseHT = vouchers
      .filter((voucher) => voucher.status !== 'ANNULE')
      .reduce((sum, voucher) => sum + amount(voucher.amountHT || voucher.amountTTC), 0);
    const totalDeductibleVat = vouchers
      .filter((voucher) => voucher.status !== 'ANNULE')
      .reduce((sum, voucher) => sum + amount(voucher.amountTVA), 0);
    const totalDisbursed = disbursedVouchers.reduce((sum, voucher) => sum + amount(voucher.amountTTC), 0);

    const bankInflows = paiements
      .filter((payment) => String(payment.methodePaiement || '').toUpperCase() !== 'ESPECES')
      .reduce((sum, payment) => sum + amount(payment.montant), 0);
    const cashInflows = paiements
      .filter((payment) => String(payment.methodePaiement || '').toUpperCase() === 'ESPECES')
      .reduce((sum, payment) => sum + amount(payment.montant), 0);
    const bankOutflows = disbursedVouchers
      .filter((voucher) => String(voucher.paymentMethod || '').toUpperCase() !== 'ESPECES')
      .reduce((sum, voucher) => sum + amount(voucher.amountTTC), 0);
    const cashOutflows = disbursedVouchers
      .filter((voucher) => String(voucher.paymentMethod || '').toUpperCase() === 'ESPECES')
      .reduce((sum, voucher) => sum + amount(voucher.amountTTC), 0);

    const clientReceivables = factures
      .filter((invoice) => !['ANNULEE'].includes(String(invoice.status)))
      .reduce((sum, invoice) => {
        const paid = invoice.paiements.reduce((paidSum, payment) => paidSum + amount(payment.montant), 0);
        return sum + Math.max(amount(invoice.montantTTC) - paid, 0);
      }, 0);

    const supplierLiabilities = vouchers
      .filter((voucher) => ['EN_ATTENTE', 'VALIDE'].includes(String(voucher.status)))
      .reduce((sum, voucher) => sum + amount(voucher.amountTTC), 0);

    const totalCommitted = commitments.reduce((sum, item) => sum + amount(item.amountTTC), 0);
    const pendingCommitments = commitments
      .filter((item) => !['ANNULE', 'LIVRE', 'PAYEE'].includes(String(item.status)))
      .reduce((sum, item) => sum + amount(item.amountTTC), 0);

    const netResult = totalRevenue - totalExpenseHT;
    const equityAmount = Math.max(netResult, 0);

    const accounts = [
      {
        id: 'account-512',
        code: '512',
        label: 'Banque',
        type: 'asset',
        balance: bankInflows - bankOutflows,
        lastTransaction: paiements[0]?.datePaiement || disbursedVouchers[0]?.disbursementDate || null,
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
          disbursedVouchers.find((item) => String(item.paymentMethod || '').toUpperCase() === 'ESPECES')?.disbursementDate ||
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
        lastTransaction: vouchers[0]?.issueDate || commitments[0]?.createdAt || null,
        movementCount: vouchers.length + commitments.length,
      },
      {
        id: 'account-4456',
        code: '4456',
        label: 'TVA déductible',
        type: 'asset',
        balance: totalDeductibleVat,
        lastTransaction: vouchers[0]?.issueDate || null,
        movementCount: vouchers.length,
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
        balance: vouchers
          .filter((voucher) =>
            ['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(voucher.sourceType || '').toUpperCase())
          )
          .reduce((sum, voucher) => sum + amount(voucher.amountHT || voucher.amountTTC), 0),
        lastTransaction: vouchers[0]?.issueDate || commitments[0]?.createdAt || null,
        movementCount: vouchers.length,
      },
      {
        id: 'account-618',
        code: '618',
        label: 'Autres charges d exploitation',
        type: 'expense',
        balance: vouchers
          .filter((voucher) =>
            !['PURCHASE_ORDER', 'PURCHASE_QUOTE', 'SUPPLIER_INVOICE'].includes(String(voucher.sourceType || '').toUpperCase())
          )
          .reduce((sum, voucher) => sum + amount(voucher.amountHT || voucher.amountTTC), 0),
        lastTransaction: vouchers[0]?.issueDate || null,
        movementCount: vouchers.length,
      },
      {
        id: 'account-101',
        code: '101',
        label: 'Capital et résultat',
        type: 'equity',
        balance: equityAmount,
        lastTransaction: new Date().toISOString(),
        movementCount: 1,
      },
    ];

    const movements = [];

    paiements.forEach((payment) => {
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
      });
    });

    disbursedVouchers.forEach((voucher) => {
      pushMovement(movements, {
        id: `voucher-${voucher.id}`,
        date: voucher.disbursementDate || voucher.issueDate,
        type: 'expense',
        category: 'Décaissement',
        description: `${voucher.voucherNumber} - ${voucher.description}`,
        amount: amount(voucher.amountTTC),
        reference: voucher.reference || voucher.voucherNumber,
        sourceType: voucher.sourceType,
        paymentMethod: voucher.paymentMethod,
      });
    });

    const orderedMovements = movements.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    let runningBalance = 0;
    const movementsChronological = [...orderedMovements].reverse().map((movement) => {
      runningBalance += movement.type === 'income' ? movement.amount : -movement.amount;
      return {
        ...movement,
        balance: runningBalance,
      };
    });

    const treasuryMovements = movementsChronological.reverse();

    const entries = [];

    factures
      .filter((invoice) => !['BROUILLON', 'ANNULEE'].includes(String(invoice.status)))
      .forEach((invoice) => {
        entries.push({
          id: buildEntryId('invoice', invoice.id),
          date: invoice.dateEmission,
          journalCode: 'VT',
          journalLabel: 'Journal des ventes',
          accountDebit: '411',
          accountDebitLabel: 'Clients',
          accountCredit: '706',
          accountCreditLabel: 'Prestations de services',
          label: `Facture ${invoice.numeroFacture}`,
          debit: amount(invoice.montantHT),
          credit: amount(invoice.montantHT),
          reference: invoice.numeroFacture,
          sourceType: 'INVOICE',
          sourceId: invoice.id,
        });
      });

    paiements.forEach((payment) => {
      const treasuryAccount = treasuryAccountCode(payment.methodePaiement);
      entries.push({
        id: buildEntryId('payment', payment.id),
        date: payment.datePaiement,
        journalCode: String(payment.methodePaiement || '').toUpperCase() === 'ESPECES' ? 'CA' : 'BQ',
        journalLabel: String(payment.methodePaiement || '').toUpperCase() === 'ESPECES' ? 'Journal de caisse' : 'Journal de banque',
        accountDebit: treasuryAccount.code,
        accountDebitLabel: treasuryAccount.label,
        accountCredit: '411',
        accountCreditLabel: 'Clients',
        label: payment.facture?.numeroFacture
          ? `Encaissement facture ${payment.facture.numeroFacture}`
          : 'Encaissement client',
        debit: amount(payment.montant),
        credit: amount(payment.montant),
        reference: payment.reference || payment.facture?.numeroFacture || payment.id,
        sourceType: 'PAYMENT',
        sourceId: payment.id,
      });
    });

    vouchers
      .filter((voucher) => voucher.status !== 'ANNULE')
      .forEach((voucher) => {
        const expenseAccount = expenseAccountCode(voucher);
        entries.push({
          id: buildEntryId('voucher-booking', voucher.id),
          date: voucher.issueDate,
          journalCode: 'AC',
          journalLabel: 'Journal des achats',
          accountDebit: expenseAccount.code,
          accountDebitLabel: expenseAccount.label,
          accountCredit: '401',
          accountCreditLabel: 'Fournisseurs',
          label: `${voucher.voucherNumber} - ${voucher.description}`,
          debit: amount(voucher.amountHT || voucher.amountTTC),
          credit: amount(voucher.amountHT || voucher.amountTTC),
          reference: voucher.sourceNumber || voucher.voucherNumber,
          sourceType: 'CASH_VOUCHER',
          sourceId: voucher.id,
        });

        if (voucher.status === 'DECAISSE') {
          const treasuryAccount = treasuryAccountCode(voucher.paymentMethod);
          entries.push({
            id: buildEntryId('voucher-disbursement', voucher.id),
            date: voucher.disbursementDate || voucher.issueDate,
            journalCode: treasuryAccount.code === '531' ? 'CA' : 'BQ',
            journalLabel: treasuryAccount.code === '531' ? 'Journal de caisse' : 'Journal de banque',
            accountDebit: '401',
            accountDebitLabel: 'Fournisseurs',
            accountCredit: treasuryAccount.code,
            accountCreditLabel: treasuryAccount.label,
            label: `Décaissement ${voucher.voucherNumber}`,
            debit: amount(voucher.amountTTC),
            credit: amount(voucher.amountTTC),
            reference: voucher.reference || voucher.voucherNumber,
            sourceType: 'CASH_VOUCHER',
            sourceId: voucher.id,
          });
        }
      });

    const orderedEntries = entries.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

    const assets = accounts.filter((account) => ['asset'].includes(account.type));
    const liabilities = accounts.filter((account) => ['liability'].includes(account.type));
    const equity = accounts.filter((account) => account.type === 'equity');
    const revenues = accounts.filter((account) => account.type === 'revenue');
    const expenses = accounts.filter((account) => account.type === 'expense');

    const totalAssets = assets.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalEquity = equity.reduce((sum, account) => sum + amount(account.balance), 0);
    const totalExpenses = expenses.reduce((sum, account) => sum + amount(account.balance), 0);

    const paymentMethodBreakdown = vouchers.reduce((accumulator, voucher) => {
      const key = String(voucher.paymentMethod || 'AUTRE').toUpperCase();
      accumulator[key] = (accumulator[key] || 0) + amount(voucher.amountTTC);
      return accumulator;
    }, {});

    const expenseCategoryBreakdown = vouchers.reduce((accumulator, voucher) => {
      const key =
        voucher.expenseCategory ||
        (voucher.sourceType === 'PURCHASE_ORDER' ? 'Achats validés' : 'Autres dépenses');
      accumulator[key] = (accumulator[key] || 0) + amount(voucher.amountTTC);
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
        totalRevenue,
        totalExpenses,
        netResult,
      },
      treasury: {
        inflows: totalReceived,
        outflows: totalDisbursed,
        closingBalance: runningBalance,
        byPaymentMethod: paymentMethodBreakdown,
      },
      commitments: {
        totalCommitted,
        pendingCommitted: pendingCommitments,
        byCategory: expenseCategoryBreakdown,
      },
      kpis: {
        netMargin: totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0,
        collectionRate: totalRevenue > 0 ? (totalReceived / (totalRevenue + totalCollectedVat)) * 100 : 0,
        disbursementCoverage: totalCommitted > 0 ? (totalDisbursed / totalCommitted) * 100 : 0,
      },
    };

    return res.json({
      success: true,
      data: {
        period: req.query.period || 'all',
        generatedAt: new Date().toISOString(),
        summary: {
          totalRevenue,
          totalReceived,
          totalExpenseHT,
          totalDisbursed,
          clientReceivables,
          supplierLiabilities,
          totalCommitted,
          pendingCommitted,
          netResult,
        },
        accounts,
        treasuryMovements,
        entries: orderedEntries,
        reports,
      },
    });
  } catch (error) {
    console.error('Erreur overview comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données comptables',
    });
  }
};
