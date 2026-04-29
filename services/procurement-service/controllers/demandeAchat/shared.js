const { PrismaClient } = require('@prisma/client');
const {
  generateDemandeAchatNumber,
  generateBonCommandeNumber,
  generateProformaNumber,
} = require('../../utils/purchaseNumberGenerator');
const {
  normalizeQuoteLines,
  normalizeProformaLines,
  calculateTotals,
  fetchServiceMeta,
  serializeQuote,
  serializeOrder,
  serializeProforma,
} = require('../../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../../utils/outbox');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../../utils/enterpriseScope');

const prisma = new PrismaClient();

const withEnterpriseContext = (payload = {}, entity = null) => ({
  ...payload,
  enterpriseId: entity?.enterpriseId ?? payload.enterpriseId ?? null,
  enterpriseName: entity?.enterpriseName || payload.enterpriseName || null,
});

const proformaInclude = {
  fournisseur: true,
  lignes: {
    orderBy: { createdAt: 'asc' },
  },
  approvalLogs: {
    orderBy: { createdAt: 'desc' },
  },
  bonCommande: {
    select: {
      id: true,
      numeroBon: true,
      status: true,
    },
  },
};

const quoteInclude = {
  fournisseur: true,
  lignes: {
    orderBy: { createdAt: 'asc' },
  },
  approvalLogs: {
    orderBy: { createdAt: 'desc' },
  },
  proformas: {
    orderBy: { createdAt: 'desc' },
    include: proformaInclude,
  },
  bonsCommande: {
    orderBy: { createdAt: 'desc' },
    include: {
      fournisseur: true,
      proforma: {
        select: {
          id: true,
          numeroProforma: true,
        },
      },
      lignes: {
        orderBy: { createdAt: 'asc' },
      },
      demandeAchat: {
        select: {
          id: true,
          numeroDemande: true,
          titre: true,
        },
      },
    },
  },
};

const isAdminUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR'].includes(role);
};

const normalizePermissions = (permissions = []) =>
  (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => String(permission || '').trim().toLowerCase())
    .filter(Boolean);

const hasPermission = (user, ...permissions) => {
  const permissionSet = new Set(normalizePermissions(user?.permissions));
  return permissions.some((permission) => permissionSet.has(String(permission).toLowerCase()));
};

const canReadAllQuotes = (user) =>
  isAdminUser(user) ||
  hasPermission(
    user,
    'quotes.read_all',
    'purchases.read_all',
    'purchase_requests.read_all',
    'purchase_orders.create',
    'purchase_orders.update',
    'purchase_requests.approve'
  );

const canReadOwnQuotesOnly = (user) => {
  if (canReadAllQuotes(user)) {
    return false;
  }

  return hasPermission(
    user,
    'purchases.read',
    'purchases.create',
    'purchases.update',
    'quotes.read_own',
    'purchases.read_own',
    'purchase_requests.read',
    'purchase_requests.read_own',
    'purchase_requests.create',
    'purchase_requests.update'
  );
};

const canCreateRequests = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchases.create', 'purchase_requests.create');

const canUpdateRequests = (user) =>
  isAdminUser(user) ||
  hasPermission(user, 'purchases.update', 'purchase_requests.update', 'purchases.create', 'purchase_requests.create');

const canSubmitQuotes = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchases.submit') || canUpdateRequests(user);

const canApproveQuotes = (user) => isAdminUser(user) || hasPermission(user, 'purchase_requests.approve');
const canRejectQuotes = (user) => canApproveQuotes(user);

const canManageProformas = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_orders.create', 'purchase_orders.update');

const canEvaluateCommittee = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_requests.evaluate_committee', 'purchase_requests.approve');

const getCorrelationId = (req) =>
  req.headers['x-correlation-id'] || req.headers['x-correlation-id'.toLowerCase()] || null;

const ensureServiceContext = async (req, fallbackName = null, requestedServiceId = null) => {
  const parsedRequestedServiceId =
    requestedServiceId !== undefined && requestedServiceId !== null && requestedServiceId !== ''
      ? Number(requestedServiceId)
      : null;
  const rawServiceId = req.user?.serviceId ?? parsedRequestedServiceId ?? null;
  const serviceId = rawServiceId != null && Number.isFinite(Number(rawServiceId)) ? Number(rawServiceId) : null;

  const serviceMeta = serviceId
    ? await fetchServiceMeta(req, serviceId, req.user?.serviceName || fallbackName)
    : { serviceName: req.user?.serviceName || fallbackName || null };

  return {
    serviceId,
    serviceName: serviceMeta.serviceName || req.user?.serviceName || fallbackName || null,
  };
};

