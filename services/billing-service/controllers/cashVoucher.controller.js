const { PrismaClient, CashVoucherStatus, MethodePaiement, CashVoucherFlowType } = require('@prisma/client');
const XLSX = require('xlsx');
const { resolveTreasuryAccountId } = require('../utils/treasury');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');
const { enrichEncaissementsWithInvoiceContext } = require('../utils/encaissementEnrichment');

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

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const getRowValue = (row, aliases) => {
  const entries = Object.entries(row || {});
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const match = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);
    if (match) {
      const value = match[1];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
  }
  return null;
};

const parseSpreadsheetDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H || 0, excelDate.M || 0, excelDate.S || 0);
    }
  }
  return parseDate(value);
};

const normalizePaymentMethod = (value, fallback = 'ESPECES') => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const mapping = {
    ESPECE: 'ESPECES',
    ESPECES: 'ESPECES',
    CASH: 'ESPECES',
    VIREMENT: 'VIREMENT',
    VIR: 'VIREMENT',
    CHEQUE: 'CHEQUE',
    CHEQUES: 'CHEQUE',
    CHQ: 'CHEQUE',
    CARTE: 'CARTE',
    CB: 'CARTE',
    PRELEVEMENT: 'PRELEVEMENT',
  };

  const resolved = mapping[normalized] || normalized;
  return Object.values(MethodePaiement).includes(resolved) ? resolved : fallback;
};

const normalizeFlowType = (value, fallback = 'DECAISSEMENT') => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const mapping = {
    ENCAISSEMENT: 'ENCAISSEMENT',
    ENCAISSE: 'ENCAISSEMENT',
    ENCAISSEMENTS: 'ENCAISSEMENT',
    DECAISSEMENT: 'DECAISSEMENT',
    DECAISSE: 'DECAISSEMENT',
    DECAISSEMENTS: 'DECAISSEMENT',
  };

  const resolved = mapping[normalized] || normalized;
  return Object.values(CashVoucherFlowType).includes(resolved) ? resolved : fallback;
};

const normalizeVoucherStatus = (value, fallback = 'VALIDE') => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const mapping = {
    BROUILLON: 'BROUILLON',
    ENATTENTE: 'EN_ATTENTE',
    EN_ATTENTE: 'EN_ATTENTE',
    VALIDE: 'VALIDE',
    DECAISSE: 'DECAISSE',
    ANNULE: 'ANNULE',
  };

  const resolved = mapping[normalized] || normalized;
  return Object.values(CashVoucherStatus).includes(resolved) ? resolved : fallback;
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

const createImportedVoucherData = async ({ row, req, defaultEnterpriseId, defaultEnterpriseName, defaultFlowType, defaultStatus }) => {
  const beneficiaryName =
    getRowValue(row, ['beneficiaire', 'beneficiaryName', 'nomprenom', 'nom', 'tiers']) ||
    getRowValue(row, ['supplierName', 'fournisseur']) ||
    null;

  if (!beneficiaryName) {
    throw new Error('Beneficiaire introuvable dans la ligne importee.');
  }

  const description = getRowValue(row, ['description', 'motif', 'libelle', 'objet']);
  if (!description) {
    throw new Error('Description ou motif obligatoire.');
  }

  const amountTTC = parseAmount(
    getRowValue(row, ['montantttc', 'amountttc', 'montant', 'amount']),
    NaN
  );

  if (!Number.isFinite(amountTTC) || amountTTC <= 0) {
    throw new Error('Montant TTC invalide.');
  }

  const amountHT = parseAmount(getRowValue(row, ['montantht', 'amountht']), amountTTC);
  const amountTVA = parseAmount(getRowValue(row, ['montanttva', 'amounttva', 'tva']), Math.max(0, amountTTC - amountHT));
  const enterpriseIdValue = getRowValue(row, ['enterpriseId', 'entrepriseId', 'societeId']);
  const enterpriseNameValue = getRowValue(row, ['enterpriseName', 'entrepriseName', 'societeName', 'entreprise']);
  const resolvedEnterpriseId = enterpriseIdValue ? Number(enterpriseIdValue) : defaultEnterpriseId;
  const resolvedEnterpriseName = enterpriseNameValue || defaultEnterpriseName || req.user?.enterpriseName || null;

  if (resolvedEnterpriseId) {
    await assertEnterpriseInScope(req, resolvedEnterpriseId, "Vous n'avez pas acces a l'entreprise selectionnee pour cet import.");
  }

  const paymentMethod = normalizePaymentMethod(
    getRowValue(row, ['modePaiement', 'methodePaiement', 'paymentMethod', 'mode']),
    'ESPECES'
  );
  const flowType = normalizeFlowType(
    getRowValue(row, ['typeFlux', 'flowType', 'sens']),
    defaultFlowType
  );
  const status = normalizeVoucherStatus(
    getRowValue(row, ['statut', 'status']),
    defaultStatus
  );
  const issueDate = parseSpreadsheetDate(getRowValue(row, ['date', 'issueDate', 'dateEmission'])) || new Date();
  const disbursementDate = parseSpreadsheetDate(getRowValue(row, ['dateDecaissement', 'disbursementDate']));

  return {
    voucherNumber: await nextVoucherNumber(),
    sourceType: getRowValue(row, ['sourceType', 'typeSource']) || 'IMPORT_EXCEL',
    sourceId: getRowValue(row, ['sourceId']) || null,
    sourceNumber: getRowValue(row, ['numeroPiece', 'voucherNumber', 'sourceNumber']) || null,
    expenseCategory: getRowValue(row, ['expenseCategory', 'categorieDepense', 'categorie']) || null,
    enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
    enterpriseName: resolvedEnterpriseName,
    serviceId: getRowValue(row, ['serviceId']) ? Number(getRowValue(row, ['serviceId'])) : null,
    serviceName: getRowValue(row, ['serviceName', 'service']) || null,
    supplierId: getRowValue(row, ['supplierId', 'fournisseurId']) || null,
    supplierName: getRowValue(row, ['supplierName', 'fournisseur']) || null,
    beneficiaryName: String(beneficiaryName).trim(),
    beneficiaryPhone: getRowValue(row, ['telephone', 'beneficiaryPhone', 'phone']) || null,
    description: String(description).trim(),
    amountHT,
    amountTVA,
    amountTTC,
    currency: getRowValue(row, ['currency', 'devise']) || 'XOF',
    paymentMethod,
    flowType,
    treasuryAccountId: null,
    issueDate,
    disbursementDate,
    reference: getRowValue(row, ['reference']) || null,
    notes: getRowValue(row, ['notes', 'commentaire', 'comments']) || null,
    status,
    createdByUserId: String(req.user?.userId || req.user?.id || ''),
    createdByEmail: req.user?.email || null,
  };
};

