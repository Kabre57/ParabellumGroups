// Creation, modification et suppression des demandes d achat.
const { validationResult } = require('express-validator');
const {
  prisma,
  generateDemandeAchatNumber,
  normalizeQuoteLines,
  calculateTotals,
  serializeQuote,
  enqueueProcurementEvent,
  applyEnterpriseScope,
  resolveEnterpriseContext,
  withEnterpriseContext,
  canCreateRequests,
  canUpdateRequests,
  canSubmitQuotes,
  canApproveQuotes,
  canRejectQuotes,
  getCorrelationId,
  toDateOrNull,
  assertQuoteAccess,
  buildQuoteWhere,
  ensureQuoteExists,
  buildActorContext,
  validateRequestForSubmission,
  purchaseQuoteCreatedPayload,
  purchaseQuoteSubmittedPayload,
  purchaseQuoteRejectedPayload,
  purchaseQuoteApprovedPayload,
  quoteInclude,
} = require('../shared');

exports.create = async (req, res) => {
  try {
    if (!canCreateRequests(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de creer une DPA',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { titre, objet, description, fournisseurId, fournisseurNomLibre, dateDemande, dateBesoin, notes, devise, lignes = [] } =
      req.body;

    const normalizedLines = normalizeQuoteLines(lignes);
    const totals = calculateTotals(normalizedLines);
    const numeroDemande = await generateDemandeAchatNumber(prisma);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);

    const created = await prisma.$transaction(async (tx) => {
      const demande = await tx.demandeAchat.create({
        data: {
          numeroDemande,
          titre: String(titre || objet || 'Demande d achat').trim(),
          objet: String(objet || titre || 'Demande d achat').trim(),
          description: description || null,
          demandeurId: String(req.user.id),
          demandeurEmail: req.user?.email || null,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          fournisseurId: fournisseurId || null,
          fournisseurNomLibre: fournisseurId ? null : String(fournisseurNomLibre || '').trim() || null,
          devise: devise || 'XOF',
          dateDemande: toDateOrNull(dateDemande) || new Date(),
          dateBesoin: toDateOrNull(dateBesoin),
          montantEstime: totals.montantTTC,
          montantHT: totals.montantHT,
          montantTVA: totals.montantTVA,
          montantTTC: totals.montantTTC,
          status: 'BROUILLON',
          notes: notes || null,
          ...(normalizedLines.length > 0
            ? {
                lignes: {
                  createMany: {
                    data: normalizedLines,
                  },
                },
              }
            : {}),
        },
        include: quoteInclude,
      });

      const serialized = serializeQuote(demande);
      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.created',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(purchaseQuoteCreatedPayload(serialized), serialized),
      });

      return demande;
    });

    res.status(201).json({
      success: true,
      message: 'DPA créée avec succès',
      data: serializeQuote(created),
    });
  } catch (error) {
    console.error('Error creating demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la création de la DPA',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, existing);

    if (!canUpdateRequests(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette DPA' });
    }

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA en brouillon ou rejetées peuvent être modifiées',
      });
    }

    const { titre, objet, description, fournisseurId, fournisseurNomLibre, dateBesoin, notes, devise, enterpriseId, lignes } =
      req.body;

    const normalizedLines = Array.isArray(lignes) ? normalizeQuoteLines(lignes) : null;
    const totals = normalizedLines ? calculateTotals(normalizedLines) : null;
    const enterprise =
      enterpriseId !== undefined
        ? await resolveEnterpriseContext(req, enterpriseId)
        : {
            enterpriseId: existing.enterpriseId || null,
            enterpriseName: existing.enterpriseName || null,
          };

    const updated = await prisma.$transaction(async (tx) => {
      if (normalizedLines) {
        await tx.ligneDemandeAchat.deleteMany({
          where: { demandeAchatId: existing.id },
        });
      }

      return tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          titre: titre !== undefined ? String(titre || objet || existing.titre).trim() : undefined,
          objet: objet !== undefined ? String(objet || titre || existing.objet || existing.titre).trim() : undefined,
          description: description !== undefined ? description || null : undefined,
          fournisseurId: fournisseurId !== undefined ? fournisseurId || null : undefined,
          fournisseurNomLibre:
            fournisseurNomLibre !== undefined || fournisseurId !== undefined
              ? fournisseurId
                ? null
                : String(fournisseurNomLibre || '').trim() || null
              : undefined,
          dateBesoin: dateBesoin !== undefined ? toDateOrNull(dateBesoin) : undefined,
          notes: notes !== undefined ? notes || null : undefined,
          devise: devise !== undefined ? devise || 'XOF' : undefined,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          ...(totals
            ? {
                montantEstime: totals.montantTTC,
                montantHT: totals.montantHT,
                montantTVA: totals.montantTVA,
                montantTTC: totals.montantTTC,
              }
            : {}),
          ...(normalizedLines
            ? {
                lignes: {
                  createMany: {
                    data: normalizedLines,
                  },
                },
              }
            : {}),
        },
        include: quoteInclude,
      });
    });

    res.json({
      success: true,
      message: 'DPA mise à jour',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error updating demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la DPA',
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const existing = await ensureQuoteExists(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (!canUpdateRequests(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette DPA' });
    }

    await assertQuoteAccess(req, existing);

    if (existing.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer une DPA déjà convertie en bon de commande',
      });
    }

    if (existing.proformas?.length) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer une DPA qui possède déjà des proformas',
      });
    }

    await prisma.demandeAchat.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'DPA supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la suppression de la DPA',
    });
  }
};
