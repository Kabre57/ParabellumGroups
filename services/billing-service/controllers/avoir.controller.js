const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generateAvoirNumber } = require('../utils/billingNumberGenerator');
const { generateAvoirPDF } = require('../utils/pdfGenerator');

const prisma = new PrismaClient();

const getNextAvoirNumber = async (tx = prisma) => {
  const currentYearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const lastAvoir = await tx.avoir.findFirst({
    where: {
      numeroAvoir: {
        startsWith: `AVR-${currentYearMonth}-`,
      },
    },
    orderBy: { numeroAvoir: 'desc' },
  });

  let sequence = 1;
  if (lastAvoir) {
    const lastSequence = parseInt(lastAvoir.numeroAvoir.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return generateAvoirNumber(sequence);
};

exports.getAllAvoirs = async (req, res) => {
  try {
    const { factureId, status } = req.query;
    const where = {};
    if (factureId) where.factureId = factureId;
    if (status) where.status = status;

    const avoirs = await prisma.avoir.findMany({
      where,
      include: {
        lignes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: avoirs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAvoirById = async (req, res) => {
  try {
    const avoir = await prisma.avoir.findUnique({
      where: { id: req.params.id },
      include: {
        lignes: true,
      },
    });

    if (!avoir) {
      return res.status(404).json({ error: 'Avoir introuvable' });
    }

    res.json({ success: true, data: avoir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAvoir = async (req, res) => {
  try {
    const factureId = String(req.body.factureId || '').trim();
    const motif = String(req.body.motif || '').trim();
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    if (!factureId) {
      return res.status(400).json({ error: 'factureId est requis' });
    }

    if (!motif) {
      return res.status(400).json({ error: 'Le motif de l’avoir est requis' });
    }

    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        lignes: true,
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture introuvable' });
    }

    const avoir = await prisma.$transaction(async (tx) => {
      const numeroAvoir = await getNextAvoirNumber(tx);
      return tx.avoir.create({
        data: {
          numeroAvoir,
          factureId: facture.id,
          factureNumero: facture.numeroFacture,
          clientId: facture.clientId,
          serviceId: facture.serviceId,
          serviceName: facture.serviceName,
          serviceLogoUrl: facture.serviceLogoUrl,
          motif,
          notes,
          montantHT: facture.montantHT,
          montantTVA: facture.montantTVA,
          montantTTC: facture.montantTTC,
          status: 'EMISE',
          lignes: {
            create: facture.lignes.map((ligne) => ({
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
        },
      });
    });

    res.status(201).json({
      success: true,
      message: `Avoir ${avoir.numeroAvoir} créé avec succès`,
      data: avoir,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const avoir = await prisma.avoir.findUnique({
      where: { id: req.params.id },
      include: {
        lignes: true,
      },
    });

    if (!avoir) {
      return res.status(404).json({ error: 'Avoir introuvable' });
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${avoir.numeroAvoir}.pdf`);
    await generateAvoirPDF(avoir, outputPath);
    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
