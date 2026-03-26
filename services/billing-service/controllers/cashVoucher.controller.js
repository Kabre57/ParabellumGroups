const { PrismaClient, CashVoucherStatus, MethodePaiement } = require('@prisma/client');

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

const canReadAllVouchers = (user) =>
  hasPermission(user, 'expenses.read_all', 'payments.read_all', 'expenses.approve');

const canReadOwnVouchers = (user) =>
  canReadAllVouchers(user) ||
  hasPermission(user, 'expenses.read', 'expenses.read_own', 'expenses.create', 'payments.read');

const ensureReadAccess = (req) => {
  if (canReadAllVouchers(req.user) || canReadOwnVouchers(req.user)) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message: 'Vous n avez pas la permission de consulter les bons de caisse',
    },
  };
};

const ensureCreateAccess = (req) => {
  if (hasPermission(req.user, 'expenses.create')) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message: 'Vous n avez pas la permission de créer un bon de caisse',
    },
  };
};

const ensureApprovalAccess = (req) => {
  if (hasPermission(req.user, 'expenses.approve', 'payments.validate')) {
    return null;
  }

  return {
    status: 403,
    body: {
      success: false,
      message: 'Vous n avez pas la permission de valider ou décaisser un bon de caisse',
    },
  };
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseAmount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nextVoucherNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `BCS-${year}${month}`;

  const count = await prisma.cashVoucher.count({
    where: {
      voucherNumber: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

const serializeCashVoucher = (voucher) => ({
  id: voucher.id,
  voucherNumber: voucher.voucherNumber,
  sourceType: voucher.sourceType,
  sourceId: voucher.sourceId,
  sourceNumber: voucher.sourceNumber,
  expenseCategory: voucher.expenseCategory,
  serviceId: voucher.serviceId,
  serviceName: voucher.serviceName,
  supplierId: voucher.supplierId,
  supplierName: voucher.supplierName,
  beneficiaryName: voucher.beneficiaryName,
  beneficiaryPhone: voucher.beneficiaryPhone,
  description: voucher.description,
  amountHT: voucher.amountHT,
  amountTVA: voucher.amountTVA,
  amountTTC: voucher.amountTTC,
  currency: voucher.currency,
  paymentMethod: voucher.paymentMethod,
  status: voucher.status,
  issueDate: voucher.issueDate,
  disbursementDate: voucher.disbursementDate,
  reference: voucher.reference,
  notes: voucher.notes,
  createdByUserId: voucher.createdByUserId,
  createdByEmail: voucher.createdByEmail,
  approvedByUserId: voucher.approvedByUserId,
  approvedByEmail: voucher.approvedByEmail,
  createdAt: voucher.createdAt,
  updatedAt: voucher.updatedAt,
});

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
      where,
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

exports.createCashVoucher = async (req, res) => {
  try {
    const accessError = ensureCreateAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const {
      sourceType,
      sourceId,
      sourceNumber,
      expenseCategory,
      serviceId,
      serviceName,
      supplierId,
      supplierName,
      beneficiaryName,
      beneficiaryPhone,
      description,
      amountHT,
      amountTVA,
      amountTTC,
      paymentMethod,
      issueDate,
      disbursementDate,
      reference,
      notes,
      status,
    } = req.body;

    if (!beneficiaryName || !description || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Le bénéficiaire, la description et le mode de paiement sont obligatoires',
      });
    }

    if (sourceType && sourceId) {
      const existingVoucher = await prisma.cashVoucher.findFirst({
        where: {
          sourceType: String(sourceType),
          sourceId: String(sourceId),
          status: {
            not: 'ANNULE',
          },
        },
      });

      if (existingVoucher) {
        return res.status(409).json({
          success: false,
          message: 'Un bon de caisse actif existe déjà pour cette pièce achat',
          data: serializeCashVoucher(existingVoucher),
        });
      }
    }

    const voucher = await prisma.cashVoucher.create({
      data: {
        voucherNumber: await nextVoucherNumber(),
        sourceType: sourceType || 'OTHER',
        sourceId: sourceId || null,
        sourceNumber: sourceNumber || null,
        expenseCategory: expenseCategory || null,
        serviceId: serviceId != null && serviceId !== '' ? Number(serviceId) : null,
        serviceName: serviceName || null,
        supplierId: supplierId || null,
        supplierName: supplierName || null,
        beneficiaryName: String(beneficiaryName).trim(),
        beneficiaryPhone: beneficiaryPhone || null,
        description: String(description).trim(),
        amountHT: parseAmount(amountHT, parseAmount(amountTTC, 0)),
        amountTVA: parseAmount(amountTVA, 0),
        amountTTC: parseAmount(amountTTC, parseAmount(amountHT, 0)),
        paymentMethod,
        issueDate: parseDate(issueDate) || new Date(),
        disbursementDate: parseDate(disbursementDate),
        reference: reference || null,
        notes: notes || null,
        status: Object.values(CashVoucherStatus).includes(String(status)) ? status : 'BROUILLON',
        createdByUserId: String(req.user?.userId || req.user?.id || ''),
        createdByEmail: req.user?.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Bon de caisse créé avec succès',
      data: serializeCashVoucher(voucher),
    });
  } catch (error) {
    console.error('Erreur création bon de caisse:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du bon de caisse',
    });
  }
};

exports.updateCashVoucherStatus = async (req, res) => {
  try {
    const accessError = ensureApprovalAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const { status, disbursementDate, reference, notes } = req.body;

    if (!Object.values(CashVoucherStatus).includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: 'Statut de bon de caisse invalide',
      });
    }

    const existing = await prisma.cashVoucher.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Bon de caisse non trouvé',
      });
    }

    const updated = await prisma.cashVoucher.update({
      where: { id },
      data: {
        status,
        disbursementDate:
          status === 'DECAISSE'
            ? parseDate(disbursementDate) || existing.disbursementDate || new Date()
            : parseDate(disbursementDate) || existing.disbursementDate,
        reference: reference !== undefined ? reference || null : existing.reference,
        notes: notes !== undefined ? notes || null : existing.notes,
        approvedByUserId: String(req.user?.userId || req.user?.id || ''),
        approvedByEmail: req.user?.email || null,
      },
    });

    return res.json({
      success: true,
      message: 'Statut du bon de caisse mis à jour',
      data: serializeCashVoucher(updated),
    });
  } catch (error) {
    console.error('Erreur mise à jour bon de caisse:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du bon de caisse',
    });
  }
};

exports.getSpendingOverview = async (req, res) => {
  try {
    const accessError = ensureReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const [commitments, vouchers] = await Promise.all([
      prisma.purchaseCommitment.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cashVoucher.findMany({
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const totalCommitted = commitments.reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);
    const totalVouchered = vouchers.reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);
    const totalDisbursed = vouchers
      .filter((item) => item.status === 'DECAISSE')
      .reduce((sum, item) => sum + Number(item.amountTTC || 0), 0);

    return res.json({
      success: true,
      data: {
        totals: {
          totalCommitted,
          totalVouchered,
          totalDisbursed,
          pendingVouchersAmount: vouchers
            .filter((item) => item.status === 'EN_ATTENTE' || item.status === 'VALIDE')
            .reduce((sum, item) => sum + Number(item.amountTTC || 0), 0),
        },
        commitments,
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
