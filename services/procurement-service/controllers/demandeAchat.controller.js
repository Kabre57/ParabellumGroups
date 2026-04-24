const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const {
  generateDemandeAchatNumber,
  generateBonCommandeNumber,
  generateProformaNumber,
} = require('../utils/purchaseNumberGenerator');
const {
  normalizeQuoteLines,
  normalizeProformaLines,
  calculateTotals,
  fetchServiceMeta,
  serializeQuote,
  serializeOrder,
  serializeProforma,
} = require('../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../utils/outbox');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../utils/enterpriseScope');

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
  isAdminUser(user) ||
  hasPermission(user, 'purchases.submit') ||
  canUpdateRequests(user);

const canApproveQuotes = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_requests.approve');

const canRejectQuotes = (user) => canApproveQuotes(user);

const canManageProformas = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_orders.create', 'purchase_orders.update');

const canEvaluateCommittee = (user) =>
  isAdminUser(user) ||
  hasPermission(
    user,
    'purchase_requests.evaluate_committee',
    'purchase_requests.approve'
  );

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
  Math.round(
    items.reduce((sum, item) => sum + Number(item?.points || 0), 0) * 100
  ) / 100;

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

const purchaseQuoteCreatedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  requesterUserId: quote.demandeurUserId,
  supplierId: quote.fournisseurId,
  supplierName: quote.fournisseurNom,
  amountHT: quote.montantHT,
  amountTVA: quote.montantTVA,
  amountTTC: quote.montantTTC,
  currency: quote.devise || 'XOF',
  status: quote.status,
  createdAt: quote.createdAt,
});

const purchaseQuoteSubmittedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  status: quote.status,
  submittedAt: quote.submittedAt,
});

const purchaseQuoteRejectedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  status: quote.status,
  reason: quote.rejectionReason || null,
});

const purchaseQuoteApprovedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  approvedByUserId: quote.approvedByUserId,
  approvedByServiceId: quote.approvedByServiceId,
  approvedByServiceName: quote.approvedByServiceName,
  amountTTC: quote.montantTTC,
  status: quote.status,
});

const proformaCreatedPayload = (quote, proforma) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  supplierId: proforma.fournisseurId,
  supplierName: proforma.fournisseurNom,
  amountTTC: proforma.montantTTC,
  status: proforma.status,
});

const proformaSubmittedPayload = (quote, proforma) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  status: proforma.status,
  submittedAt: proforma.submittedAt,
});

const proformaApprovedPayload = (quote, proforma) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  supplierId: proforma.fournisseurId,
  supplierName: proforma.fournisseurNom,
  amountTTC: proforma.montantTTC,
  status: proforma.status,
});

const proformaRejectedPayload = (quote, proforma) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  status: proforma.status,
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

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 200);
    const skip = (page - 1) * limit;
    const where = await applyEnterpriseScope({
      req,
      where: buildQuoteWhere(req),
      requestedEnterpriseId: req.query.enterpriseId,
    });

    const [demandes, total] = await Promise.all([
      prisma.demandeAchat.findMany({
        where,
        skip,
        take: limit,
        include: quoteInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.demandeAchat.count({ where }),
    ]);

    res.json({
      success: true,
      data: demandes.map(serializeQuote),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching demandes achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération des DPA',
    });
  }
};

