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
} = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 200);
    const skip = (page - 1) * limit;
    const where = await applyEnterpriseScope({
      req,
      where: buildQuoteWhere(req),
      requestedEnterpriseId: req.query.enterpriseId,
    });

    const [demandes, total] = await Promise.all([
      prisma.demandeAchat.findMany({
        where,
        skip,
        take: limit,
        include: require('./shared').quoteInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.demandeAchat.count({ where }),
    ]);

    res.json({
      success: true,
      data: demandes.map(serializeQuote),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching demandes achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération des DPA',
    });
  }
};

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
        include: require('./shared').quoteInclude,
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

exports.getById = async (req, res) => {
  try {
    const demande = await ensureQuoteExists(req.params.id);

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'DPA non trouvée',
      });
    }

    await assertQuoteAccess(req, demande);

    res.json({
      success: true,
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error fetching demande achat:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération de la DPA',
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
        include: require('./shared').quoteInclude,
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
        include: require('./shared').quoteInclude,
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
        include: require('./shared').quoteInclude,
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
        include: require('./shared').quoteInclude,
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

exports.getApprovalHistory = async (req, res) => {
  try {
    const demande = await prisma.demandeAchat.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        demandeurId: true,
        enterpriseId: true,
      },
    });

    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    const logs = await prisma.demandeAchatApprovalLog.findMany({
      where: { demandeAchatId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorUserId: log.actorUserId,
        actorEmail: log.actorEmail,
        actorServiceId: log.actorServiceId,
        actorServiceName: log.actorServiceName,
        commentaire: log.commentaire,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération de l historique DPA',
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const where = await applyEnterpriseScope({
      req,
      where: buildQuoteWhere(req),
      requestedEnterpriseId: req.query.enterpriseId,
    });
    const scopedOrderWhere = await applyEnterpriseScope({
      req,
      where: {},
      requestedEnterpriseId: req.query.enterpriseId,
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalDemandes, pendingApproval, rejectedThisMonth, convertedToOrders, totalPendingAggregate, ordersThisMonth, pendingOrders] =
      await Promise.all([
        prisma.demandeAchat.count({ where }),
        prisma.demandeAchat.count({
          where: {
            ...where,
            status: { in: ['SOUMISE', 'PROFORMA_SOUMISE'] },
          },
        }),
        prisma.demandeAchat.count({
          where: {
            ...where,
            status: 'REJETEE',
            updatedAt: { gte: startOfMonth },
          },
        }),
        prisma.demandeAchat.count({
          where: { ...where, status: 'COMMANDEE' },
        }),
        prisma.demandeAchat.aggregate({
          where: {
            ...where,
            status: { in: ['SOUMISE', 'PROFORMA_SOUMISE'] },
          },
          _sum: { montantTTC: true },
        }),
        prisma.bonCommande.count({
          where: {
            ...scopedOrderWhere,
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.bonCommande.count({
          where: {
            ...scopedOrderWhere,
            status: { in: ['BROUILLON', 'ENVOYE'] },
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalQuotes: totalDemandes,
        pendingApproval,
        approvedThisMonth: convertedToOrders,
        rejectedThisMonth,
        convertedToOrders,
        totalAmountPending: Number(totalPendingAggregate._sum.montantTTC || 0),
        ordersThisMonth,
        pendingOrders,
        budgetRemaining: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching demande achat stats:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques achats',
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
