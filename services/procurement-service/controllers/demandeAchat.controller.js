const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateDemandeAchatNumber, generateBonCommandeNumber } = require('../utils/purchaseNumberGenerator');
const {
  normalizeQuoteLines,
  calculateTotals,
  fetchServiceMeta,
  serializeQuote,
  serializeOrder,
} = require('../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../utils/outbox');

const prisma = new PrismaClient();

const quoteInclude = {
  fournisseur: true,
  lignes: {
    orderBy: { createdAt: 'asc' },
  },
  approvalLogs: {
    orderBy: { createdAt: 'desc' },
  },
  bonsCommande: {
    orderBy: { createdAt: 'desc' },
    include: {
      fournisseur: true,
      lignes: {
        orderBy: { createdAt: 'asc' },
      },
      demandeAchat: {
        select: {
          id: true,
          numeroDemande: true,
          titre: true,
        },
      },
    },
  },
};

const isAdminUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR'].includes(role);
};

const buildQuoteWhere = (req) => {
  const {
    status,
    demandeurId,
    serviceId,
    fournisseurId,
    search,
  } = req.query;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (demandeurId) {
    where.demandeurId = String(demandeurId);
  }

  if (serviceId) {
    where.serviceId = Number(serviceId);
  } else if (!isAdminUser(req.user) && req.user?.serviceId) {
    where.serviceId = req.user.serviceId;
  }

  if (fournisseurId) {
    where.fournisseurId = String(fournisseurId);
  }

  if (search) {
    where.OR = [
      { titre: { contains: String(search), mode: 'insensitive' } },
      { objet: { contains: String(search), mode: 'insensitive' } },
      { numeroDemande: { contains: String(search), mode: 'insensitive' } },
      { fournisseur: { is: { nom: { contains: String(search), mode: 'insensitive' } } } },
    ];
  }

  return where;
};

const ensureQuoteExists = async (id) => {
  const demande = await prisma.demandeAchat.findUnique({
    where: { id },
    include: quoteInclude,
  });

  return demande;
};

const ensureServiceContext = async (req, fallbackName = null) => {
  const serviceId = req.user?.serviceId ?? null;

  if (!serviceId) {
    return {
      error: {
        status: 422,
        body: {
          success: false,
          message: 'Le service demandeur est obligatoire pour cette operation',
        },
      },
    };
  }

  const serviceMeta = await fetchServiceMeta(req, serviceId, req.user?.serviceName || fallbackName);
  return {
    serviceId,
    serviceName: serviceMeta.serviceName || req.user?.serviceName || fallbackName || null,
  };
};

const validateQuoteReadiness = (demande) => {
  if (!demande.fournisseurId) {
    return 'Le fournisseur est obligatoire avant approbation';
  }

  if (!Array.isArray(demande.lignes) || demande.lignes.length === 0) {
    return 'Au moins une ligne article est requise avant approbation';
  }

  return null;
};

const getCorrelationId = (req) =>
  req.headers['x-correlation-id'] || req.headers['x-correlation-id'.toLowerCase()] || null;

const purchaseQuoteCreatedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  requesterUserId: quote.demandeurUserId,
  supplierId: quote.fournisseurId,
  supplierName: quote.fournisseurNom,
  amountHT: quote.montantHT,
  amountTVA: quote.montantTVA,
  amountTTC: quote.montantTTC,
  currency: quote.devise || 'XOF',
  status: quote.status,
  createdAt: quote.createdAt,
});

const purchaseQuoteSubmittedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  status: quote.status,
  submittedAt: quote.submittedAt,
});

const purchaseQuoteRejectedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  status: quote.status,
  reason: quote.rejectionReason || null,
});

const purchaseQuoteApprovedPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  approvedByUserId: quote.approvedByUserId,
  approvedByServiceId: quote.approvedByServiceId,
  approvedByServiceName: quote.approvedByServiceName,
  amountTTC: quote.montantTTC,
  status: 'APPROUVEE',
});