exports.create = async (req, res) => {
  try {
    if (!canCreateRequests(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de creer une DPA',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      titre,
      objet,
      description,
      fournisseurId,
      fournisseurNomLibre,
      dateDemande,
      dateBesoin,
      notes,
      devise,
      lignes = [],
    } = req.body;

    const normalizedLines = normalizeQuoteLines(lignes);
    const totals = calculateTotals(normalizedLines);
    const numeroDemande = await generateDemandeAchatNumber(prisma);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);

    const created = await prisma.$transaction(async (tx) => {
      const demande = await tx.demandeAchat.create({
        data: {
          numeroDemande,
          titre: String(titre || objet || 'Demande d achat').trim(),
          objet: String(objet || titre || 'Demande d achat').trim(),
          description: description || null,
          demandeurId: String(req.user.id),
          demandeurEmail: req.user?.email || null,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          fournisseurId: fournisseurId || null,
          fournisseurNomLibre: fournisseurId ? null : String(fournisseurNomLibre || '').trim() || null,
          devise: devise || 'XOF',
          dateDemande: toDateOrNull(dateDemande) || new Date(),
          dateBesoin: toDateOrNull(dateBesoin),
          montantEstime: totals.montantTTC,
          montantHT: totals.montantHT,
          montantTVA: totals.montantTVA,
          montantTTC: totals.montantTTC,
          status: 'BROUILLON',
          notes: notes || null,
          ...(normalizedLines.length > 0
            ? {
                lignes: {
                  createMany: {
                    data: normalizedLines,
                  },
                },
              }
            : {}),
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.created',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(
          purchaseQuoteCreatedPayload(serializeQuote(demande)),
          serializeQuote(demande)
        ),
      });

      return demande;
    });

    res.status(201).json({
      success: true,
      message: 'DPA créée avec succès',
      data: serializeQuote(created),
    });
  } catch (error) {
    console.error('Error creating demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la création de la DPA',
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const demande = await ensureQuoteExists(req.params.id);

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'DPA non trouvée',
      });
    }

    await assertQuoteAccess(req, demande);

    res.json({
      success: true,
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error fetching demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération de la DPA',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, existing);

    if (!canUpdateRequests(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette DPA' });
    }

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA en brouillon ou rejetées peuvent être modifiées',
      });
    }

    const {
      titre,
      objet,
      description,
      fournisseurId,
      fournisseurNomLibre,
      dateBesoin,
      notes,
      devise,
      enterpriseId,
      lignes,
    } = req.body;

    const normalizedLines = Array.isArray(lignes) ? normalizeQuoteLines(lignes) : null;
    const totals = normalizedLines ? calculateTotals(normalizedLines) : null;
    const enterprise =
      enterpriseId !== undefined
        ? await resolveEnterpriseContext(req, enterpriseId)
        : {
            enterpriseId: existing.enterpriseId || null,
            enterpriseName: existing.enterpriseName || null,
          };

    const updated = await prisma.$transaction(async (tx) => {
      if (normalizedLines) {
        await tx.ligneDemandeAchat.deleteMany({
          where: { demandeAchatId: existing.id },
        });
      }

      return tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          titre: titre !== undefined ? String(titre || objet || existing.titre).trim() : undefined,
          objet: objet !== undefined ? String(objet || titre || existing.objet || existing.titre).trim() : undefined,
          description: description !== undefined ? description || null : undefined,
          fournisseurId: fournisseurId !== undefined ? fournisseurId || null : undefined,
          fournisseurNomLibre:
            fournisseurNomLibre !== undefined || fournisseurId !== undefined
              ? fournisseurId
                ? null
                : String(fournisseurNomLibre || '').trim() || null
              : undefined,
          dateBesoin: dateBesoin !== undefined ? toDateOrNull(dateBesoin) : undefined,
          notes: notes !== undefined ? notes || null : undefined,
          devise: devise !== undefined ? devise || 'XOF' : undefined,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          ...(totals
            ? {
                montantEstime: totals.montantTTC,
                montantHT: totals.montantHT,
                montantTVA: totals.montantTVA,
                montantTTC: totals.montantTTC,
              }
            : {}),
          ...(normalizedLines
            ? {
                lignes: {
                  createMany: {
                    data: normalizedLines,
                  },
                },
              }
            : {}),
        },
        include: quoteInclude,
      });
    });

    res.json({
      success: true,
      message: 'DPA mise à jour',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error updating demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la DPA',
    });
  }
};

exports.submit = async (req, res) => {
  try {
    const existing = await ensureQuoteExists(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (!canSubmitQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de soumettre cette DPA au PDG',
      });
    }

    await assertQuoteAccess(req, existing);

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA en brouillon ou rejetées peuvent être soumises',
      });
    }

    const readinessError = validateRequestForSubmission(existing);
    if (readinessError) {
      return res.status(422).json({ success: false, message: readinessError });
    }

    const actorContext = await buildActorContext(req, existing.serviceName, existing.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'SUBMITTED',
          fromStatus: existing.status,
          toStatus: 'SOUMISE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'DPA soumise au PDG pour validation',
        },
      });

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'SOUMISE',
          submittedAt: new Date(),
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.submitted',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(
          purchaseQuoteSubmittedPayload(serializeQuote(demande)),
          serializeQuote(demande)
        ),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA soumise au PDG pour validation',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error submitting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la soumission de la DPA',
    });
  }
};