const toDateOrNull = (value) => (value ? new Date(value) : null);

const canAccessQuote = (req, demande) => {
  if (!demande) {
    return false;
  }

  if (!canReadOwnQuotesOnly(req.user)) {
    return true;
  }

  return String(demande.demandeurId || '') === String(req.user?.id || '');
};

const assertQuoteAccess = async (req, demande) => {
  await assertEnterpriseInScope(req, demande?.enterpriseId, "Vous n'avez pas acces a cette DPA");

  if (!canAccessQuote(req, demande)) {
    const error = new Error('Acces refuse a cette DPA');
    error.statusCode = 403;
    throw error;
  }
};

const buildQuoteWhere = (req) => {
  const { status, demandeurId, serviceId, fournisseurId, search } = req.query;
  const where = {};

  if (status) {
    where.status = status;
  }

  if (canReadOwnQuotesOnly(req.user)) {
    where.demandeurId = String(req.user?.id || '');
  } else if (demandeurId) {
    where.demandeurId = String(demandeurId);
  }

  if (serviceId) {
    where.serviceId = Number(serviceId);
  }

  if (fournisseurId) {
    where.fournisseurId = String(fournisseurId);
  }

  if (search) {
    where.OR = [
      { titre: { contains: String(search), mode: 'insensitive' } },
      { objet: { contains: String(search), mode: 'insensitive' } },
      { numeroDemande: { contains: String(search), mode: 'insensitive' } },
      { enterpriseName: { contains: String(search), mode: 'insensitive' } },
      { fournisseurNomLibre: { contains: String(search), mode: 'insensitive' } },
      { fournisseur: { is: { nom: { contains: String(search), mode: 'insensitive' } } } },
      {
        proformas: {
          some: {
            OR: [
              { numeroProforma: { contains: String(search), mode: 'insensitive' } },
              { fournisseur: { is: { nom: { contains: String(search), mode: 'insensitive' } } } },
            ],
          },
        },
      },
    ];
  }

  return where;
};

const ensureQuoteExists = async (id) =>
  prisma.demandeAchat.findUnique({
    where: { id },
    include: quoteInclude,
  });

const ensureProformaExists = async (requestId, proformaId) =>
  prisma.proforma.findFirst({
    where: {
      id: proformaId,
      demandeAchatId: requestId,
    },
    include: proformaInclude,
  });

const buildActorContext = async (req, fallbackName = null, fallbackServiceId = null) => {
  const context = await ensureServiceContext(req, fallbackName, fallbackServiceId);
  if (context.error) {
    return context.error;
  }

  return {
    actorUserId: String(req.user.id),
    actorEmail: req.user?.email || null,
    actorServiceId: context.serviceId,
    actorServiceName: context.serviceName,
  };
};

const validateRequestForSubmission = (demande) => {
  if (!demande.fournisseurId && !String(demande.fournisseurNomLibre || '').trim()) {
    return 'Le fournisseur est obligatoire avant la soumission au PDG';
  }

  if (!Array.isArray(demande.lignes) || demande.lignes.length === 0) {
    return 'Au moins une ligne article est requise avant soumission';
  }

  if (demande.lignes.some((ligne) => Number(ligne.prixUnitaire || 0) <= 0)) {
    return 'Chaque ligne de la DPA doit comporter un prix fournisseur strictement positif';
  }

  return null;
};

const validateProformaReadiness = (proforma) => {
  if (!proforma.fournisseurId) {
    return 'Le fournisseur de la proforma est obligatoire';
  }

  if (!Array.isArray(proforma.lignes) || proforma.lignes.length === 0) {
    return 'Une proforma doit contenir au moins une ligne';
  }

  if (proforma.lignes.some((ligne) => Number(ligne.prixUnitaire || 0) <= 0)) {
    return 'Chaque ligne de la proforma doit comporter un prix strictement positif';
  }

  return null;
};

const parseNullableNonNegativeInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const normalizeOptionalText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const clampCommitteeScore = (value, maxPoints) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Number(maxPoints || 0), Math.round(parsed * 100) / 100));
};

