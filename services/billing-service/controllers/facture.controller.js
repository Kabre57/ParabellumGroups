const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { generateFactureNumber } = require('../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../utils/tvaCalculator');
const { generateFacturePDF } = require('../utils/pdfGenerator');
const axios = require('axios');
const path = require('path');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../utils/enterpriseScope');

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildBillingLine = (ligne = {}) => {
  const description = String(
    ligne.description ||
      ligne.designation ||
      ligne.nom ||
      ligne.label ||
      ''
  ).trim();
  const imageUrl = ligne.imageUrl || ligne.image || ligne.image_url || null;
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

const ensureTempDir = () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!require('fs').existsSync(tempDir)) {
    require('fs').mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
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
  } catch (e) {
    console.warn('Meta service non recuperee', e?.response?.status || e.message);
    return {
      serviceName: null,
      serviceLogoUrl: null,
    };
  }
};

const fetchClientMeta = async (req, clientId) => {
  if (!clientId) {
    return { clientName: null, clientEmail: null };
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
  } catch (e) {
    console.warn('Meta client facture non recuperee', e?.response?.status || e.message);
    return { clientName: null, clientEmail: null };
  }
};

const sendInvoiceEmail = async (req, payload) => {
  const communicationBase = process.env.COMMUNICATION_SERVICE_URL || 'http://communication-service:4002';
  const createResp = await axios.post(`${communicationBase}/api/messages`, payload, {
    headers: { authorization: req.headers.authorization || '' },
  });

  const messageId = createResp.data?.id;
  if (!messageId) {
    throw new Error('Message email facture non cree');
  }

  await axios.post(
    `${communicationBase}/api/messages/${messageId}/send`,
    {},
    { headers: { authorization: req.headers.authorization || '' } }
  );

  return { messageId };
};

/**
 * Recupere toutes les factures avec filtres optionnels
 */