exports.approve = async (req, res) => {
  try {
    if (!canApproveQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission d approuver cette DPA',
      });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA soumises peuvent être approuvées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.approvedByServiceName || existing.serviceName,
      req.body?.approvedByServiceId || existing.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'APPROVED',
          fromStatus: existing.status,
          toStatus: 'APPROUVEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'DPA validée par la PDG',
        },
      });

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'APPROUVEE',
          approvedAt: new Date(),
          approvedByUserId: actorContext.actorUserId,
          approvedByServiceId: actorContext.actorServiceId,
          approvedByServiceName: actorContext.actorServiceName,
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.approved',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(
          purchaseQuoteApprovedPayload(serializeQuote(demande)),
          serializeQuote(demande)
        ),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA validée. Le service achat peut désormais enregistrer les proformas.',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error approving demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de l approbation de la DPA',
    });
  }
};

exports.reject = async (req, res) => {
  try {
    if (!canRejectQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de rejeter cette DPA',
      });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA soumises peuvent être rejetées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.rejectedByServiceName || existing.serviceName,
      req.body?.rejectedByServiceId || existing.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'REJECTED',
          fromStatus: existing.status,
          toStatus: 'REJETEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || req.body?.raison || null,
        },
      });

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'REJETEE',
          rejectionReason: req.body?.commentaire || req.body?.raison || null,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.rejected',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(
          purchaseQuoteRejectedPayload(serializeQuote(demande)),
          serializeQuote(demande)
        ),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA rejetée',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error rejecting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors du rejet de la DPA',
    });
  }
};

exports.createProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut enregistrer une proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    if (!['APPROUVEE', 'PROFORMAS_EN_COURS', 'PROFORMA_SOUMISE', 'PROFORMA_APPROUVEE'].includes(demande.status)) {
      return res.status(409).json({
        success: false,
        message: 'Les proformas ne peuvent être créées qu après validation de la DPA',
      });
    }

    const {
      fournisseurId,
      notes,
      devise,
      lignes = [],
      titre,
      delaiLivraisonJours,
      disponibilite,
      observationsAchat,
    } = req.body;
    const normalizedLines = normalizeProformaLines(lignes);
    if (!fournisseurId) {
      return res.status(422).json({ success: false, message: 'Le fournisseur de la proforma est obligatoire' });
    }
    if (normalizedLines.length === 0) {
      return res.status(422).json({ success: false, message: 'La proforma doit contenir au moins une ligne' });
    }

    const totals = calculateTotals(normalizedLines);
    const numeroProforma = await generateProformaNumber(prisma);

    const created = await prisma.$transaction(async (tx) => {
      const proforma = await tx.proforma.create({
        data: {
          numeroProforma,
          demandeAchatId: demande.id,
          fournisseurId: String(fournisseurId),
          titre: titre || `Proforma ${numeroProforma}`,
          devise: devise || demande.devise || 'XOF',
          montantHT: totals.montantHT,
          montantTVA: totals.montantTVA,
          montantTTC: totals.montantTTC,
          delaiLivraisonJours: parseNullableNonNegativeInt(delaiLivraisonJours),
          disponibilite: normalizeOptionalText(disponibilite),
          observationsAchat: normalizeOptionalText(observationsAchat),
          status: 'BROUILLON',
          notes: notes || null,
          lignes: {
            createMany: {
              data: normalizedLines,
            },
          },
        },
        include: proformaInclude,
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMAS_EN_COURS',
        },
      });

      const serializedQuote = serializeQuote(await tx.demandeAchat.findUnique({
        where: { id: demande.id },
        include: quoteInclude,
      }));

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.created',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaCreatedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.status(201).json({
      success: true,
      message: 'Proforma enregistrée avec succès',
      data: serializeProforma(created),
    });
  } catch (error) {
    console.error('Error creating proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la création de la proforma',
    });
  }
};

