const crypto = require('crypto');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { generateDevisNumber, generateFactureNumber } = require('../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../utils/tvaCalculator');
const { generateDevisPDF } = require('../utils/pdfGenerator');
const { uploadToS3, isS3Configured } = require('../utils/s3');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const QUOTE_READ_INCLUDE = {
  lignes: true,
  evenements: {
    orderBy: { createdAt: 'desc' },
  },
};

const CLIENT_RESPONSE_STATUS = ['ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'];
const BILLING_READY_STATUS = ['ACCEPTE', 'TRANSMIS_FACTURATION'];

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const buildBillingLine = (ligne = {}) => {
  const description = String(
    ligne.description ||
      ligne.designation ||
      ligne.nom ||
      ligne.label ||
      ''
  ).trim();
  const imageUrl = normalizeText(ligne.imageUrl || ligne.image || ligne.image_url || null);
  const quantite = normalizeNumber(
    ligne.quantite ?? ligne.quantity ?? ligne.qty ?? 1,
    1
  );
  const prixUnitaire = normalizeNumber(
    ligne.prixUnitaire ?? ligne.unitPrice ?? ligne.unit_price ?? 0
  );
  const tauxTVA = normalizeNumber(
    ligne.tauxTVA ?? ligne.vatRate ?? ligne.vat_rate ?? ligne.tva ?? 0
  );
  const montants = calculateMontants(quantite, prixUnitaire, tauxTVA);

  return {
    description,
    imageUrl,
    quantite,
    prixUnitaire,
    tauxTVA,
    ...montants,
  };
};

const normalizeLines = (lignes) => {
  if (!Array.isArray(lignes)) return [];
  return lignes
    .map(buildBillingLine)
    .filter((ligne) => ligne.description && ligne.quantite > 0);
};

const buildTotals = (lignes) =>
  lignes.length > 0
    ? calculateTotal(lignes)
    : { totalHT: 0, totalTVA: 0, totalTTC: 0 };

const getDefaultDate = (value, daysToAdd = 30) => {
  if (value) return new Date(value);
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date;
};

const buildServiceAuthHeader = (req) => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    const token = jwt.sign(
      {
        userId: req.user?.id || 'system',
        email: req.user?.email || 'system@parabellum.local',
        role: 'admin',
      },
      secret,
      { expiresIn: '10m' }
    );
    return `Bearer ${token}`;
  }

  return req.headers?.authorization || null;
};

const fetchProspect = async (req, prospectId) => {
  if (!prospectId) return null;
  const baseUrl = process.env.COMMERCIAL_SERVICE_URL || 'http://commercial-service:4004';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;
  const response = await axios.get(`${baseUrl}/api/prospects/${prospectId}`, {
    headers: { Authorization: authHeader },
  });
  return response.data?.data || null;
};

const fetchDefaultTypeClientId = async (req) => {
  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;
  const response = await axios.get(`${baseUrl}/api/type-clients`, {
    params: { isActive: true },
    headers: { Authorization: authHeader },
  });
  const types = response.data?.data || [];
  if (!types.length) return null;
  const preferred = types.find((type) => String(type.code || '').toUpperCase() === 'ENTREPRISE');
  return (preferred || types[0]).id || null;
};

const findExistingClient = async (req, prospect) => {
  if (!prospect?.email) return null;
  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;

  try {
    const response = await axios.get(`${baseUrl}/api/clients/search`, {
      params: { q: prospect.email, limit: 1 },
      headers: { Authorization: authHeader },
    });
    const items = response.data?.data || [];
    return items.length ? items[0] : null;
  } catch (error) {
    return null;
  }
};

const splitContactName = (fullName) => {
  if (!fullName) {
    return { prenom: 'Contact', nom: 'Principal' };
  }

  const clean = String(fullName).trim().replace(/\s+/g, ' ');
  if (!clean) {
    return { prenom: 'Contact', nom: 'Principal' };
  }

  const parts = clean.split(' ');
  if (parts.length === 1) {
    return { prenom: clean, nom: clean };
  }

  const nom = parts.pop();
  return { prenom: parts.join(' '), nom };
};

