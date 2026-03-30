const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const paymentMethodMap = {
  VIREMENT: 'VIREMENT',
  VIREMENT_BANCAIRE: 'VIREMENT',
  CHEQUE: 'CHEQUE',
  ESPECES: 'ESPECES',
  CARTE: 'CARTE',
  PRELEVEMENT: 'PRELEVEMENT',
};

const normalizeMethod = (value) => paymentMethodMap[String(value || '').toUpperCase()] || null;

const serializePaiement = (paiement) => ({
  id: paiement.id,
  factureId: paiement.factureId,
  montant: Number(paiement.montant || 0),
  datePaiement: paiement.datePaiement,
  modePaiement: paiement.methodePaiement,
  methodePaiement: paiement.methodePaiement,
  reference: paiement.reference || null,
  notes: paiement.notes || null,
  facture: paiement.facture || undefined,
  createdAt: paiement.createdAt,
  updatedAt: paiement.updatedAt,
});

/**
 * Crée un nouveau paiement
 */
exports.createPaiement = async (req, res) => {
  try {
    const { factureId, montant, datePaiement, methodePaiement, modePaiement, reference, notes } = req.body;
    const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);

    if (!factureId || !normalizedMethod || !Number.isFinite(Number(montant))) {
      return res.status(400).json({ error: 'factureId, montant et methode de paiement sont requis' });
    }

    // Vérifier que la facture existe
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: { paiements: true }
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const totalPaye = facture.paiements.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const montantNumerique = Number(montant);
    const restant = Math.max(Number(facture.montantTTC || 0) - totalPaye, 0);

    if (montantNumerique > restant) {
      return res.status(400).json({
        error: 'Le montant du paiement dépasse le reste à payer de la facture.',
      });
    }

    // Créer le paiement
    const paiement = await prisma.paiement.create({
      data: {
        factureId,
        montant: montantNumerique,
        datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
        methodePaiement: normalizedMethod,
        reference,
        notes
      }
    });

    // Calculer le total des paiements
    const totalPaiements = totalPaye + montantNumerique;

    // Mettre à jour le statut de la facture si totalement payée
    const newStatus = totalPaiements >= facture.montantTTC
      ? 'PAYEE'
      : totalPaiements > 0
        ? 'PARTIELLEMENT_PAYEE'
        : facture.status;

    if (newStatus !== facture.status) {
      await prisma.facture.update({
        where: { id: factureId },
        data: { status: newStatus }
      });
    }

    res.status(201).json({ success: true, data: serializePaiement(paiement) });
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

    res.json({ success: true, data: paiements.map(serializePaiement) });
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

    res.json({ success: true, data: { total } });
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
        data: { status: totalPaiements > 0 ? 'PARTIELLEMENT_PAYEE' : 'EMISE' }
      });
    }

    res.json({ success: true, message: 'Paiement supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère tous les paiements avec filtres
 */
exports.getAllPaiements = async (req, res) => {
  try {
    const { dateDebut, dateFin, methodePaiement, modePaiement, factureId } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.datePaiement = {};
      if (dateDebut) where.datePaiement.gte = new Date(dateDebut);
      if (dateFin) where.datePaiement.lte = new Date(dateFin);
    }
    if (factureId) where.factureId = factureId;
    if (methodePaiement || modePaiement) {
      const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);
      if (normalizedMethod) where.methodePaiement = normalizedMethod;
    }

    const paiements = await prisma.paiement.findMany({
      where,
      include: {
        facture: true
      },
      orderBy: { datePaiement: 'desc' }
    });

    res.json({ success: true, data: paiements.map(serializePaiement) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
