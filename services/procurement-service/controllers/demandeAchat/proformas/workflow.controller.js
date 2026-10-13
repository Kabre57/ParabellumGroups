// Soumission et decisions sur les proformas.
const { validationResult } = require('express-validator');
const {
  prisma,
  generateProformaNumber,
  normalizeProformaLines,
  calculateTotals,
  serializeQuote,
  serializeProforma,
  enqueueProcurementEvent,
  getCorrelationId,
  assertQuoteAccess,
  ensureQuoteExists,
  ensureProformaExists,
  buildActorContext,
  validateProformaReadiness,
  canManageProformas,
  canApproveQuotes,
  canRejectQuotes,
  canEvaluateCommittee,
  parseNullableNonNegativeInt,
  normalizeOptionalText,
  clampCommitteeScore,
  buildCommitteeEvaluation,
  proformaCreatedPayload,
  proformaSubmittedPayload,
  proformaApprovedPayload,
  proformaRejectedPayload,
  quoteInclude,
  proformaInclude,
} = require('../shared');

exports.submitProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut soumettre une proforma au PDG',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas en brouillon ou rejetées peuvent être soumises',
      });
    }

    const readinessError = validateProformaReadiness(existing);
    if (readinessError) {
      return res.status(422).json({ success: false, message: readinessError });
    }

    const actorContext = await buildActorContext(req, demande.serviceName, demande.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'SUBMITTED',
          fromStatus: existing.status,
          toStatus: 'SOUMISE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'Proforma soumise au PDG pour validation',
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'SOUMISE',
          submittedAt: new Date(),
          rejectionReason: null,
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });

      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          recommendedForApproval: false,
        },
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMA_SOUMISE',
        },
      });

      const serializedQuote = serializeQuote(
        await tx.demandeAchat.findUnique({
          where: { id: demande.id },
          include: quoteInclude,
        })
      );

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.submitted',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaSubmittedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma soumise au PDG pour validation',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error submitting proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la soumission de la proforma',
    });
  }
};

exports.approveProforma = async (req, res) => {
  try {
    if (!canApproveQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission d approuver cette proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas soumises peuvent être approuvées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.approvedByServiceName || demande.serviceName,
      req.body?.approvedByServiceId || demande.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'APPROVED',
          fromStatus: existing.status,
          toStatus: 'APPROUVEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'Proforma validée par la PDG',
        },
      });

      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          selectedForOrder: false,
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'APPROUVEE',
          approvedAt: new Date(),
          approvedByUserId: actorContext.actorUserId,
          approvedByServiceId: actorContext.actorServiceId,
          approvedByServiceName: actorContext.actorServiceName,
          rejectionReason: null,
          selectedForOrder: true,
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMA_APPROUVEE',
          fournisseurId: proforma.fournisseurId,
          montantEstime: proforma.montantTTC,
          montantHT: proforma.montantHT,
          montantTVA: proforma.montantTVA,
          montantTTC: proforma.montantTTC,
        },
      });

      const serializedQuote = serializeQuote(
        await tx.demandeAchat.findUnique({
          where: { id: demande.id },
          include: quoteInclude,
        })
      );

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.approved',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaApprovedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma validée. Le service achat peut maintenant générer le bon de commande.',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error approving proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de l approbation de la proforma',
    });
  }
};

exports.rejectProforma = async (req, res) => {
  try {
    if (!canRejectQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de rejeter cette proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const existing = await ensureProformaExists(demande.id, req.params.proformaId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proforma non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les proformas soumises peuvent être rejetées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.rejectedByServiceName || demande.serviceName,
      req.body?.rejectedByServiceId || demande.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proformaApprovalLog.create({
        data: {
          proformaId: existing.id,
          action: 'REJECTED',
          fromStatus: existing.status,
          toStatus: 'REJETEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || req.body?.raison || null,
        },
      });

      const proforma = await tx.proforma.update({
        where: { id: existing.id },
        data: {
          status: 'REJETEE',
          rejectionReason: req.body?.commentaire || req.body?.raison || null,
          selectedForOrder: false,
          recommendedForApproval: false,
        },
        include: proformaInclude,
      });

      await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'PROFORMAS_EN_COURS',
        },
      });

      const serializedQuote = serializeQuote(
        await tx.demandeAchat.findUnique({
          where: { id: demande.id },
          include: quoteInclude,
        })
      );

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_proforma.rejected',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaRejectedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.json({
      success: true,
      message: 'Proforma rejetée',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error rejecting proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors du rejet de la proforma',
    });
  }
};
