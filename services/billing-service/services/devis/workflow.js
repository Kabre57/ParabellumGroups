// Coordination des actions déclenchées lorsqu’un client signe un devis.
const { axios, jwt, prisma } = require('./core');
const { createQuoteEvent } = require('./persistence');

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
  }, { headers: { Authorization: buildServiceAuthHeader(req) } });
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

module.exports = { buildServiceAuthHeader, fetchProspect, fetchDefaultTypeClientId, findExistingClient, splitContactName, createContactFromProspect, createClientFromProspect, fetchOpenOpportunity, closeOpportunityAsWon, sendCommercialNotification, addDays, createProjectForQuote, runQuoteSignedWorkflow };
