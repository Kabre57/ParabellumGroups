// Modification, transition de statut et suppression des commandes.
const { prisma, validationResult, generateBonCommandeNumber, serializeOrder, fetchServiceMeta, enqueueProcurementEvent, getCorrelationId, withEnterpriseContext, purchaseOrderCreatedPayload, purchaseOrderStatusChangedPayload, buildLignePayload } = require('./shared');

exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { fournisseurId, dateLivraison, montantTotal, amount, status } = req.body;

    const data = {};

    if (fournisseurId !== undefined) {
      data.fournisseurId = fournisseurId || null;
    }

    if (dateLivraison !== undefined) {
      data.dateLivraison = dateLivraison ? new Date(dateLivraison) : null;
    }

    if (montantTotal !== undefined || amount !== undefined) {
      data.montantTotal = montantTotal ?? amount;
    }

    if (status !== undefined) {
      data.status = status;
    }

    const bon = await prisma.bonCommande.update({
      where: { id },
      data,
      include: {
        fournisseur: true,
        proforma: {
          select: {
            id: true,
            numeroProforma: true,
          },
        },
        demandeAchat: true,
        lignes: true
      }
    });

    res.json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error updating bon commande:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du bon de commande' });
  }
};

// Add ligne to bon commande

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body;

    const validStatuses = ['BROUILLON', 'ENVOYE', 'CONFIRME', 'LIVRE', 'ANNULE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status invalide' });
    }

    const existing = await prisma.bonCommande.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    const bon = await prisma.$transaction(async (tx) => {
      const updated = await tx.bonCommande.update({
        where: { id },
        data: { status },
        include: {
          fournisseur: true,
          demandeAchat: true,
          lignes: true
        }
      });

      if (existing.status !== status) {
        const resolvedAction =
          action ||
          (status === 'BROUILLON' || status === 'ENVOYE' || status === 'ANNULE'
            ? 'revert'
            : 'validate');

        await tx.bonCommandeValidationLog.create({
          data: {
            bonCommandeId: id,
            action: resolvedAction,
            fromStatus: existing.status,
            toStatus: status,
            createdById: req.userId ? String(req.userId) : null
          }
        });

        await enqueueProcurementEvent(tx, {
          eventType: 'procurement.purchase_order.status_changed',
          aggregateType: 'PURCHASE_ORDER',
          aggregateId: updated.id,
          correlationId: getCorrelationId(req),
          payload: withEnterpriseContext(req, purchaseOrderStatusChangedPayload(serializeOrder(updated), existing.status)),
        });
      }

      if (status === 'LIVRE' && updated.demandeAchatId) {
        await tx.demandeAchat.update({
          where: { id: updated.demandeAchatId },
          data: { status: 'COMMANDEE' }
        });
      }

      return updated;
    });

    res.json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error updating bon commande status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du status' });
  }
};

// Get validation logs for a bon commande

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.bonCommande.delete({
      where: { id }
    });

    res.json({ message: 'Bon de commande supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting bon commande:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du bon de commande' });
  }
};
