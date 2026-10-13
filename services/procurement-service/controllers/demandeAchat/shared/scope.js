// Contexte entreprise, service et acces aux demandes.
const { prisma, applyEnterpriseScope, resolveEnterpriseContext, quoteInclude, proformaInclude } = require('./core');
const { canReadAllQuotes, canReadOwnQuotesOnly } = require('./access');
const { fetchServiceMeta } = require('../../../utils/purchaseQuoteHelpers');
const { assertEnterpriseInScope } = require('../../../utils/enterpriseScope');

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

module.exports = { getCorrelationId, toDateOrNull, assertQuoteAccess, buildQuoteWhere, ensureQuoteExists, ensureProformaExists, buildActorContext };