const purchaseOrderCreatedPayload = (order) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  sourcePurchaseQuoteId: order.sourceDevisAchatId,
  sourcePurchaseQuoteNumber: order.requestNumber,
  serviceId: order.serviceId,
  serviceName: order.serviceName,
  supplierId: order.supplierId,
  supplierName: order.fournisseurNom || order.supplier,
  amountHT: order.montantHT || 0,
  amountTVA: order.montantTVA || 0,
  amountTTC: order.montantTotal || order.amount,
  currency: 'XOF',
  status: order.status,
  createdAt: order.createdAt,
});

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 200);
    const skip = (page - 1) * limit;
    const where = buildQuoteWhere(req);

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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des devis d\'achat',
    });
  }
};

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      titre,
      objet,
      description,
      fournisseurId,
      dateDemande,
      dateBesoin,
      notes,
      devise,
      lignes = [],
      status,
      serviceName,
    } = req.body;

    const serviceContext = await ensureServiceContext(req, serviceName);
    if (serviceContext.error) {
      return res.status(serviceContext.error.status).json(serviceContext.error.body);
    }

    const normalizedLines = normalizeQuoteLines(lignes);
    const totals = calculateTotals(normalizedLines);
    const numeroDemande = await generateDemandeAchatNumber(prisma);

    const demande = await prisma.$transaction(async (tx) => {
      const created = await tx.demandeAchat.create({
        data: {
          numeroDemande,
          titre: String(titre || objet || 'Devis d\'achat').trim(),
          objet: String(objet || titre || 'Devis d\'achat').trim(),
          description: description || null,
          demandeurId: String(req.user.id),
          demandeurEmail: req.user?.email || null,
          serviceId: serviceContext.serviceId,
          serviceName: serviceContext.serviceName,
          fournisseurId: fournisseurId || null,
          devise: devise || 'XOF',
          dateDemande: dateDemande ? new Date(dateDemande) : new Date(),
          dateBesoin: dateBesoin ? new Date(dateBesoin) : null,
          montantEstime: totals.montantTTC,
          montantHT: totals.montantHT,
          montantTVA: totals.montantTVA,
          montantTTC: totals.montantTTC,
          status: status || 'BROUILLON',
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

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.created',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: created.id,
        correlationId: getCorrelationId(req),
        payload: purchaseQuoteCreatedPayload(serializeQuote(created)),
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Devis d\'achat créé avec succès',
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error creating demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du devis d\'achat',
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const demande = await ensureQuoteExists(req.params.id);

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    res.json({
      success: true,
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error fetching demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du devis d\'achat',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const existing = await ensureQuoteExists(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    if (existing.status === 'COMMANDEE') {
      return res.status(409).json({
        success: false,
        message: 'Le devis a déjà été converti en bon de commande',
      });
    }

    const {
      titre,
      objet,
      description,
      fournisseurId,
      dateBesoin,
      notes,
      devise,
      lignes,
      serviceName,
    } = req.body;

    const serviceContext = req.user?.serviceId
      ? await ensureServiceContext(req, serviceName || existing.serviceName)
      : {
          serviceId: existing.serviceId,
          serviceName: serviceName || existing.serviceName || null,
        };

    if (serviceContext.error) {
      return res.status(serviceContext.error.status).json(serviceContext.error.body);
    }

    const normalizedLines = Array.isArray(lignes) ? normalizeQuoteLines(lignes) : null;
    const totals = normalizedLines ? calculateTotals(normalizedLines) : null;

    const demande = await prisma.$transaction(async (tx) => {
      if (normalizedLines) {
        await tx.ligneDemandeAchat.deleteMany({
          where: { demandeAchatId: id },
        });
      }

      return tx.demandeAchat.update({
        where: { id },
        data: {
          titre: titre !== undefined ? String(titre || objet || existing.titre).trim() : undefined,
          objet: objet !== undefined ? String(objet || titre || existing.objet || existing.titre).trim() : undefined,
          description: description !== undefined ? description || null : undefined,
          fournisseurId: fournisseurId !== undefined ? fournisseurId || null : undefined,
          dateBesoin: dateBesoin !== undefined ? (dateBesoin ? new Date(dateBesoin) : null) : undefined,
          notes: notes !== undefined ? notes || null : undefined,
          devise: devise !== undefined ? devise || 'XOF' : undefined,
          serviceId: serviceContext.serviceId,
          serviceName: serviceContext.serviceName,
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
      message: 'Devis d\'achat mis à jour',
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error updating demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du devis d\'achat',
    });
  }
};

exports.submit = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ensureQuoteExists(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    if (existing.status !== 'BROUILLON' && existing.status !== 'REJETEE') {
      return res.status(409).json({
        success: false,
        message: 'Seuls les devis en brouillon ou rejetés peuvent être soumis',
      });
    }

    const demande = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: id,
          action: 'SUBMITTED',
          fromStatus: existing.status,
          toStatus: 'SOUMISE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: req.user?.serviceId ?? null,
          actorServiceName: existing.serviceName || null,
          commentaire: req.body?.commentaire || null,
        },
      });

      const updated = await tx.demandeAchat.update({
        where: { id },
        data: {
          status: 'SOUMISE',
          submittedAt: new Date(),
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.submitted',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: updated.id,
        correlationId: getCorrelationId(req),
        payload: purchaseQuoteSubmittedPayload(serializeQuote(updated)),
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Devis d\'achat soumis pour approbation',
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error submitting demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission du devis d\'achat',
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ensureQuoteExists(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seuls les devis soumis peuvent être approuvés',
      });
    }

    if (existing.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Ce devis a déjà généré un bon de commande',
      });
    }

    const readinessError = validateQuoteReadiness(existing);
    if (readinessError) {
      return res.status(422).json({
        success: false,
        message: readinessError,
      });
    }

    const approverService = await ensureServiceContext(req, req.body?.approvedByServiceName || null);
    if (approverService.error) {
      return res.status(approverService.error.status).json(approverService.error.body);
    }

    const numeroBon = await generateBonCommandeNumber(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId: existing.id,
          fournisseurId: existing.fournisseurId,
          serviceId: existing.serviceId,
          serviceName: existing.serviceName,
          dateCommande: new Date(),
          dateLivraison: req.body?.dateLivraisonPrevue ? new Date(req.body.dateLivraisonPrevue) : existing.dateBesoin,
          montantHT: existing.montantHT,
          montantTVA: existing.montantTVA,
          montantTotal: existing.montantTTC,
          status: 'BROUILLON',
          createdFromApproval: true,
          lignes: {
            createMany: {
              data: existing.lignes.map((ligne) => ({
                articleId: ligne.articleId,
                referenceArticle: ligne.referenceArticle,
                designation: ligne.designation,
                categorie: ligne.categorie,
                quantite: ligne.quantite,
                prixUnitaire: ligne.prixUnitaire,
                tva: ligne.tva,
                montantHT: ligne.montantHT,
                montantTTC: ligne.montantTTC,
                montant: ligne.montantTTC,
              })),
            },
          },
        },
        include: {
          fournisseur: true,
          lignes: {
            orderBy: { createdAt: 'asc' },
          },
          demandeAchat: {
            select: {
              id: true,
              numeroDemande: true,
              titre: true,
            },
          },
        },
      });

      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: existing.id,
          action: 'APPROVED',
          fromStatus: existing.status,
          toStatus: 'COMMANDEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: approverService.serviceId,
          actorServiceName: approverService.serviceName,
          commentaire: req.body?.commentaire || null,
        },
      });

      const purchaseQuote = await tx.demandeAchat.update({
        where: { id: existing.id },
        data: {
          status: 'COMMANDEE',
          approvedAt: new Date(),
          approvedByUserId: String(req.user.id),
          approvedByServiceId: approverService.serviceId,
          approvedByServiceName: approverService.serviceName,
          rejectionReason: null,
        },
        include: quoteInclude,
      });

      const serializedQuote = serializeQuote(purchaseQuote);
      const serializedOrder = serializeOrder(purchaseOrder);

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.approved',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: purchaseQuote.id,
        correlationId: getCorrelationId(req),
        payload: purchaseQuoteApprovedPayload(serializedQuote),
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: purchaseOrder.id,
        correlationId: getCorrelationId(req),
        payload: purchaseOrderCreatedPayload(serializedOrder),
      });

      return { purchaseOrder, purchaseQuote };
    });

    res.json({
      success: true,
      message: 'Devis d\'achat approuvé et converti en bon de commande',
      data: {
        purchaseQuote: serializeQuote(result.purchaseQuote),
        purchaseOrder: {
          id: result.purchaseOrder.id,
          numeroBon: result.purchaseOrder.numeroBon,
          status: result.purchaseOrder.status,
        },
      },
    });
  } catch (error) {
    console.error('Error approving demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'approbation du devis d\'achat',
    });
  }
};

exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ensureQuoteExists(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    if (existing.status !== 'SOUMISE') {
      return res.status(409).json({
        success: false,
        message: 'Seuls les devis soumis peuvent être rejetés',
      });
    }

    const approverService = await ensureServiceContext(req, req.body?.rejectedByServiceName || null);
    if (approverService.error) {
      return res.status(approverService.error.status).json(approverService.error.body);
    }

    const demande = await prisma.$transaction(async (tx) => {
      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: id,
          action: 'REJECTED',
          fromStatus: existing.status,
          toStatus: 'REJETEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: approverService.serviceId,
          actorServiceName: approverService.serviceName,
          commentaire: req.body?.commentaire || req.body?.raison || null,
        },
      });

      const updated = await tx.demandeAchat.update({
        where: { id },
        data: {
          status: 'REJETEE',
          rejectionReason: req.body?.commentaire || req.body?.raison || null,
        },
        include: quoteInclude,
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_quote.rejected',
        aggregateType: 'PURCHASE_QUOTE',
        aggregateId: updated.id,
        correlationId: getCorrelationId(req),
        payload: purchaseQuoteRejectedPayload(serializeQuote(updated)),
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Devis d\'achat rejeté',
      data: serializeQuote(demande),
    });
  } catch (error) {
    console.error('Error rejecting demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet du devis d\'achat',
    });
  }
};