const createContactFromProspect = async (req, clientId, prospect) => {
  if (!clientId || !prospect) return null;
  const contactName = prospect.contactName || prospect.nomContact || prospect.contact || '';
  if (!contactName && !prospect.email && !prospect.phone && !prospect.mobile) return null;

  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;

  const { prenom, nom } = splitContactName(contactName);

  const payload = {
    clientId,
    nom,
    prenom,
    email: prospect.email || null,
    telephone: prospect.mobile || prospect.phone || null,
    poste: prospect.position || null,
    principal: true,
    type: 'COMMERCIAL',
  };

  try {
    const response = await axios.post(`${baseUrl}/api/contacts`, payload, {
      headers: { Authorization: authHeader },
    });
    return response.data?.data || null;
  } catch (error) {
    return null;
  }
};

const createClientFromProspect = async (req, prospect, devis) => {
  if (!prospect) return null;
  if (!prospect.email) return null;

  const existingClient = await findExistingClient(req, prospect);
  if (existingClient?.id) return existingClient;

  const typeClientId = await fetchDefaultTypeClientId(req);
  if (!typeClientId) return null;

  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;

  const payload = {
    nom: prospect.companyName || prospect.contactName || 'Prospect',
    raisonSociale: prospect.companyName || prospect.contactName || null,
    email: prospect.email,
    telephone: prospect.phone || prospect.mobile || null,
    mobile: prospect.mobile || null,
    fax: prospect.fax || null,
    siteWeb: prospect.website || null,
    idu: prospect.idu || prospect.siret || null,
    ncc: prospect.ncc || prospect.tvaIntra || null,
    rccm: prospect.rccm || null,
    codeActivite: prospect.codeActivite || prospect.codeNAF || null,
    typeClientId,
    source: prospect.source || null,
    prospectId: devis.prospectId || prospect.id,
    commercialId: devis.commercialId || null,
  };

  const response = await axios.post(`${baseUrl}/api/clients`, payload, {
    headers: { Authorization: authHeader },
  });

  return response.data?.data || null;
};

