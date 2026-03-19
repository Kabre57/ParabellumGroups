const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { generateDevisNumber, generateFactureNumber } = require('../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../utils/tvaCalculator');
const { generateDevisPDF } = require('../utils/pdfGenerator');
const axios = require('axios');
const path = require('path');

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
  } catch (e) {
    console.warn('Meta service non recuperee', e?.response?.status || e.message);
    return {
      serviceName: null,
      serviceLogoUrl: null,
    };
  }
};

const createInvoiceFromQuote = async (tx, devis, options = {}) => {
  const numeroFacture = await getNextFactureNumber(tx);
  const dateEcheance = getDefaultDate(options.dateEcheance || devis.dateValidite, 30);
  const approvalSuffix = options.approvedServiceName
    ? ` - approuve au nom du service ${options.approvedServiceName}`
    : options.approvedBy
    ? ` - approuve par ${options.approvedBy}`
    : '';

  return tx.facture.create({
    data: {
      numeroFacture,
      clientId: devis.clientId,
      dateEcheance,
      montantHT: devis.montantHT,
      montantTVA: devis.montantTVA,
      montantTTC: devis.montantTTC,
      notes:
        options.notes ||
        `Convertie du devis ${devis.numeroDevis}${approvalSuffix}`,
      serviceId: devis.serviceId,
      serviceName: devis.serviceName,
      serviceLogoUrl: devis.serviceLogoUrl,
      lignes: {
        create: devis.lignes.map((ligne) => ({
          description: ligne.description,
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
};

/**
 * Recupere tous les devis avec filtres optionnels
 */
exports.getAllDevis = async (req, res) => {
  try {
    const { clientId, status, dateDebut, dateFin } = req.query;

    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const devis = await prisma.devis.findMany({
      where,
      include: {
        lignes: true,
      },
      orderBy: { dateEmission: 'desc' },
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere un devis par ID
 */
exports.getDevisById = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: true,
      },
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouve' });
    }

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cree un nouveau devis
 */
exports.createDevis = async (req, res) => {
  try {
    const { clientId } = req.body;
    const lignesData = normalizeLines(req.body.lignes);
    const totaux = buildTotals(lignesData);
    const serviceId = req.user?.serviceId || null;
    const serviceMeta = await fetchServiceMeta(req, serviceId);
    const numeroDevis = await getNextDevisNumber(prisma);

    const devis = await prisma.devis.create({
      data: {
        numeroDevis,
        clientId,
        dateValidite: getDefaultDate(req.body.dateValidite),
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
        serviceId,
        serviceName: serviceMeta.serviceName,
        serviceLogoUrl: serviceMeta.serviceLogoUrl,
        lignes: lignesData.length
          ? {
              create: lignesData,
            }
          : undefined,
      },
      include: {
        lignes: true,
      },
    });

    res.status(201).json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Met a jour un devis
 */
exports.updateDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, dateValidite, status } = req.body;

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        clientId,
        dateValidite: dateValidite ? new Date(dateValidite) : undefined,
        status,
      },
      include: {
        lignes: true,
      },
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprime un devis
 */
exports.deleteDevis = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.devis.delete({
      where: { id },
    });

    res.json({ message: 'Devis supprime avec succes' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute une ligne a un devis
 */
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const ligneData = buildBillingLine(req.body);

    await prisma.ligneDevis.create({
      data: {
        devisId: id,
        ...ligneData,
      },
    });

    const lignes = await prisma.ligneDevis.findMany({
      where: { devisId: id },
    });

    const totaux = calculateTotal(lignes);

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
      },
      include: {
        lignes: true,
      },
    });

    res.status(201).json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Approuve un devis et le transforme en facture
 */
exports.acceptDevis = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: { lignes: true },
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouve' });
    }

    if (!Array.isArray(devis.lignes) || devis.lignes.length === 0) {
      return res.status(400).json({ error: 'Un devis doit contenir au moins une ligne avant approbation' });
    }

    const approverLabel = req.user?.email || req.user?.id || req.user?.userId || null;
    const approvedServiceName = devis.serviceName || null;

    const facture = await prisma.$transaction(async (tx) => {
      const approvedQuote = await tx.devis.update({
        where: { id },
        data: {
          status: 'ACCEPTE',
        },
        include: {
          lignes: true,
        },
      });

      const createdInvoice = await createInvoiceFromQuote(tx, approvedQuote, {
        dateEcheance: req.body?.dateEcheance,
        notes: req.body?.notes,
        approvedBy: approverLabel,
        approvedServiceName,
      });

      await tx.devis.delete({
        where: { id },
      });

      return createdInvoice;
    });

    res.json({
      success: true,
      message: 'Devis approuve et transforme en facture',
      data: {
        quoteId: id,
        invoice: facture,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Refuse un devis
 */
exports.refuseDevis = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        status: 'REFUSE',
      },
      include: {
        lignes: true,
      },
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Convertit un devis accepte en facture
 */
exports.convertToFacture = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: { lignes: true },
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouve' });
    }

    if (devis.status !== 'ACCEPTE') {
      return res.status(400).json({ error: 'Seul un devis accepte peut etre converti en facture' });
    }

    const facture = await prisma.$transaction(async (tx) => {
      const createdInvoice = await createInvoiceFromQuote(tx, devis, {
        dateEcheance: req.body?.dateEcheance,
        notes: req.body?.notes,
      });

      await tx.devis.delete({
        where: { id },
      });

      return createdInvoice;
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Envoie un devis (change le statut a ENVOYE)
 */
exports.sendDevis = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        status: 'ENVOYE',
      },
      include: {
        lignes: true,
      },
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genere le PDF d'un devis
 */
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: true,
      },
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouve' });
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${devis.numeroDevis}.pdf`);
    await generateDevisPDF(devis, outputPath);

    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