exports.getAllFactures = async (req, res) => {
  try {
    const { clientId, status, dateDebut, dateFin, search, query, enterpriseId } = req.query;

    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    const normalizedSearch = String(search || query || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { numeroFacture: { contains: normalizedSearch, mode: 'insensitive' } },
        { notes: { contains: normalizedSearch, mode: 'insensitive' } },
        { clientId: { contains: normalizedSearch, mode: 'insensitive' } },
        { enterpriseName: { contains: normalizedSearch, mode: 'insensitive' } },
        { serviceName: { contains: normalizedSearch, mode: 'insensitive' } },
      ];
    }
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const scopedWhere = await applyEnterpriseScope({
      req,
      where,
      requestedEnterpriseId: enterpriseId,
    });

    const factures = await prisma.facture.findMany({
      where: scopedWhere,
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
      orderBy: { dateEmission: 'desc' },
    });

    const facturesWithClientMeta = await Promise.all(
      factures.map(async (facture) => {
        const clientMeta = await fetchClientMeta(req, facture.clientId);
        return {
          ...facture,
          client: {
            nom: clientMeta.clientName,
            email: clientMeta.clientEmail,
          },
        };
      })
    );

    res.json(facturesWithClientMeta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere une facture par ID
 */
exports.getFactureById = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true,
        avoirs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const clientMeta = await fetchClientMeta(req, facture.clientId);

    res.json({
      ...facture,
      client: {
        nom: clientMeta.clientName,
        email: clientMeta.clientEmail,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cree une nouvelle facture
 */
exports.createFacture = async (req, res) => {
  try {
    const { clientId, notes } = req.body;
    const lignesData = normalizeLines(req.body.lignes);
    const totaux = buildTotals(lignesData);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);
    const numeroFacture = await getNextFactureNumber(prisma);

    const facture = await prisma.facture.create({
      data: {
        numeroFacture,
        clientId,
        enterpriseId: enterprise.enterpriseId,
        enterpriseName: enterprise.enterpriseName,
        dateEcheance: getDefaultDate(req.body.dateEcheance, 30),
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
        notes,
        serviceId: null,
        serviceName: null,
        serviceLogoUrl: null,
        lignes: lignesData.length
          ? {
              create: lignesData,
            }
          : undefined,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Met a jour une facture
 */
exports.updateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, dateEcheance, status, notes } = req.body;
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!existingFacture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, existingFacture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const enterprise =
      req.body.enterpriseId !== undefined
        ? await resolveEnterpriseContext(req, req.body.enterpriseId)
        : {
            enterpriseId: existingFacture.enterpriseId || null,
            enterpriseName: undefined,
          };

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        clientId,
        enterpriseId: enterprise.enterpriseId,
        ...(enterprise.enterpriseName !== undefined ? { enterpriseName: enterprise.enterpriseName } : {}),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
        status,
        notes,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprime une facture
 */
exports.deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!existingFacture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, existingFacture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    await prisma.facture.delete({
      where: { id },
    });

    res.json({ message: 'Facture supprimee avec succes' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute une ligne a une facture
 */
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const ligneData = buildBillingLine(req.body);
    const factureBeforeUpdate = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!factureBeforeUpdate) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, factureBeforeUpdate.enterpriseId, "Vous n'avez pas acces a cette facture.");

    await prisma.ligneFacture.create({
      data: {
        factureId: id,
        ...ligneData,
      },
    });

    const lignes = await prisma.ligneFacture.findMany({
      where: { factureId: id },
    });

    const totaux = calculateTotal(lignes);

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Envoie une facture (change le statut a EMISE)
 */
exports.sendFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!existingFacture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, existingFacture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        status: 'EMISE',
      },
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
    });
    const clientMeta = await fetchClientMeta(req, facture.clientId);
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
        const delivery = await sendInvoiceEmail(req, {
          expediteurId: req.user?.email || String(req.user?.id || 'facturation'),
          destinataireId: clientMeta.clientEmail,
          sujet: `Facture ${facture.numeroFacture}`,
          contenu: [
            `Bonjour${clientMeta.clientName ? ` ${clientMeta.clientName}` : ''},`,
            '',
            `Votre facture ${facture.numeroFacture} est maintenant disponible.`,
            `Montant TTC : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(facture.montantTTC || 0)} F CFA`,
            `Date d'échéance : ${moment(facture.dateEcheance).format('DD/MM/YYYY')}`,
            '',
            req.body?.message ? `Message : ${req.body.message}` : '',
            '',
            'Merci.',
          ]
            .filter(Boolean)
            .join('\n'),
          type: 'EMAIL',
        });

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

    res.json({ success: true, data: facture, emailDelivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere les statistiques de facturation
 */
exports.getStats = async (req, res) => {
  try {
    const { dateDebut, dateFin, enterpriseId } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const factures = await prisma.facture.findMany({
      where: await applyEnterpriseScope({
        req,
        where,
        requestedEnterpriseId: enterpriseId,
      }),
    });

    const chiffreAffaires = factures
      .filter((f) => !['ANNULEE'].includes(f.status))
      .reduce((sum, f) => sum + f.montantTTC, 0);
    const montantEnAttente = factures
      .filter((f) => ['BROUILLON', 'EMISE', 'EN_RETARD', 'PARTIELLEMENT_PAYEE'].includes(f.status))
      .reduce((sum, f) => sum + f.montantTTC, 0);
    const montantEnRetard = factures
      .filter((f) => f.status === 'EN_RETARD')
      .reduce((sum, f) => sum + f.montantTTC, 0);

    res.json({
      success: true,
      data: {
        totalFactures: factures.length,
        chiffreAffaires,
        montantEnAttente,
        montantEnRetard,
        facturesPayees: factures.filter((f) => f.status === 'PAYEE').length,
        facturesEnRetard: factures.filter((f) => f.status === 'EN_RETARD').length,
        brouillon: factures.filter((f) => f.status === 'BROUILLON').length,
        emises: factures.filter((f) => f.status === 'EMISE').length,
        annulees: factures.filter((f) => f.status === 'ANNULEE').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere les factures en retard
 */
exports.getRetards = async (req, res) => {
  try {
    const today = new Date();
    const scopedWhere = await applyEnterpriseScope({
      req,
      where: {
        status: { in: ['EMISE', 'EN_RETARD'] },
        dateEcheance: {
          lt: today,
        },
      },
    });

    const factures = await prisma.facture.findMany({
      where: scopedWhere,
      include: {
        lignes: true,
        paiements: true,
      },
      orderBy: { dateEcheance: 'asc' },
    });

    for (const facture of factures) {
      if (facture.status === 'EMISE') {
        await prisma.facture.update({
          where: { id: facture.id },
          data: { status: 'EN_RETARD' },
        });
      }
    }

    res.json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genere le PDF d'une facture
 */
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const tempDir = ensureTempDir();
    const clientMeta = await fetchClientMeta(req, facture.clientId);
    const outputPath = path.join(tempDir, `${facture.numeroFacture}.pdf`);
    const payload = {
      ...facture,
      client: {
        nom: clientMeta.clientName,
        email: clientMeta.clientEmail,
      },
    };
    await generateFacturePDF(payload, outputPath);

    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
