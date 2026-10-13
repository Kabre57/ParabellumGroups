// Consultation, recherche et statistiques des demandes d achat.
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
        include: quoteInclude,
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
    if (req.query.serviceId) {
      scopedOrderWhere.serviceId = Number(req.query.serviceId);
    }
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
