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
} = require('./shared');

exports.createProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut enregistrer une proforma',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    if (!['APPROUVEE', 'PROFORMAS_EN_COURS', 'PROFORMA_SOUMISE', 'PROFORMA_APPROUVEE'].includes(demande.status)) {
      return res.status(409).json({
        success: false,
        message: 'Les proformas ne peuvent être créées qu après validation de la DPA',
      });
    }

    const { fournisseurId, notes, devise, lignes = [], titre, delaiLivraisonJours, disponibilite, observationsAchat } = req.body;
    const normalizedLines = normalizeProformaLines(lignes);
    if (!fournisseurId) {
      return res.status(422).json({ success: false, message: 'Le fournisseur de la proforma est obligatoire' });
    }
    if (normalizedLines.length === 0) {
      return res.status(422).json({ success: false, message: 'La proforma doit contenir au moins une ligne' });
    }

    const totals = calculateTotals(normalizedLines);
    const numeroProforma = await generateProformaNumber(prisma);

    const created = await prisma.$transaction(async (tx) => {
      const proforma = await tx.proforma.create({
        data: {
          numeroProforma,
          demandeAchatId: demande.id,
          fournisseurId: String(fournisseurId),
          titre: titre || `Proforma ${numeroProforma}`,
          devise: devise || demande.devise || 'XOF',
          montantHT: totals.montantHT,
          montantTVA: totals.montantTVA,
          montantTTC: totals.montantTTC,
          delaiLivraisonJours: parseNullableNonNegativeInt(delaiLivraisonJours),
          disponibilite: normalizeOptionalText(disponibilite),
          observationsAchat: normalizeOptionalText(observationsAchat),
          status: 'BROUILLON',
          notes: notes || null,
          lignes: {
            createMany: {
              data: normalizedLines,
            },
          },
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
        eventType: 'procurement.purchase_proforma.created',
        aggregateType: 'PURCHASE_PROFORMA',
        aggregateId: proforma.id,
        correlationId: getCorrelationId(req),
        payload: proformaCreatedPayload(serializedQuote, serializeProforma(proforma)),
      });

      return proforma;
    });

    res.status(201).json({
      success: true,
      message: 'Proforma enregistrée avec succès',
      data: serializeProforma(created),
    });
  } catch (error) {
    console.error('Error creating proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la création de la proforma',
    });
  }
};

exports.recommendProforma = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut retenir une proforma',
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

    if (!['BROUILLON', 'REJETEE', 'SOUMISE', 'APPROUVEE'].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        message: 'Cette proforma ne peut pas être retenue dans son état actuel',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proforma.updateMany({
        where: {
          demandeAchatId: demande.id,
          id: { not: existing.id },
        },
        data: {
          recommendedForApproval: false,
        },
      });

      return tx.proforma.update({
        where: { id: existing.id },
        data: {
          recommendedForApproval: true,
        },
        include: proformaInclude,
      });
    });

    res.json({
      success: true,
      message: 'La proforma recommandée a été mise à jour',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error recommending proforma:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la sélection de la proforma recommandée',
    });
  }
};

exports.saveProformaCommitteeEvaluation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation échouée',
        errors: errors.array(),
      });
    }

    if (!canEvaluateCommittee(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas la permission de renseigner la grille de commission",
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

    const actorContext = await buildActorContext(req, demande.serviceName, demande.serviceId);
    if (actorContext.status) {
      return res.status(actorContext.status).json(actorContext.body);
    }

    const bestAmount = Math.min(
      ...demande.proformas
        .map((proforma) => Number(proforma.montantTTC || 0))
        .filter((amount) => Number.isFinite(amount) && amount > 0)
    );
    const thisAmount = Number(existing.montantTTC || 0);
    const computedFinancialScore =
      Number.isFinite(bestAmount) && bestAmount > 0 && thisAmount > 0
        ? clampCommitteeScore((bestAmount / thisAmount) * 40, 40)
        : 0;

    const evaluationPayload = buildCommitteeEvaluation({
      profileCode: req.body?.profileCode || existing.committeeProfileCode || null,
      eliminatoryChecks: req.body?.eliminatoryChecks,
      technicalScores: req.body?.technicalScores,
      financialCriterion: {
        criterionIndex: Number(req.body?.financialCriterion?.criterionIndex ?? 15),
        label: req.body?.financialCriterion?.label || 'Offre économiquement la plus avantageuse',
        maxPoints: Number(req.body?.financialCriterion?.maxPoints ?? 40),
        points: computedFinancialScore,
        notes: req.body?.financialCriterion?.notes || null,
      },
      decision: req.body?.decision,
      decisionNote: req.body?.decisionNote,
      actor: {
        userId: actorContext.actorUserId,
        email: actorContext.actorEmail,
        serviceId: actorContext.actorServiceId,
        serviceName: actorContext.actorServiceName,
      },
      signDecision: Boolean(req.body?.signDecision),
    });

    const updated = await prisma.proforma.update({
      where: { id: existing.id },
      data: evaluationPayload,
      include: proformaInclude,
    });

    res.json({
      success: true,
      message: req.body?.signDecision ? 'Décision finale signée et enregistrée' : 'Évaluation de commission enregistrée',
      data: serializeProforma(updated),
    });
  } catch (error) {
    console.error('Error saving proforma committee evaluation:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Erreur lors de l'enregistrement de l'évaluation de commission",
    });
  }
};

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
