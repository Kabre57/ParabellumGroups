// Soumission, approbation et rejet des demandes d achat.
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

exports.submit = async (req, res) => {
  try {
    const existing = await ensureQuoteExists(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (!canSubmitQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de soumettre cette DPA au PDG',
      });
    }

    await assertQuoteAccess(req, existing);

    if (!['BROUILLON', 'REJETEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA en brouillon ou rejetées peuvent être soumises',
      });
    }

    const readinessError = validateRequestForSubmission(existing);
    if (readinessError) {
      return res.status(422).json({ success: false, message: readinessError });
    }

    const actorContext = await buildActorContext(req, existing.serviceName, existing.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'SUBMITTED',
          fromStatus: existing.status,
          toStatus: 'SOUMISE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'DPA soumise au PDG pour validation',
        },
      });

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'SOUMISE',
          submittedAt: new Date(),
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      const serialized = serializeQuote(demande);
      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.submitted',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(purchaseQuoteSubmittedPayload(serialized), serialized),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA soumise au PDG pour validation',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error submitting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la soumission de la DPA',
    });
  }
};

exports.approve = async (req, res) => {
  try {
    if (!canApproveQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission d approuver cette DPA',
      });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA soumises peuvent être approuvées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.approvedByServiceName || existing.serviceName,
      req.body?.approvedByServiceId || existing.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'APPROVED',
          fromStatus: existing.status,
          toStatus: 'APPROUVEE',
          actorUserId: actorContext.actorUserId,
          actorEmail: actorContext.actorEmail,
          actorServiceId: actorContext.actorServiceId,
          actorServiceName: actorContext.actorServiceName,
          commentaire: req.body?.commentaire || 'DPA validée par la PDG',
        },
      });

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'APPROUVEE',
          approvedAt: new Date(),
          approvedByUserId: actorContext.actorUserId,
          approvedByServiceId: actorContext.actorServiceId,
          approvedByServiceName: actorContext.actorServiceName,
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      const serialized = serializeQuote(demande);
      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.approved',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(purchaseQuoteApprovedPayload(serialized), serialized),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA validée. Le service achat peut désormais enregistrer les proformas.',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error approving demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de l approbation de la DPA',
    });
  }
};

exports.reject = async (req, res) => {
  try {
    if (!canRejectQuotes(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de rejeter cette DPA',
      });
    }

    const existing = await ensureQuoteExists(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seules les DPA soumises peuvent être rejetées',
      });
    }

    const actorContext = await buildActorContext(
      req,
      req.body?.rejectedByServiceName || existing.serviceName,
      req.body?.rejectedByServiceId || existing.serviceId
    );
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
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

      const demande = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'REJETEE',
          rejectionReason: req.body?.commentaire || req.body?.raison || null,
        },
        include: quoteInclude,
      });

      const serialized = serializeQuote(demande);
      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.rejected',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: demande.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(purchaseQuoteRejectedPayload(serialized), serialized),
      });

      return demande;
    });

    res.json({
      success: true,
      message: 'DPA rejetée',
      data: serializeQuote(updated),
    });
  } catch (error) {
    console.error('Error rejecting demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors du rejet de la DPA',
    });
  }
};