const normalizeCommitteeChecks = (items = []) =>
  Array.isArray(items)
    ? items.map((item) => ({
        criterionIndex: Number(item?.criterionIndex ?? 0),
        label: String(item?.label || '').trim(),
        requiredDocument: normalizeOptionalText(item?.requiredDocument),
        passed:
          item?.passed === true || item?.passed === false
            ? Boolean(item.passed)
            : null,
        notes: normalizeOptionalText(item?.notes),
      }))
    : [];

const normalizeCommitteeScores = (items = []) =>
  Array.isArray(items)
    ? items.map((item) => {
        const maxPoints = clampCommitteeScore(item?.maxPoints ?? 0, Number(item?.maxPoints ?? 0));
        return {
          criterionIndex: Number(item?.criterionIndex ?? 0),
          label: String(item?.label || '').trim(),
          maxPoints,
          points: clampCommitteeScore(item?.points ?? 0, maxPoints),
          notes: normalizeOptionalText(item?.notes),
        };
      })
    : [];

const sumCommitteeScores = (items = []) =>
  Math.round(items.reduce((sum, item) => sum + Number(item?.points || 0), 0) * 100) / 100;

const buildCommitteeEvaluation = ({
  profileCode,
  eliminatoryChecks,
  technicalScores,
  financialCriterion,
  decision,
  decisionNote,
  actor,
  signDecision = false,
}) => {
  const normalizedChecks = normalizeCommitteeChecks(eliminatoryChecks);
  const normalizedTechnicalScores = normalizeCommitteeScores(technicalScores);
  const normalizedFinancialCriterion = financialCriterion
    ? {
        criterionIndex: Number(financialCriterion?.criterionIndex ?? 0),
        label: String(financialCriterion?.label || '').trim(),
        maxPoints: clampCommitteeScore(
          financialCriterion?.maxPoints ?? 40,
          Number(financialCriterion?.maxPoints ?? 40)
        ),
        points: clampCommitteeScore(
          financialCriterion?.points ?? 0,
          Number(financialCriterion?.maxPoints ?? 40)
        ),
        notes: normalizeOptionalText(financialCriterion?.notes),
      }
    : null;

  const eliminatoryPassed = normalizedChecks.every((item) => item.passed !== false);
  const technicalTotal = sumCommitteeScores(normalizedTechnicalScores);
  const financialScore = normalizedFinancialCriterion ? Number(normalizedFinancialCriterion.points || 0) : 0;
  const totalScore = Math.round((technicalTotal + financialScore) * 100) / 100;
  const now = new Date();

  return {
    committeeProfileCode: normalizeOptionalText(profileCode),
    committeeDecision: normalizeOptionalText(decision),
    committeeDecisionNote: normalizeOptionalText(decisionNote),
    committeeEvaluatedAt: now,
    committeeEvaluatedByUserId: actor?.userId || null,
    committeeEvaluatedByEmail: actor?.email || null,
    committeeEvaluatedByServiceId: actor?.serviceId ?? null,
    committeeEvaluatedByServiceName: actor?.serviceName || null,
    committeeSignedAt: signDecision ? now : null,
    committeeSignedByUserId: signDecision ? actor?.userId || null : null,
    committeeSignedByEmail: signDecision ? actor?.email || null : null,
    committeeSignedByServiceId: signDecision ? actor?.serviceId ?? null : null,
    committeeSignedByServiceName: signDecision ? actor?.serviceName || null : null,
    committeeEvaluation: {
      profileCode: normalizeOptionalText(profileCode),
      eliminatoryChecks: normalizedChecks,
      eliminatoryPassed,
      technicalScores: normalizedTechnicalScores,
      technicalTotal,
      financialCriterion: normalizedFinancialCriterion,
      financialScore,
      totalScore,
      decision: normalizeOptionalText(decision),
      decisionNote: normalizeOptionalText(decisionNote),
      lastUpdatedAt: now.toISOString(),
      lastUpdatedByUserId: actor?.userId || null,
      lastUpdatedByEmail: actor?.email || null,
      lastUpdatedByServiceId: actor?.serviceId ?? null,
      lastUpdatedByServiceName: actor?.serviceName || null,
      signedAt: signDecision ? now.toISOString() : null,
      signedByUserId: signDecision ? actor?.userId || null : null,
      signedByEmail: signDecision ? actor?.email || null : null,
      signedByServiceId: signDecision ? actor?.serviceId ?? null : null,
      signedByServiceName: signDecision ? actor?.serviceName || null : null,
    },
  };
};

const buildQuoteSnapshotPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  enterpriseId: quote.enterpriseId ?? null,
  enterpriseName: quote.enterpriseName || null,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  requesterUserId: quote.demandeurUserId,
  supplierId: quote.selectedProformaId
    ? quote.proformas?.find((proforma) => proforma.id === quote.selectedProformaId)?.fournisseurId || quote.fournisseurId
    : quote.fournisseurId,
  supplierName: quote.selectedProformaId
    ? quote.proformas?.find((proforma) => proforma.id === quote.selectedProformaId)?.fournisseurNom || quote.fournisseurNom
    : quote.fournisseurNom,
  amountHT: quote.montantHT,
  amountTVA: quote.montantTVA,
  amountTTC: quote.montantTTC,
  currency: quote.devise || 'XOF',
  status: quote.status,
  selectedProformaId: quote.selectedProformaId || null,
  selectedProformaNumber: quote.selectedProformaNumber || null,
});

const purchaseQuoteCreatedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  createdAt: quote.createdAt,
});

const purchaseQuoteSubmittedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  submittedAt: quote.submittedAt,
});

const purchaseQuoteRejectedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  reason: quote.rejectionReason || null,
});

const purchaseQuoteApprovedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  approvedByUserId: quote.approvedByUserId,
  approvedByServiceId: quote.approvedByServiceId,
  approvedByServiceName: quote.approvedByServiceName,
});

const proformaCreatedPayload = (quote, proforma) => ({
  enterpriseId: quote.enterpriseId ?? null,
  enterpriseName: quote.enterpriseName || null,
  serviceId: quote.serviceId ?? null,
  serviceName: quote.serviceName || null,
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  supplierId: proforma.fournisseurId,
  supplierName: proforma.fournisseurNom,
  amountHT: proforma.montantHT,
  amountTVA: proforma.montantTVA,
  amountTTC: proforma.montantTTC,
  currency: proforma.devise || quote.devise || 'XOF',
  quoteStatus: quote.status,
  selectedForOrder: Boolean(proforma.selectedForOrder),
  status: proforma.status,
});

const proformaSubmittedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
  submittedAt: proforma.submittedAt,
});

const proformaApprovedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
});

const proformaRejectedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
  reason: proforma.rejectionReason || null,
});

const purchaseOrderCreatedPayload = (order) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  sourcePurchaseQuoteId: order.sourceDevisAchatId,
  sourcePurchaseQuoteNumber: order.requestNumber,
  sourceProformaId: order.proformaId,
  sourceProformaNumber: order.proformaNumber,
  serviceId: order.serviceId,
  serviceName: order.serviceName,
  supplierId: order.supplierId,
  supplierName: order.fournisseurNom || order.supplier,
  amountHT: order.montantHT || 0,
  amountTVA: order.montantTVA || 0,
  amountTTC: order.montantTotal || order.amount,
  currency: 'XOF',
  status: order.status,
  createdAt: order.createdAt,
});

module.exports = {
  prisma,
  generateDemandeAchatNumber,
  generateBonCommandeNumber,
  generateProformaNumber,
  normalizeQuoteLines,
  normalizeProformaLines,
  calculateTotals,
  serializeQuote,
  serializeOrder,
  serializeProforma,
  enqueueProcurementEvent,
  applyEnterpriseScope,
  resolveEnterpriseContext,
  withEnterpriseContext,
  proformaInclude,
  quoteInclude,
  canCreateRequests,
  canUpdateRequests,
  canSubmitQuotes,
  canApproveQuotes,
  canRejectQuotes,
  canManageProformas,
  canEvaluateCommittee,
  canReadOwnQuotesOnly,
  getCorrelationId,
  toDateOrNull,
  assertQuoteAccess,
  buildQuoteWhere,
  ensureQuoteExists,
  ensureProformaExists,
  buildActorContext,
  validateRequestForSubmission,
  validateProformaReadiness,
  parseNullableNonNegativeInt,
  normalizeOptionalText,
  clampCommitteeScore,
  buildCommitteeEvaluation,
  purchaseQuoteCreatedPayload,
  purchaseQuoteSubmittedPayload,
  purchaseQuoteRejectedPayload,
  purchaseQuoteApprovedPayload,
  proformaCreatedPayload,
  proformaSubmittedPayload,
  proformaApprovedPayload,
  proformaRejectedPayload,
  purchaseOrderCreatedPayload,
};
