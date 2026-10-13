// Gestion de la synthèse des dépenses.
const { applyEnterpriseScope, enrichEncaissementsWithInvoiceContext, prisma, ensureReadAccess, parseDate, serializeCashVoucher } = require('./shared');

exports.getSpendingOverview = async (req, res) => {
  try {
    const accessError = ensureReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);
    const commitmentWhere = {};
    const voucherWhere = {};
    if (startDate || endDate) {
      commitmentWhere.createdAt = {};
      voucherWhere.issueDate = {};
      if (startDate) {
        commitmentWhere.createdAt.gte = startDate;
        voucherWhere.issueDate.gte = startDate;
      }
      if (endDate) {
        commitmentWhere.createdAt.lte = endDate;
        voucherWhere.issueDate.lte = endDate;
      }
    }

    const [commitments, vouchers, rawEncaissements, decaissements] = await Promise.all([
      prisma.purchaseCommitment.findMany({
        where: await applyEnterpriseScope({
          req,
          where: commitmentWhere,
          requestedEnterpriseId: req.query.enterpriseId,
        }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cashVoucher.findMany({
        where: await applyEnterpriseScope({
          req,
          where: voucherWhere,
          requestedEnterpriseId: req.query.enterpriseId,
        }),
        include: { treasuryAccount: true },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.encaissement.findMany({
        where: await applyEnterpriseScope({
          req,
          where: voucherWhere.issueDate ? { dateEncaissement: voucherWhere.issueDate } : {},
          requestedEnterpriseId: req.query.enterpriseId,
        }),
        include: { treasuryAccount: true },
        orderBy: { dateEncaissement: 'desc' },
      }),
      prisma.decaissement.findMany({
        where: await applyEnterpriseScope({
          req,
          where: voucherWhere.issueDate ? { dateDecaissement: voucherWhere.issueDate } : {},
          requestedEnterpriseId: req.query.enterpriseId,
        }),
        include: { treasuryAccount: true },
        orderBy: { dateDecaissement: 'desc' },
      }),
    ]);
    const encaissements = await enrichEncaissementsWithInvoiceContext(prisma, req, rawEncaissements);

    const totalCommitted = commitments.reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);
    const totalVouchered = vouchers.reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);
    const totalDisbursed = decaissements
      .filter((item) => item.status === 'DECAISSE')
      .reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);
    const totalReceived = encaissements
      .filter((item) => String(item.status || '').toUpperCase() === 'VALIDE')
      .reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);

    return res.json({
      success: true,
      data: {
        totals: {
          totalCommitted,
          totalVouchered,
          totalDisbursed,
          totalReceived,
          pendingVouchersAmount: vouchers
            .filter((item) => item.status === 'EN_ATTENTE' || item.status === 'VALIDE')
            .reduce((sum, item) => sum + Number(item.amountTTC || 0), 0),
        },
        commitments,
        encaissements,
        decaissements,
        cashVouchers: vouchers.map(serializeCashVoucher),
      },
    });
  } catch (error) {
    console.error('Erreur vue consolidée dépenses:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la vue consolidée des dépenses',
    });
  }
};
