// Accès aux devis, numérotation et vérification de leur portée entreprise.
const { generateDevisNumber, generateFactureNumber, assertEnterpriseInScope, moment, axios, prisma, QUOTE_READ_INCLUDE, normalizeText, getDefaultDate } = require('./core');

const buildActorContext = (req) => ({
  actorId: req.user?.id ? String(req.user.id) : null,
  actorEmail: req.user?.email || null,
  actorRole: req.user?.role || null,
});

const createQuoteEvent = async (tx, devisId, type, req, note = null, payload = null) => {
  const actor = buildActorContext(req);
  return tx.devisEvent.create({
    data: {
      devisId,
      type,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      actorRole: actor.actorRole,
      note: note || null,
      payload: payload || undefined,
    },
  });
};

const getNextDevisNumber = async (tx = prisma) => {
  const currentYearMonth = moment().format('YYYYMM');
  const lastDevis = await tx.devis.findFirst({
    where: {
      numeroDevis: {
        startsWith: `DEV-${currentYearMonth}-`,
      },
    },
    orderBy: { numeroDevis: 'desc' },
  });

  let sequence = 1;
  if (lastDevis) {
    const lastSequence = parseInt(lastDevis.numeroDevis.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return generateDevisNumber(sequence);
};

const getNextFactureNumber = async (tx = prisma) => {
  const currentYearMonth = moment().format('YYYYMM');
  const lastFacture = await tx.facture.findFirst({
    where: {
      numeroFacture: {
        startsWith: `FAC-${currentYearMonth}-`,
      },
    },
    orderBy: { numeroFacture: 'desc' },
  });

  let sequence = 1;
  if (lastFacture) {
    const lastSequence = parseInt(lastFacture.numeroFacture.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return generateFactureNumber(sequence);
};

const fetchServiceMeta = async (req, serviceId) => {
  if (!serviceId) {
    return {
      serviceName: null,
      serviceLogoUrl: null,
    };
  }

  try {
    const authBase = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
    const resp = await axios.get(`${authBase}/api/services/${serviceId}`, {
      headers: { authorization: req.headers.authorization || '' },
    });
    return {
      serviceName: resp.data?.data?.name || null,
      serviceLogoUrl: resp.data?.data?.imageUrl || null,
    };
  } catch (error) {
    console.warn('Meta service non recuperee', error?.response?.status || error.message);
    return {
      serviceName: null,
      serviceLogoUrl: null,
    };
  }
};

const fetchClientMeta = async (req, clientId) => {
  if (!clientId) {
    return {
      clientName: null,
      clientEmail: null,
    };
  }

  try {
    const customerBase = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
    const resp = await axios.get(`${customerBase}/api/clients/${clientId}`, {
      headers: { authorization: req.headers.authorization || '' },
    });
    return {
      clientName: resp.data?.data?.nom || null,
      clientEmail: resp.data?.data?.email || null,
    };
  } catch (error) {
    console.warn('Meta client non recuperee', error?.response?.status || error.message);
    return {
      clientName: null,
      clientEmail: null,
    };
  }
};

const buildApprovalUrl = (req, token) => {
  const baseUrl =
    process.env.APP_PUBLIC_URL ||
    `${req.headers['x-forwarded-proto'] || req.protocol || 'http'}://${req.get('host')}`;
  return `${baseUrl.replace(/\/$/, '')}/quotes/respond/${token}`;
};

const sendQuoteEmail = async (req, payload) => {
  const communicationBase = process.env.COMMUNICATION_SERVICE_URL || 'http://communication-service:4002';
  const createResp = await axios.post(
    `${communicationBase}/api/messages`,
    payload,
    {
      headers: { authorization: req.headers.authorization || '' },
    }
  );

  const messageId = createResp.data?.id;
  if (!messageId) {
    throw new Error('Message email non cree');
  }

  await axios.post(
    `${communicationBase}/api/messages/${messageId}/send`,
    {},
    {
      headers: { authorization: req.headers.authorization || '' },
    }
  );

  return { messageId };
};

const getQuoteByClientTokenOrThrow = async (token, include = { include: QUOTE_READ_INCLUDE }) => {
  const accessToken = normalizeText(token);
  if (!accessToken) {
    const error = new Error('Lien client invalide');
    error.statusCode = 400;
    throw error;
  }

  const devis = await prisma.devis.findFirst({
    where: { clientAccessToken: accessToken },
    ...include,
  });

  if (!devis) {
    const error = new Error('Devis introuvable ou lien invalide');
    error.statusCode = 404;
    throw error;
  }

  if (devis.clientAccessTokenExpiresAt && devis.clientAccessTokenExpiresAt < new Date()) {
    const error = new Error('Le lien client a expiré');
    error.statusCode = 410;
    throw error;
  }

  return devis;
};

const createInvoiceFromQuote = async (tx, devis, options = {}) => {
  const numeroFacture = await getNextFactureNumber(tx);
  const dateEcheance = getDefaultDate(options.dateEcheance || devis.dateValidite, 30);

  const invoice = await tx.facture.create({
    data: {
      numeroFacture,
      clientId: devis.clientId,
      enterpriseId: devis.enterpriseId || null,
      enterpriseName: devis.enterpriseName || null,
      dateEcheance,
      montantHT: devis.montantHT,
      montantTVA: devis.montantTVA,
      montantTTC: devis.montantTTC,
      notes:
        options.notes ||
        `Convertie du devis ${devis.numeroDevis}${devis.objet ? ` - ${devis.objet}` : ''}`,
      serviceId: devis.serviceId,
      serviceName: devis.serviceName,
      serviceLogoUrl: devis.serviceLogoUrl,
      lignes: {
        create: devis.lignes.map((ligne) => ({
          description: ligne.description,
          imageUrl: ligne.imageUrl || null,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          tauxTVA: ligne.tauxTVA,
          montantHT: ligne.montantHT,
          montantTVA: ligne.montantTVA,
          montantTTC: ligne.montantTTC,
        })),
      },
    },
    include: {
      lignes: true,
      paiements: true,
    },
  });

  return invoice;
};

const updateQuoteLines = async (tx, devisId, lignes) => {
  await tx.ligneDevis.deleteMany({ where: { devisId } });
  if (lignes.length > 0) {
    await tx.ligneDevis.createMany({
      data: lignes.map((ligne) => ({
        devisId,
        ...ligne,
      })),
    });
  }
};

const getQuoteOrThrow = async (id, queryConfig = { include: QUOTE_READ_INCLUDE }) => {
  const devis = await prisma.devis.findUnique({
    where: { id },
    ...queryConfig,
  });

  if (!devis) {
    const error = new Error('Devis non trouve');
    error.statusCode = 404;
    throw error;
  }

  return devis;
};

const getScopedQuoteOrThrow = async (
  req,
  id,
  queryConfig = { include: QUOTE_READ_INCLUDE },
  message = "Vous n'avez pas acces a ce devis."
) => {
  const devis = await getQuoteOrThrow(id, queryConfig);
  await assertEnterpriseInScope(req, devis.enterpriseId, message);
  return devis;
};

module.exports = { buildActorContext, createQuoteEvent, getNextDevisNumber, getNextFactureNumber, fetchServiceMeta, fetchClientMeta, buildApprovalUrl, sendQuoteEmail, getQuoteByClientTokenOrThrow, createInvoiceFromQuote, updateQuoteLines, getQuoteOrThrow, getScopedQuoteOrThrow };
