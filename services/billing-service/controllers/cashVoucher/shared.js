// Fonctions et dépendances partagées entre les parcours de ce contrôleur.
const { PrismaClient, CashVoucherStatus, MethodePaiement, CashVoucherFlowType } = require('@prisma/client');
const XLSX = require('xlsx');
const { resolveTreasuryAccountId, getTreasuryAccountingAccountId } = require('../../utils/treasury');
const { applyEnterpriseScope, assertEnterpriseInScope, resolveEnterpriseContext } = require('../../utils/enterpriseScope');
const { enrichEncaissementsWithInvoiceContext } = require('../../utils/encaissementEnrichment');
const AccountingPostingService = require('../../core/services/AccountingPostingService');
const MappingService = require('../../core/services/AccountingMappingService');
const {
  resolveAccountingAccount,
  getTreasuryFamilyFromPaymentMethod,
  getTreasuryJournalMeta,
} = require('../../utils/accountingAccountResolver');

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
  const resolvedEnterpriseId = defaultEnterpriseId || (enterpriseIdValue ? Number(enterpriseIdValue) : null);
  const resolvedEnterpriseName = defaultEnterpriseId
    ? defaultEnterpriseName || enterpriseNameValue || req.user?.enterpriseName || null
    : enterpriseNameValue || req.user?.enterpriseName || null;

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
  counterpartAccountId: voucher.counterpartAccountId || null,
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

module.exports = { PrismaClient, CashVoucherStatus, MethodePaiement, CashVoucherFlowType, resolveTreasuryAccountId, getTreasuryAccountingAccountId, applyEnterpriseScope, assertEnterpriseInScope, resolveEnterpriseContext, enrichEncaissementsWithInvoiceContext, resolveAccountingAccount, getTreasuryFamilyFromPaymentMethod, getTreasuryJournalMeta, XLSX, AccountingPostingService, MappingService, prisma, normalizePermissions, isAdminUser, hasPermission, canReadAllVouchers, canReadOwnVouchers, ensureReadAccess, ensureCreateAccess, ensureApprovalAccess, parseDate, parseAmount, normalizeHeader, getRowValue, parseSpreadsheetDate, normalizePaymentMethod, normalizeFlowType, normalizeVoucherStatus, nextVoucherNumber, createImportedVoucherData, serializeCashVoucher };
