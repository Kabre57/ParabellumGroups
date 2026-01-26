const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { generateDevisNumber, generateFactureNumber } = require('../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../utils/tvaCalculator');
const { generateDevisPDF } = require('../utils/pdfGenerator');
const path = require('path');

/**
 * Récupère tous les devis avec filtres optionnels
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
        lignes: true
      },
      orderBy: { dateEmission: 'desc' }
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère un devis par ID
 */
exports.getDevisById = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: true
      }
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crée un nouveau devis
 */
exports.createDevis = async (req, res) => {
  try {
    const { clientId, dateValidite } = req.body;

    // Générer le numéro de devis
    const currentYearMonth = moment().format('YYYYMM');
    const lastDevis = await prisma.devis.findFirst({
      where: {
        numeroDevis: {
          startsWith: `DEV-${currentYearMonth}-`
        }
      },
      orderBy: { numeroDevis: 'desc' }
    });

    let sequence = 1;
    if (lastDevis) {
      const lastSequence = parseInt(lastDevis.numeroDevis.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const numeroDevis = generateDevisNumber(sequence);

    const devis = await prisma.devis.create({
      data: {
        numeroDevis,
        clientId,
        dateValidite: new Date(dateValidite),
        montantHT: 0,
        montantTVA: 0,
        montantTTC: 0
      },
      include: {
        lignes: true
      }
    });

    res.status(201).json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Met à jour un devis
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
        status
      },
      include: {
        lignes: true
      }
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
      where: { id }
    });

    res.json({ message: 'Devis supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute une ligne à un devis
 */
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, quantite, prixUnitaire, tauxTVA } = req.body;

    // Calculer les montants
    const montants = calculateMontants(quantite, prixUnitaire, tauxTVA);

    // Ajouter la ligne
    const ligne = await prisma.ligneDevis.create({
      data: {
        devisId: id,
        description,
        quantite,
        prixUnitaire,
        tauxTVA,
        ...montants
      }
    });

    // Recalculer les totaux du devis
    const lignes = await prisma.ligneDevis.findMany({
      where: { devisId: id }
    });

    const totaux = calculateTotal(lignes);

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC
      },
      include: {
        lignes: true
      }
    });

    res.status(201).json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Accepte un devis
 */
exports.acceptDevis = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        status: 'ACCEPTE'
      },
      include: {
        lignes: true
      }
    });

    res.json(devis);
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
        status: 'REFUSE'
      },
      include: {
        lignes: true
      }
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Convertit un devis en facture
 */
exports.convertToFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateEcheance, notes } = req.body;

    // Récupérer le devis avec ses lignes
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: { lignes: true }
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (devis.status !== 'ACCEPTE') {
      return res.status(400).json({ error: 'Seul un devis accepté peut être converti en facture' });
    }

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

    // Créer la facture
    const facture = await prisma.facture.create({
      data: {
        numeroFacture,
        clientId: devis.clientId,
        dateEcheance: new Date(dateEcheance),
        montantHT: devis.montantHT,
        montantTVA: devis.montantTVA,
        montantTTC: devis.montantTTC,
        notes: notes || `Convertie du devis ${devis.numeroDevis}`,
        lignes: {
          create: devis.lignes.map(ligne => ({
            description: ligne.description,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tauxTVA: ligne.tauxTVA,
            montantHT: ligne.montantHT,
            montantTVA: ligne.montantTVA,
            montantTTC: ligne.montantTTC
          }))
        }
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
 * Envoie un devis (change le statut à ENVOYE)
 */
exports.sendDevis = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        status: 'ENVOYE'
      },
      include: {
        lignes: true
      }
    });

    res.json(devis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Génère le PDF d'un devis
 */
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: true
      }
    });

    if (!devis) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${devis.numeroDevis}.pdf`);
    await generateDevisPDF(devis, outputPath);

    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