const serializeCashVoucher = (voucher) => ({
  id: voucher.id,
  voucherNumber: voucher.voucherNumber,
  sourceType: voucher.sourceType,
  sourceId: voucher.sourceId,
  sourceNumber: voucher.sourceNumber,
  expenseCategory: voucher.expenseCategory,
  enterpriseId: voucher.enterpriseId || null,
  enterpriseName: voucher.enterpriseName || null,
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
  flowType: voucher.flowType,
  treasuryAccountId: voucher.treasuryAccountId,
  treasuryAccountName: voucher.treasuryAccount?.name || null,
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
      flowType,
      treasuryAccountId,
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

    const resolvedTreasuryAccountId = await resolveTreasuryAccountId(prisma, {
      treasuryAccountId,
      paymentMethod,
      user: req.user,
    });
    const resolvedEnterpriseId = req.body.enterpriseId ? Number(req.body.enterpriseId) : req.user?.enterpriseId ? Number(req.user.enterpriseId) : null;
    const resolvedEnterpriseName = req.body.enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour ce bon de caisse."
    );

    const voucher = await prisma.cashVoucher.create({
      data: {
        voucherNumber: await nextVoucherNumber(),
        sourceType: sourceType || 'OTHER',
        sourceId: sourceId || null,
        sourceNumber: sourceNumber || null,
        expenseCategory: expenseCategory || null,
        enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
        enterpriseName: resolvedEnterpriseName,
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
        flowType: Object.values(CashVoucherFlowType).includes(String(flowType))
          ? flowType
          : 'DECAISSEMENT',
        treasuryAccountId: resolvedTreasuryAccountId,
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

exports.importCashVouchers = async (req, res) => {
  try {
    const accessError = ensureCreateAccess(req);
    if (accessError && !hasPermission(req.user, 'expenses.import')) {
      return res.status(accessError.status).json(accessError.body);
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un fichier Excel a importer.',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier Excel ne contient aucune feuille exploitable.',
      });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier Excel est vide.',
      });
    }

    const defaultEnterpriseId = req.body.enterpriseId ? Number(req.body.enterpriseId) : null;
    const defaultEnterpriseName = req.body.defaultEnterpriseName || req.user?.enterpriseName || null;
    const defaultFlowType = normalizeFlowType(req.body.defaultFlowType, 'DECAISSEMENT');
    const defaultStatus = normalizeVoucherStatus(req.body.defaultStatus, 'VALIDE');

    if (defaultEnterpriseId) {
      await assertEnterpriseInScope(req, defaultEnterpriseId, "Vous n'avez pas acces a l'entreprise selectionnee pour cet import.");
    }

    const imported = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const voucherData = await createImportedVoucherData({
          row,
          req,
          defaultEnterpriseId,
          defaultEnterpriseName,
          defaultFlowType,
          defaultStatus,
        });
        const voucher = await prisma.cashVoucher.create({ data: voucherData });
        imported.push(serializeCashVoucher(voucher));
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message || "Erreur d'import sur la ligne.",
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Import des bons de caisse termine.',
      data: {
        imported: imported.length,
        skipped: errors.length,
        errors,
        vouchers: imported,
      },
    });
  } catch (error) {
    console.error("Erreur import bons de caisse:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'import des bons de caisse",
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

    await assertEnterpriseInScope(req, existing.enterpriseId, "Vous n'avez pas acces a ce bon de caisse.");

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
