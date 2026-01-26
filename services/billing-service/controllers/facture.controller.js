const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { generateFactureNumber } = require('../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../utils/tvaCalculator');
const { generateFacturePDF } = require('../utils/pdfGenerator');
const path = require('path');

/**
 * Récupère toutes les factures avec filtres optionnels
 */
exports.getAllFactures = async (req, res) => {
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

    const factures = await prisma.facture.findMany({
      where,
      include: {
        lignes: true,
        paiements: true
      },
      orderBy: { dateEmission: 'desc' }
    });

    res.json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère une facture par ID
 */
exports.getFactureById = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true
      }
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    res.json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crée une nouvelle facture
 */
exports.createFacture = async (req, res) => {
  try {
    const { clientId, dateEcheance, notes } = req.body;

    // Générer le numéro de facture
    const currentYearMonth = moment().format('YYYYMM');
    const lastFacture = await prisma.facture.findFirst({
      where: {
        numeroFacture: {
          startsWith: `FAC-${currentYearMonth}-`
        }
      },
      orderBy: { numeroFacture: 'desc' }
    });

    let sequence = 1;
    if (lastFacture) {
      const lastSequence = parseInt(lastFacture.numeroFacture.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const numeroFacture = generateFactureNumber(sequence);

    const facture = await prisma.facture.create({
      data: {
        numeroFacture,
        clientId,
        dateEcheance: new Date(dateEcheance),
        montantHT: 0,
        montantTVA: 0,
        montantTTC: 0,
        notes
      },
      include: {
        lignes: true,
        paiements: true
      }
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Met à jour une facture
 */
exports.updateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, dateEcheance, status, notes } = req.body;

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        clientId,
        dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
        status,
        notes
      },
      include: {
        lignes: true,
        paiements: true
      }
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

    await prisma.facture.delete({
      where: { id }
    });

    res.json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute une ligne à une facture
 */
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, quantite, prixUnitaire, tauxTVA } = req.body;

    // Calculer les montants
    const montants = calculateMontants(quantite, prixUnitaire, tauxTVA);

    // Ajouter la ligne
    const ligne = await prisma.ligneFacture.create({
      data: {
        factureId: id,
        description,
        quantite,
        prixUnitaire,
        tauxTVA,
        ...montants
      }
    });

    // Recalculer les totaux de la facture
    const lignes = await prisma.ligneFacture.findMany({
      where: { factureId: id }
    });

    const totaux = calculateTotal(lignes);

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC
      },
      include: {
        lignes: true,
        paiements: true
      }
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Envoie une facture (change le statut à EMISE)
 */
exports.sendFacture = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        status: 'EMISE'
      },
      include: {
        lignes: true,
        paiements: true
      }
    });

    res.json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère les statistiques de facturation
 */
exports.getStats = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const factures = await prisma.facture.findMany({ where });

    const stats = {
      total: factures.length,
      brouillon: factures.filter(f => f.status === 'BROUILLON').length,
      emises: factures.filter(f => f.status === 'EMISE').length,
      payees: factures.filter(f => f.status === 'PAYEE').length,
      enRetard: factures.filter(f => f.status === 'EN_RETARD').length,
      annulees: factures.filter(f => f.status === 'ANNULEE').length,
      montantTotalHT: factures.reduce((sum, f) => sum + f.montantHT, 0),
      montantTotalTTC: factures.reduce((sum, f) => sum + f.montantTTC, 0),
      montantPayé: factures.filter(f => f.status === 'PAYEE').reduce((sum, f) => sum + f.montantTTC, 0),
      montantEnAttente: factures.filter(f => f.status === 'EMISE' || f.status === 'EN_RETARD').reduce((sum, f) => sum + f.montantTTC, 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère les factures en retard
 */
exports.getRetards = async (req, res) => {
  try {
    const today = new Date();

    const factures = await prisma.facture.findMany({
      where: {
        status: { in: ['EMISE', 'EN_RETARD'] },
        dateEcheance: {
          lt: today
        }
      },
      include: {
        lignes: true,
        paiements: true
      },
      orderBy: { dateEcheance: 'asc' }
    });

    // Mettre à jour le statut en EN_RETARD si nécessaire
    for (const facture of factures) {
      if (facture.status === 'EMISE') {
        await prisma.facture.update({
          where: { id: facture.id },
          data: { status: 'EN_RETARD' }
        });
      }
    }

    res.json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Génère le PDF d'une facture
 */
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true
      }
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${facture.numeroFacture}.pdf`);
    await generateFacturePDF(facture, outputPath);

    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