exports.recommendProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut retenir une proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (!['BROUILLON', 'REJETEE', 'SOUMISE', 'APPROUVEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Cette proforma ne peut pas être retenue dans son état actuel',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          recommendedForApproval: false,
        },
      });

      return tx.proforma.update({
        where: { id: existing.id },
        data: {
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });
    });

    res.json({
      success: true,
      message: 'La proforma recommandée a été mise à jour',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error recommending proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la sélection de la proforma recommandée',
    });
  }
};

exports.saveProformaCommitteeEvaluation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: errors.array(),
      });
    }

    if (!canEvaluateCommittee(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas la permission de renseigner la grille de commission",
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    const actorContext = await buildActorContext(req, demande.serviceName, demande.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const bestAmount = Math.min(
      ...demande.proformas
        .map((proforma) => Number(proforma.montantTTC || 0))
        .filter((amount) => Number.isFinite(amount) && amount > 0)
    );
    const thisAmount = Number(existing.montantTTC || 0);
    const computedFinancialScore =
      Number.isFinite(bestAmount) && bestAmount > 0 && thisAmount > 0
        ? clampCommitteeScore((bestAmount / thisAmount) * 40, 40)
        : 0;

    const evaluationPayload = buildCommitteeEvaluation({
      profileCode: req.body?.profileCode || existing.committeeProfileCode || null,
      eliminatoryChecks: req.body?.eliminatoryChecks,
      technicalScores: req.body?.technicalScores,
      financialCriterion: {
        criterionIndex: Number(req.body?.financialCriterion?.criterionIndex ?? 15),
        label: req.body?.financialCriterion?.label || 'Offre économiquement la plus avantageuse',
        maxPoints: Number(req.body?.financialCriterion?.maxPoints ?? 40),
        points: computedFinancialScore,
        notes: req.body?.financialCriterion?.notes || null,
      },
      decision: req.body?.decision,
      decisionNote: req.body?.decisionNote,
      actor: {
        userId: actorContext.actorUserId,
        email: actorContext.actorEmail,
        serviceId: actorContext.actorServiceId,
        serviceName: actorContext.actorServiceName,
      },
      signDecision: Boolean(req.body?.signDecision),
    });

    const updated = await prisma.proforma.update({
      where: { id: existing.id },
      data: evaluationPayload,
      include: proformaInclude,
    });

    res.json({
      success: true,
      message: req.body?.signDecision
        ? 'Décision finale signée et enregistrée'
        : 'Évaluation de commission enregistrée',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error saving proforma committee evaluation:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Erreur lors de l'enregistrement de l'évaluation de commission",
    });
  }
};

exports.submitProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut soumettre une proforma au PDG',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas en brouillon ou rejetées peuvent être soumises',
      });
    }

    const readinessError = validateProformaReadiness(existing);
    if (readinessError) {
      return res.status(422).json({ success: false, message: readinessError });
    }

    const actorContext = await buildActorContext(req, demande.serviceName, demande.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'SUBMITTED',
          fromStatus: existing.status,
          toStatus: 'SOUMISE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'Proforma soumise au PDG pour validation',
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'SOUMISE',
          submittedAt: new Date(),
          rejectionReason: null,
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });

      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          recommendedForApproval: false,
        },
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMA_SOUMISE',
        },
      });

      const serializedQuote = serializeQuote(await tx.demandeAchat.findUnique({
        where: { id: demande.id },
        include: quoteInclude,
      }));

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.submitted',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaSubmittedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma soumise au PDG pour validation',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error submitting proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la soumission de la proforma',
    });
  }
};