exports.getApprovalHistory = async (req, res) => {
  try {
    const demande = await prisma.demandeAchat.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
      },
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique d\'approbation',
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const where = buildQuoteWhere(req);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalDemandes,
      pendingApproval,
      rejectedThisMonth,
      convertedToOrders,
      totalPendingAggregate,
      ordersThisMonth,
      pendingOrders,
    ] = await Promise.all([
      prisma.demandeAchat.count({ where }),
      prisma.demandeAchat.count({
        where: { ...where, status: 'SOUMISE' },
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
        where: { ...where, status: 'SOUMISE' },
        _sum: { montantTTC: true },
      }),
      prisma.bonCommande.count({
        where: {
          createdAt: { gte: startOfMonth },
          ...(where.serviceId ? { serviceId: where.serviceId } : {}),
        },
      }),
      prisma.bonCommande.count({
        where: {
          status: { in: ['BROUILLON', 'ENVOYE'] },
          ...(where.serviceId ? { serviceId: where.serviceId } : {}),
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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques achats',
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const existing = await ensureQuoteExists(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Devis d\'achat non trouvé',
      });
    }

    if (existing.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer un devis déjà converti en bon de commande',
      });
    }

    await prisma.demandeAchat.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Devis d\'achat supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting demande achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du devis d\'achat',
    });
  }
};
