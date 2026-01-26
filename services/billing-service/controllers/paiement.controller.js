const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Crée un nouveau paiement
 */
exports.createPaiement = async (req, res) => {
  try {
    const { factureId, montant, datePaiement, methodePaiement, reference, notes } = req.body;

    // Vérifier que la facture existe
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: { paiements: true }
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Créer le paiement
    const paiement = await prisma.paiement.create({
      data: {
        factureId,
        montant,
        datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
        methodePaiement,
        reference,
        notes
      }
    });

    // Calculer le total des paiements
    const totalPaiements = facture.paiements.reduce((sum, p) => sum + p.montant, 0) + montant;

    // Mettre à jour le statut de la facture si totalement payée
    if (totalPaiements >= facture.montantTTC) {
      await prisma.facture.update({
        where: { id: factureId },
        data: { status: 'PAYEE' }
      });
    }

    res.status(201).json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère tous les paiements d'une facture
 */
exports.getByFacture = async (req, res) => {
  try {
    const { factureId } = req.params;

    const paiements = await prisma.paiement.findMany({
      where: { factureId },
      orderBy: { datePaiement: 'desc' }
    });

    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère le total des paiements d'une facture
 */
exports.getTotal = async (req, res) => {
  try {
    const { factureId } = req.params;

    const paiements = await prisma.paiement.findMany({
      where: { factureId }
    });

    const total = paiements.reduce((sum, p) => sum + p.montant, 0);

    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprime un paiement
 */
exports.deletePaiement = async (req, res) => {
  try {
    const { id } = req.params;

    const paiement = await prisma.paiement.findUnique({
      where: { id }
    });

    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    await prisma.paiement.delete({
      where: { id }
    });

    // Recalculer le statut de la facture
    const facture = await prisma.facture.findUnique({
      where: { id: paiement.factureId },
      include: { paiements: true }
    });

    const totalPaiements = facture.paiements.reduce((sum, p) => sum + p.montant, 0);

    if (totalPaiements < facture.montantTTC && facture.status === 'PAYEE') {
      await prisma.facture.update({
        where: { id: paiement.factureId },
        data: { status: 'EMISE' }
      });
    }

    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère tous les paiements avec filtres
 */
exports.getAllPaiements = async (req, res) => {
  try {
    const { dateDebut, dateFin, methodePaiement } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.datePaiement = {};
      if (dateDebut) where.datePaiement.gte = new Date(dateDebut);
      if (dateFin) where.datePaiement.lte = new Date(dateFin);
    }
    if (methodePaiement) where.methodePaiement = methodePaiement;

    const paiements = await prisma.paiement.findMany({
      where,
      include: {
        facture: true
      },
      orderBy: { datePaiement: 'desc' }
    });

    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