exports.approveProforma = async (req, res) => {
  try {
    if (!canApproveQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission d approuver cette proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas soumises peuvent être approuvées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.approvedByServiceName || demande.serviceName,
      req.body?.approvedByServiceId || demande.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'APPROVED',
          fromStatus: existing.status,
          toStatus: 'APPROUVEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'Proforma validée par la PDG',
        },
      });

      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          selectedForOrder: false,
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'APPROUVEE',
          approvedAt: new Date(),
          approvedByUserId: actorContext.actorUserId,
          approvedByServiceId: actorContext.actorServiceId,
          approvedByServiceName: actorContext.actorServiceName,
          rejectionReason: null,
          selectedForOrder: true,
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMA_APPROUVEE',
          fournisseurId: proforma.fournisseurId,
          montantEstime: proforma.montantTTC,
          montantHT: proforma.montantHT,
          montantTVA: proforma.montantTVA,
          montantTTC: proforma.montantTTC,
        },
      });

      const serializedQuote = serializeQuote(await tx.demandeAchat.findUnique({
        where: { id: demande.id },
        include: quoteInclude,
      }));

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.approved',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaApprovedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma validée. Le service achat peut maintenant générer le bon de commande.',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error approving proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de l approbation de la proforma',
    });
  }
};

exports.rejectProforma = async (req, res) => {
  try {
    if (!canRejectQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de rejeter cette proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas soumises peuvent être rejetées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.rejectedByServiceName || demande.serviceName,
      req.body?.rejectedByServiceId || demande.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'REJECTED',
          fromStatus: existing.status,
          toStatus: 'REJETEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || req.body?.raison || null,
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'REJETEE',
          rejectionReason: req.body?.commentaire || req.body?.raison || null,
          selectedForOrder: false,
          recommendedForApproval: false,
        },
        include: proformaInclude,
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMAS_EN_COURS',
        },
      });

      const serializedQuote = serializeQuote(await tx.demandeAchat.findUnique({
        where: { id: demande.id },
        include: quoteInclude,
      }));

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.rejected',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaRejectedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma rejetée',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error rejecting proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors du rejet de la proforma',
    });
  }
};

exports.generateOrder = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut générer un bon de commande',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    if (demande.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Cette DPA a déjà généré un bon de commande',
      });
    }

    const requestedProformaId = req.body?.proformaId || null;
    const selectedProforma =
      demande.proformas?.find((proforma) => proforma.id === requestedProformaId) ||
      demande.proformas?.find((proforma) => proforma.selectedForOrder) ||
      demande.proformas?.find((proforma) => proforma.status === 'APPROUVEE') ||
      null;

    if (!selectedProforma) {
      return res.status(422).json({
        success: false,
        message: 'Aucune proforma validée n est disponible pour générer le bon de commande',
      });
    }

    if (selectedProforma.status !== 'APPROUVEE') {
      return res.status(409).json({
        success: false,
        message: 'Seule une proforma validée peut être convertie en bon de commande',
      });
    }

    const numeroBon = await generateBonCommandeNumber(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId: demande.id,
          proformaId: selectedProforma.id,
          fournisseurId: selectedProforma.fournisseurId,
          enterpriseId: demande.enterpriseId || null,
          enterpriseName: demande.enterpriseName || null,
          serviceId: demande.serviceId,
          serviceName: demande.serviceName,
          dateCommande: new Date(),
          dateLivraison: req.body?.dateLivraisonPrevue ? new Date(req.body.dateLivraisonPrevue) : demande.dateBesoin,
          montantHT: selectedProforma.montantHT,
          montantTVA: selectedProforma.montantTVA,
          montantTotal: selectedProforma.montantTTC,
          status: 'BROUILLON',
          createdFromApproval: false,
          lignes: {
            createMany: {
              data: selectedProforma.lignes.map((ligne) => ({
                articleId: ligne.articleId,
                referenceArticle: ligne.referenceArticle,
                designation: ligne.designation,
                categorie: ligne.categorie,
                unite: ligne.unite,
                quantite: ligne.quantite,
                prixUnitaire: ligne.prixUnitaire,
                tva: ligne.tva,
                montantHT: ligne.montantHT,
                montantTTC: ligne.montantTTC,
                montant: ligne.montantTTC,
              })),
            },
          },
        },
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
      });

      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: demande.id,
          action: 'ORDER_CREATED',
          fromStatus: demande.status,
          toStatus: 'COMMANDEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: req.user?.serviceId ?? null,
          actorServiceName: req.user?.serviceName || null,
          commentaire: req.body?.commentaire || 'Bon de commande généré depuis la proforma validée',
        },
      });

      await tx.proformaApprovalLog.create({
        data: {
          proformaId: selectedProforma.id,
          action: 'ORDER_CREATED',
          fromStatus: 'APPROUVEE',
          toStatus: 'APPROUVEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: req.user?.serviceId ?? null,
          actorServiceName: req.user?.serviceName || null,
          commentaire: req.body?.commentaire || 'Bon de commande généré à partir de cette proforma',
        },
      });

      const purchaseQuote = await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'COMMANDEE',
          fournisseurId: selectedProforma.fournisseurId,
          montantEstime: selectedProforma.montantTTC,
          montantHT: selectedProforma.montantHT,
          montantTVA: selectedProforma.montantTVA,
          montantTTC: selectedProforma.montantTTC,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: purchaseOrder.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(
          purchaseOrderCreatedPayload(serializeOrder(purchaseOrder)),
          serializeOrder(purchaseOrder)
        ),
      });

      return { purchaseOrder, purchaseQuote };
    });

    res.json({
      success: true,
      message: 'Bon de commande généré avec succès',
      data: {
        purchaseQuote: serializeQuote(result.purchaseQuote),
        purchaseOrder: {
          id: result.purchaseOrder.id,
          numeroBon: result.purchaseOrder.numeroBon,
          status: result.purchaseOrder.status,
        },
      },
    });
  } catch (error) {
    console.error('Error generating purchase order:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la génération du bon de commande',
    });
  }
};

