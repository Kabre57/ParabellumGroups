// Gestion de la consultation des bons de caisse.
const { CashVoucherStatus, MethodePaiement, applyEnterpriseScope, prisma, canReadAllVouchers, ensureReadAccess, parseDate, serializeCashVoucher } = require('./shared');

exports.getAllCashVouchers = async (req, res) => {
  try {
    const accessError = ensureReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const where = {};
    if (req.query.status && Object.values(CashVoucherStatus).includes(String(req.query.status))) {
      where.status = String(req.query.status);
    }
    if (req.query.sourceType) {
      where.sourceType = String(req.query.sourceType);
    }
    if (req.query.paymentMethod && Object.values(MethodePaiement).includes(String(req.query.paymentMethod))) {
      where.paymentMethod = String(req.query.paymentMethod);
    }
    if (req.query.serviceId) {
      where.serviceId = Number(req.query.serviceId);
    }
    if (!canReadAllVouchers(req.user)) {
      where.createdByUserId = String(req.user?.userId || req.user?.id || '');
    }

    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = startDate;
      if (endDate) where.issueDate.lte = endDate;
    }

    if (req.query.search) {
      where.OR = [
        { voucherNumber: { contains: String(req.query.search), mode: 'insensitive' } },
        { sourceNumber: { contains: String(req.query.search), mode: 'insensitive' } },
        { beneficiaryName: { contains: String(req.query.search), mode: 'insensitive' } },
        { supplierName: { contains: String(req.query.search), mode: 'insensitive' } },
        { description: { contains: String(req.query.search), mode: 'insensitive' } },
      ];
    }

    const vouchers = await prisma.cashVoucher.findMany({
      where: await applyEnterpriseScope({
        req,
        where,
        requestedEnterpriseId: req.query.enterpriseId,
      }),
      include: { treasuryAccount: true },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      data: vouchers.map(serializeCashVoucher),
    });
  } catch (error) {
    console.error('Erreur récupération bons de caisse:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des bons de caisse',
    });
  }
};