const fetchOpenOpportunity = async (req, clientId) => {
  if (!clientId) return null;
  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;
  const response = await axios.get(`${baseUrl}/api/opportunites`, {
    params: {
      clientId,
      statut: 'OUVERTE',
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    headers: { Authorization: authHeader },
  });
  const items = response.data?.data || [];
  if (items.length !== 1) return null;
  return items[0];
};

const closeOpportunityAsWon = async (req, opportuniteId, montantFinal) => {
  if (!opportuniteId) return null;
  const baseUrl = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;
  const response = await axios.patch(
    `${baseUrl}/api/opportunites/${opportuniteId}/close`,
    {
      statut: 'GAGNEE',
      montantFinal,
    },
    { headers: { Authorization: authHeader } }
  );
  return response.data?.data || null;
};

const sendCommercialNotification = async (req, devis, clientLabel) => {
  const recipientId = devis.commercialId || req.user?.id;
  if (!recipientId) return;

  const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4012';
  const montant = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(devis.montantTTC || 0);
  await axios.post(`${baseUrl}/api/notifications/send`, {
    userId: recipientId,
    type: 'COMMERCIAL',
    title: `Devis ${devis.numeroDevis} signe`,
    message: `Le devis ${devis.numeroDevis} (${clientLabel || 'client'}) est valide. Montant TTC: ${montant} F CFA.`,
    email: devis.commercialEmail || undefined,
  });
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const createProjectForQuote = async (req, devis, clientId) => {
  if (!clientId || !devis?.id) return null;

  const existingEvent = await prisma.devisEvent.findFirst({
    where: { devisId: devis.id, type: 'PROJECT_CREATED' },
    orderBy: { createdAt: 'desc' },
  });
  if (existingEvent?.payload?.projectId) return existingEvent.payload.projectId;

  const baseUrl = process.env.PROJECTS_SERVICE_URL || 'http://project-service:4006';
  const authHeader = buildServiceAuthHeader(req);
  if (!authHeader) return null;

  const startDate = new Date();
  const validDate = devis.dateValidite ? new Date(devis.dateValidite) : null;
  const deliveryDate =
    validDate && validDate > startDate ? validDate : addDays(startDate, 30);
  const closingDate = addDays(deliveryDate, 7);

  const projectPayload = {
    nom: `${devis.objet || 'Projet'} - ${devis.numeroDevis}`,
    clientId,
    dateDebut: startDate.toISOString(),
    dateFin: closingDate.toISOString(),
    budget: devis.montantTTC || 0,
    status: 'PLANIFIE',
    priorite: 'MOYENNE',
  };

  const projectResp = await axios.post(`${baseUrl}/api/projets`, projectPayload, {
    headers: { Authorization: authHeader },
  });

  const project = projectResp.data?.data || null;
  if (!project?.id) return null;

  const milestones = [
    { nom: 'Demarrage', dateEcheance: startDate },
    { nom: 'Livraison', dateEcheance: deliveryDate },
    { nom: 'Cloture', dateEcheance: closingDate },
  ];

  await Promise.all(
    milestones.map((milestone) =>
      axios.post(
        `${baseUrl}/api/jalons`,
        {
          projetId: project.id,
          nom: milestone.nom,
          dateEcheance: milestone.dateEcheance.toISOString(),
          status: 'PLANIFIE',
        },
        { headers: { Authorization: authHeader } }
      )
    )
  );

  return project.id;
};

const runQuoteSignedWorkflow = async (req, devis) => {
  if (!devis) return;

  let currentClientId = devis.clientId;
  let clientLabel = devis.clientId || null;

  try {
    if (devis.prospectId) {
      const prospect = await fetchProspect(req, devis.prospectId);
      if (prospect) {
        clientLabel = prospect.companyName || prospect.contactName || clientLabel;
        const createdClient = await createClientFromProspect(req, prospect, devis);
        if (createdClient?.id) {
          currentClientId = createdClient.id;
          await prisma.devis.update({
            where: { id: devis.id },
            data: { clientId: createdClient.id },
          });
          await createContactFromProspect(req, createdClient.id, prospect);
        }
      }
    }

    let opportuniteId = devis.opportuniteId;
    if (!opportuniteId && currentClientId) {
      const openOpp = await fetchOpenOpportunity(req, currentClientId);
      opportuniteId = openOpp?.id || null;
    }

    if (opportuniteId) {
      await closeOpportunityAsWon(req, opportuniteId, devis.montantTTC);
    }

    let projectId = null;
    if (currentClientId) {
      try {
        projectId = await createProjectForQuote(req, devis, currentClientId);
        if (projectId) {
          await createQuoteEvent(prisma, devis.id, 'PROJECT_CREATED', req, 'Projet cree apres devis signe', {
            projectId,
            clientId: currentClientId,
          });
        }
      } catch (error) {
        await createQuoteEvent(prisma, devis.id, 'PROJECT_CREATE_FAILED', req, 'Echec creation projet', {
          error: error?.message || 'unknown',
        });
      }
    }

    await sendCommercialNotification(req, devis, clientLabel);

    await createQuoteEvent(prisma, devis.id, 'SIGNED_WORKFLOW', req, 'Workflow devis signe execute', {
      opportuniteId: opportuniteId || null,
      clientId: currentClientId || null,
      projectId: projectId || null,
    });
  } catch (error) {
    await createQuoteEvent(prisma, devis.id, 'SIGNED_WORKFLOW_FAILED', req, 'Echec du workflow devis signe', {
      error: error?.message || 'unknown',
    });
  }
};

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

exports.getAllDevis = async (req, res) => {
  try {
    const { clientId, status, dateDebut, dateFin, search, limit, page, enterpriseId } = req.query;
    let where = {};

    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { numeroDevis: { contains: search, mode: 'insensitive' } },
        { objet: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { clientId: { contains: search, mode: 'insensitive' } },
        { enterpriseName: { contains: search, mode: 'insensitive' } },
        { serviceName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;
    where = await applyEnterpriseScope({
      req,
      where,
      requestedEnterpriseId: enterpriseId,
    });

    const [items, total] = await Promise.all([
      prisma.devis.findMany({
        where,
        include: { lignes: true },
        orderBy: { dateEmission: 'desc' },
        take,
        skip,
      }),
      prisma.devis.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.max(1, Math.ceil(total / take)),
        },
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getDevisById = async (req, res) => {
  try {
    const devis = await getScopedQuoteOrThrow(req, req.params.id);
    res.json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.createDevis = async (req, res) => {
  try {
    const clientId = normalizeText(req.body.clientId);
    const prospectId = normalizeText(req.body.prospectId);
    const lignesData = normalizeLines(req.body.lignes);

    if (!clientId && !prospectId) {
      return res.status(400).json({ error: 'clientId ou prospectId est requis' });
    }

    if (lignesData.length === 0) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne' });
    }

    const totaux = buildTotals(lignesData);

    const commercialId = normalizeText(req.body.commercialId) || normalizeText(req.user?.id) || null;
    const commercialName =
      normalizeText(req.body.commercialName) ||
      [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') ||
      null;
    const commercialEmail = normalizeText(req.body.commercialEmail) || normalizeText(req.user?.email) || null;
    const opportuniteId = normalizeText(req.body.opportuniteId);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);

    let resolvedClientId = clientId;
    let resolvedProspectId = prospectId;

    if (!resolvedClientId && resolvedProspectId) {
      const prospect = await fetchProspect(req, resolvedProspectId);
      if (!prospect) {
        return res.status(404).json({ error: 'Prospect introuvable' });
      }
      if (!prospect.email) {
        return res.status(400).json({ error: 'Un email est requis pour convertir le prospect en client' });
      }
      const createdClient = await createClientFromProspect(req, prospect, {
        prospectId: resolvedProspectId,
        commercialId,
      });
      if (!createdClient?.id) {
        return res.status(400).json({ error: 'Impossible de créer le client à partir du prospect' });
      }
      resolvedClientId = createdClient.id;
    }

    const devis = await prisma.$transaction(async (tx) => {
      const numeroDevis = await getNextDevisNumber(tx);

      const created = await tx.devis.create({
        data: {
          numeroDevis,
          clientId: resolvedClientId,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          objet: normalizeText(req.body.objet),
          notes: normalizeText(req.body.notes),
          dateValidite: getDefaultDate(req.body.dateValidite),
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
          serviceId: null,
          serviceName: null,
          serviceLogoUrl: null,
          commercialId,
          commercialName,
          commercialEmail,
          prospectId: resolvedProspectId,
          opportuniteId,
          lignes: {
            create: lignesData,
          },
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, created.id, 'CREATED', req, 'Devis client cree');
      return created;
    });

    res.status(201).json({ success: true, data: devis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (current.status === 'FACTURE') {
      return res.status(400).json({ error: 'Un devis facture ne peut plus etre modifie' });
    }

    const lignesData = req.body.lignes ? normalizeLines(req.body.lignes) : null;
    if (Array.isArray(req.body.lignes) && lignesData.length === 0) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne valide' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (lignesData) {
        await updateQuoteLines(tx, id, lignesData);
      }

      const totaux = lignesData ? buildTotals(lignesData) : buildTotals(current.lignes);
      const enterprise =
        req.body.enterpriseId !== undefined
          ? await resolveEnterpriseContext(req, req.body.enterpriseId)
          : {
              enterpriseId: current.enterpriseId || null,
              enterpriseName: current.enterpriseName || null,
            };
      const nextStatus =
        req.body.status && req.body.status !== current.status && current.status === 'ACCEPTE'
          ? current.status
          : req.body.status;

      const devis = await tx.devis.update({
        where: { id },
        data: {
          clientId: normalizeText(req.body.clientId) || current.clientId,
          objet: req.body.objet !== undefined ? normalizeText(req.body.objet) : undefined,
          notes: req.body.notes !== undefined ? normalizeText(req.body.notes) : undefined,
          dateValidite: req.body.dateValidite ? new Date(req.body.dateValidite) : undefined,
          status: nextStatus || undefined,
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          serviceLogoUrl: null,
          commercialId: normalizeText(req.body.commercialId) ?? undefined,
          commercialName: normalizeText(req.body.commercialName) ?? undefined,
          commercialEmail: normalizeText(req.body.commercialEmail) ?? undefined,
          prospectId: normalizeText(req.body.prospectId) ?? undefined,
          opportuniteId: normalizeText(req.body.opportuniteId) ?? undefined,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, id, 'UPDATED', req, 'Devis client modifie', {
        linesUpdated: Boolean(lignesData),
        status: devis.status,
      });

      return devis;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.deleteDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    if (['TRANSMIS_FACTURATION', 'FACTURE'].includes(devis.status)) {
      return res.status(400).json({ error: 'Impossible de supprimer un devis deja transmis ou facture' });
    }

    await prisma.devis.delete({ where: { id } });
    res.json({ success: true, message: 'Devis supprime avec succes' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, { select: { id: true, enterpriseId: true } });
    const ligneData = buildBillingLine(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.ligneDevis.create({
        data: {
          devisId: id,
          ...ligneData,
        },
      });

      const lignes = await tx.ligneDevis.findMany({ where: { devisId: id } });
      const totaux = calculateTotal(lignes);

      await tx.devis.update({
        where: { id },
        data: {
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
        },
      });

      await createQuoteEvent(tx, id, 'LINE_ADDED', req, 'Nouvelle ligne ajoutee au devis');
    });

    const devis = await getScopedQuoteOrThrow(req, id);
    res.status(201).json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.sendDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!current.lignes.length) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne avant envoi' });
    }

    const needsRevisionIncrement = ['ENVOYE', 'MODIFICATION_DEMANDEE', 'REFUSE'].includes(current.status);
    const clientAccessToken = current.clientAccessToken || crypto.randomBytes(24).toString('hex');

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'ENVOYE',
          sentAt: new Date(),
          clientAccessToken,
          clientAccessTokenExpiresAt: moment().add(90, 'days').toDate(),
          revisionNumber: needsRevisionIncrement ? current.revisionNumber + 1 : current.revisionNumber,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        needsRevisionIncrement ? 'RESENT_TO_CLIENT' : 'SENT_TO_CLIENT',
        req,
        req.body?.message || 'Devis envoye au client',
        { revisionNumber: updated.revisionNumber }
      );

      return updated;
    });

    const approvalUrl = buildApprovalUrl(req, clientAccessToken);
    const clientMeta = await fetchClientMeta(req, devis.clientId);
    let emailDelivery = {
      sent: false,
      clientEmail: clientMeta.clientEmail,
      clientName: clientMeta.clientName,
      reason: null,
      messageId: null,
    };

    if (!clientMeta.clientEmail) {
      emailDelivery.reason = 'Email client absent dans le CRM';
    } else {
      try {
        const emailPayload = {
          expediteurId: req.user?.email || String(req.user?.id || 'commercial'),
          destinataireId: clientMeta.clientEmail,
          sujet: `Devis ${devis.numeroDevis} - ${devis.objet || 'Proposition commerciale'}`,
          contenu: [
            `Bonjour${clientMeta.clientName ? ` ${clientMeta.clientName}` : ''},`,
            '',
            'Votre devis est disponible pour consultation et validation.',
            `Numero du devis : ${devis.numeroDevis}`,
            `Objet : ${devis.objet || '-'}`,
            `Montant TTC : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(devis.montantTTC || 0)} F CFA`,
            `Date de validite : ${moment(devis.dateValidite).format('DD/MM/YYYY')}`,
            '',
            `Lien de consultation : ${approvalUrl}`,
            '',
            req.body?.message ? `Message commercial : ${req.body.message}` : '',
            '',
            'Merci.',
          ]
            .filter(Boolean)
            .join('\n'),
          type: 'EMAIL',
        };

        const delivery = await sendQuoteEmail(req, emailPayload);
        emailDelivery = {
          sent: true,
          clientEmail: clientMeta.clientEmail,
          clientName: clientMeta.clientName,
          reason: null,
          messageId: delivery.messageId,
        };
      } catch (error) {
        emailDelivery.reason = error?.response?.data?.error || error.message || 'Envoi email impossible';
      }
    }

    res.json({
      success: true,
      message: 'Devis envoye au client',
      data: {
        ...devis,
        approvalUrl,
        emailDelivery,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.acceptDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!current.lignes.length) {
      return res.status(400).json({ error: 'Un devis doit contenir au moins une ligne avant validation' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'TRANSMIS_FACTURATION',
          acceptedAt: now,
          clientRespondedAt: now,
          clientComment: normalizeText(req.body?.comment),
          forwardedToBillingAt: now,
          forwardedToBillingBy: req.user?.email || req.user?.id || 'Validation client',
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_APPROVED',
        req,
        req.body?.comment || 'Devis valide par le client'
      );

      await createQuoteEvent(
        tx,
        id,
        'AUTO_FORWARDED_TO_BILLING',
        req,
        'Transmission automatique a la facturation apres validation client'
      );

      return updated;
    });

    await runQuoteSignedWorkflow(req, devis);

    res.json({
      success: true,
      message: 'Devis valide par le client et transmis automatiquement a la facturation.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.requestModificationDevis = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'MODIFICATION_DEMANDEE',
          clientRespondedAt: new Date(),
          clientComment: normalizeText(req.body?.comment),
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_REQUESTED_CHANGES',
        req,
        req.body?.comment || 'Le client demande des modifications'
      );

      return updated;
    });

    res.json({
      success: true,
      message: 'Le devis est revenu en modification demandee.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.refuseDevis = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'REFUSE',
          refusedAt: new Date(),
          clientRespondedAt: new Date(),
          clientComment: normalizeText(req.body?.raison || req.body?.comment),
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_REJECTED',
        req,
        req.body?.raison || req.body?.comment || 'Le client a refuse le devis'
      );

      return updated;
    });

    res.json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getDevisForClientResponse = async (req, res) => {
  try {
    const devis = await getQuoteByClientTokenOrThrow(req.params.token, {
      include: {
        lignes: true,
      },
    });

    res.json({
      success: true,
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.submitClientResponse = async (req, res) => {
  try {
    const current = await getQuoteByClientTokenOrThrow(req.params.token, {
      include: {
        lignes: true,
      },
    });

    const action = String(req.body?.action || '').toUpperCase();
    const comment = normalizeText(req.body?.comment);

    if (!['ACCEPT', 'REQUEST_MODIFICATION', 'REFUSE'].includes(action)) {
      return res.status(400).json({ error: 'Action client invalide' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (action === 'ACCEPT') {
        const updated = await tx.devis.update({
          where: { id: current.id },
          data: {
            status: 'TRANSMIS_FACTURATION',
            acceptedAt: now,
            clientRespondedAt: now,
            clientComment: comment,
            forwardedToBillingAt: now,
            forwardedToBillingBy: 'Validation client via lien public',
          },
          include: QUOTE_READ_INCLUDE,
        });

        await createQuoteEvent(tx, current.id, 'CLIENT_APPROVED', req, comment || 'Validation client via lien public');
        await createQuoteEvent(
          tx,
          current.id,
          'AUTO_FORWARDED_TO_BILLING',
          req,
          'Transmission automatique a la facturation apres validation client via lien public'
        );

        return updated;
      }

      if (action === 'REQUEST_MODIFICATION') {
        const updated = await tx.devis.update({
          where: { id: current.id },
          data: {
            status: 'MODIFICATION_DEMANDEE',
            clientRespondedAt: now,
            clientComment: comment,
          },
          include: QUOTE_READ_INCLUDE,
        });

        await createQuoteEvent(
          tx,
          current.id,
          'CLIENT_REQUESTED_CHANGES',
          req,
          comment || 'Modification demandee via lien public'
        );

        return updated;
      }

      const updated = await tx.devis.update({
        where: { id: current.id },
        data: {
          status: 'REFUSE',
          refusedAt: now,
          clientRespondedAt: now,
          clientComment: comment,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, current.id, 'CLIENT_REJECTED', req, comment || 'Refus via lien public');

      return updated;
    });

    if (action === 'ACCEPT') {
      await runQuoteSignedWorkflow(req, devis);
    }

    res.json({
      success: true,
      message:
        action === 'ACCEPT'
          ? 'Le devis a ete valide et transmis a la facturation.'
          : action === 'REQUEST_MODIFICATION'
            ? 'La demande de modification a ete enregistree.'
            : 'Le refus du devis a ete enregistre.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.forwardToBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    if (!BILLING_READY_STATUS.includes(current.status)) {
      return res.status(400).json({ error: 'Seul un devis valide client peut etre transmis a la facturation' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'TRANSMIS_FACTURATION',
          forwardedToBillingAt: new Date(),
          forwardedToBillingBy: req.user?.email || req.user?.id || null,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, id, 'FORWARDED_TO_BILLING', req, 'Devis transmis a la facturation');
      return updated;
    });

    res.json({
      success: true,
      message: 'Devis transmis a la facturation.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.convertToFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!BILLING_READY_STATUS.includes(devis.status)) {
      return res.status(400).json({ error: 'Le devis doit etre valide client puis transmis a la facturation' });
    }

    if (devis.convertedInvoiceId) {
      const existingInvoice = await prisma.facture.findUnique({
        where: { id: devis.convertedInvoiceId },
        include: { lignes: true, paiements: true },
      });

      return res.json({
        success: true,
        message: 'Ce devis a deja ete converti en facture.',
        data: existingInvoice,
      });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await createInvoiceFromQuote(tx, devis, {
        dateEcheance: req.body?.dateEcheance,
        notes: req.body?.notes,
      });

      await tx.devis.update({
        where: { id },
        data: {
          status: 'FACTURE',
          convertedInvoiceId: createdInvoice.id,
          convertedInvoiceNumber: createdInvoice.numeroFacture,
        },
      });

      await createQuoteEvent(tx, id, 'CONVERTED_TO_INVOICE', req, `Facture ${createdInvoice.numeroFacture} creee`, {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.numeroFacture,
      });

      return createdInvoice;
    });

    res.status(201).json({
      success: true,
      message: 'Devis transforme en facture.',
      data: invoice,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.uploadQuoteLineImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    if (!isS3Configured()) {
      return res.status(400).json({ error: 'Stockage S3 non configure' });
    }
    const url = await uploadToS3(req.file.buffer, req.file.mimetype, 'quote-lines');
    if (!url) {
      return res.status(500).json({ error: 'Upload impossible pour le moment' });
    }
    res.status(201).json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (devis.clientId) {
      const clientMeta = await fetchClientMeta(req, devis.clientId);
      devis.client = {
        nom: clientMeta.clientName || devis.client?.nom || devis.clientId,
        email: clientMeta.clientEmail || devis.client?.email || null,
      };
    } else if (devis.prospectId) {
      const prospect = await fetchProspect(req, devis.prospectId);
      if (prospect) {
        devis.client = {
          nom: prospect.companyName || prospect.contactName || devis.prospectId,
          email: prospect.email || null,
        };
      }
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${devis.numeroDevis}.pdf`);
    await generateDevisPDF(devis, outputPath);
    res.download(outputPath);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
