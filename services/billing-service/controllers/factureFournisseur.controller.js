const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { recordLiquidation } = require('../utils/accountingWorkflow');

exports.getAll = async (req, res) => {
  try {
    const factures = await prisma.factureFournisseur.findMany({
      include: {
        commitment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: factures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      numeroFacture,
      fournisseurId,
      fournisseurNom,
      dateFacture,
      dateEcheance,
      montantHT,
      montantTVA,
      montantTTC,
      commitmentId,
      notes,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const facture = await tx.factureFournisseur.create({
        data: {
          numeroFacture,
          fournisseurId,
          fournisseurNom,
          dateFacture: dateFacture ? new Date(dateFacture) : new Date(),
          dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
          montantHT,
          montantTVA,
          montantTTC,
          commitmentId,
          notes,
        },
      });

      if (commitmentId) {
        const commitment = await tx.purchaseCommitment.findUnique({
          where: { id: commitmentId },
        });

        if (commitment) {
          await recordLiquidation(tx, { commitment, invoice: facture, user: req.user });
        }
      }

      return facture;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation facture fournisseur:', error.message);
    res.status(500).json({ error: error.message });
  }
};