exports.getApprovalHistory = async (req, res) => {
  try {
    const demande = await prisma.demandeAchat.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        demandeurId: true,
        enterpriseId: true,
      },
    });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const logs = await prisma.demandeAchatApprovalLog.findMany({
      where: { demandeAchatId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorUserId: log.actorUserId,
        actorEmail: log.actorEmail,
        actorServiceId: log.actorServiceId,
        actorServiceName: log.actorServiceName,
        commentaire: log.commentaire,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération de l historique DPA',
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const where = await applyEnterpriseScope({
      req,
      where: buildQuoteWhere(req),
      requestedEnterpriseId: req.query.enterpriseId,
    });
    const scopedOrderWhere = await applyEnterpriseScope({
      req,
      where: {},
      requestedEnterpriseId: req.query.enterpriseId,
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalDemandes,
      pendingApproval,
      rejectedThisMonth,
      convertedToOrders,
      totalPendingAggregate,
      ordersThisMonth,
      pendingOrders,
    ] = await Promise.all([
      prisma.demandeAchat.count({ where }),
      prisma.demandeAchat.count({
        where: {
          ...where,
          status: { in: ['SOUMISE', 'PROFORMA_SOUMISE'] },
        },
      }),
      prisma.demandeAchat.count({
        where: {
          ...where,
          status: 'REJETEE',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.demandeAchat.count({
        where: { ...where, status: 'COMMANDEE' },
      }),
      prisma.demandeAchat.aggregate({
        where: {
          ...where,
          status: { in: ['SOUMISE', 'PROFORMA_SOUMISE'] },
        },
        _sum: { montantTTC: true },
      }),
      prisma.bonCommande.count({
        where: {
          ...scopedOrderWhere,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.bonCommande.count({
        where: {
          ...scopedOrderWhere,
          status: { in: ['BROUILLON', 'ENVOYE'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalQuotes: totalDemandes,
        pendingApproval,
        approvedThisMonth: convertedToOrders,
        rejectedThisMonth,
        convertedToOrders,
        totalAmountPending: Number(totalPendingAggregate._sum.montantTTC || 0),
        ordersThisMonth,
        pendingOrders,
        budgetRemaining: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching demande achat stats:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques achats',
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const existing = await ensureQuoteExists(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (!canUpdateRequests(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette DPA' });
    }

    await assertQuoteAccess(req, existing);

    if (existing.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer une DPA déjà convertie en bon de commande',
      });
    }

    if (existing.proformas?.length) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer une DPA qui possède déjà des proformas',
      });
    }

    await prisma.demandeAchat.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'DPA supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la suppression de la DPA',
    });
  }
};
