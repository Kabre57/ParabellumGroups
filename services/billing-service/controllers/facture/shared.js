// Outils communs aux lectures, mises à jour et envois de factures.
const { PrismaClient } = require('@prisma/client');
const moment = require('moment');
const { generateFactureNumber } = require('../../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../../utils/tvaCalculator');
const { generateFacturePDF } = require('../../utils/pdfGenerator');
const axios = require('axios');
const path = require('path');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../../utils/enterpriseScope');

const prisma = new PrismaClient();

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
    return { clientName: null, clientEmail: null, clientPhone: null };
  }

  try {
    const customerBase = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
    const resp = await axios.get(`${customerBase}/api/clients/${clientId}`, {
      headers: { authorization: req.headers.authorization || '' },
    });
    return {
      clientName: resp.data?.data?.nom || null,
      clientEmail: resp.data?.data?.email || null,
      clientPhone: resp.data?.data?.telephone || resp.data?.data?.phone || null,
    };
  } catch (e) {
    console.warn('Meta client facture non recuperee', e?.response?.status || e.message);
    return { clientName: null, clientEmail: null, clientPhone: null };
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

module.exports = {
  amount: normalizeNumber,
  applyEnterpriseScope,
  assertEnterpriseInScope,
  axios,
  buildBillingLine,
  buildTotals,
  calculateMontants,
  calculateTotal,
  ensureTempDir,
  fetchClientMeta,
  fetchServiceMeta,
  generateFactureNumber,
  generateFacturePDF,
  getDefaultDate,
  getNextFactureNumber,
  moment,
  normalizeLines,
  normalizeNumber,
  path,
  prisma,
  resolveEnterpriseContext,
  sendInvoiceEmail,
};
