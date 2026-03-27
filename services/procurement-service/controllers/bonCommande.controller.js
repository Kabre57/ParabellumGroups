const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateBonCommandeNumber } = require('../utils/purchaseNumberGenerator');
const { serializeOrder, fetchServiceMeta } = require('../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../utils/outbox');

const prisma = new PrismaClient();

const getCorrelationId = (req) => req.headers['x-correlation-id'] || null;

const purchaseOrderCreatedPayload = (order) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  sourcePurchaseQuoteId: order.sourceDevisAchatId || null,
  sourcePurchaseQuoteNumber: order.requestNumber || null,
  serviceId: order.serviceId || null,
  serviceName: order.serviceName || null,
  supplierId: order.supplierId || null,
  supplierName: order.fournisseurNom || order.supplier || null,
  amountHT: order.montantHT || 0,
  amountTVA: order.montantTVA || 0,
  amountTTC: order.montantTotal || order.amount || 0,
  currency: 'XOF',
  status: order.status,
  createdAt: order.createdAt,
});

const purchaseOrderStatusChangedPayload = (order, fromStatus) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  fromStatus,
  toStatus: order.status,
  serviceId: order.serviceId || null,
  serviceName: order.serviceName || null,
  amountTTC: order.montantTotal || order.amount || 0,
});

const buildLignePayload = (ligne) => {
  const quantite = parseInt(ligne.quantite, 10) || 0;
  const prixUnitaire = parseFloat(ligne.prixUnitaire) || 0;
  const tva = parseFloat(ligne.tva ?? 0) || 0;
  const montantHT = quantite * prixUnitaire;
  const montantTTC = montantHT * (1 + tva / 100);

  return {
    articleId: ligne.articleId ? String(ligne.articleId) : null,
    referenceArticle: ligne.referenceArticle || ligne.reference || null,
    designation: ligne.designation,
    categorie: ligne.categorie || ligne.category || null,
    quantite,
    prixUnitaire,
    tva,
    montantHT,
    montantTTC,
    montant: montantTTC, // compatibilité
  };
};

// Get all bons commande with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, fournisseurId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (fournisseurId) {
      where.fournisseurId = fournisseurId;
    }
    
    if (search) {
      where.numeroBon = { contains: search, mode: 'insensitive' };
    }

    const [bons, total] = await Promise.all([
      prisma.bonCommande.findMany({
        where,
        skip,
        take,
        include: {
          fournisseur: {
            select: {
              id: true,
              nom: true,
              email: true
            }
          },
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          demandeAchat: {
            select: {
              id: true,
              numeroDemande: true,
              titre: true
            }
          },
          lignes: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bonCommande.count({ where })
    ]);

    res.json({
      success: true,
      data: bons.map(serializeOrder),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching bons commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bons de commande' });
  }
};

// Create bon commande
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      demandeAchatId,
      fournisseurId,
      dateCommande,
      dateLivraison,
      montantTotal,
      status,
      lignes = [],
    } = req.body;

    let sourceDemande = null;
    if (demandeAchatId) {
      sourceDemande = await prisma.demandeAchat.findUnique({
        where: { id: demandeAchatId },
        select: {
          id: true,
          serviceId: true,
          serviceName: true,
        },
      });
    }

    const serviceMeta =
      req.user?.serviceId && !sourceDemande?.serviceName
        ? await fetchServiceMeta(req, req.user.serviceId, req.user?.serviceName || null)
        : { serviceName: sourceDemande?.serviceName || req.user?.serviceName || null };

    // Generate unique numero bon
    const numeroBon = await generateBonCommandeNumber(prisma);

    const lignesData = Array.isArray(lignes)
      ? lignes.filter((l) => l.designation && l.quantite && l.prixUnitaire).map(buildLignePayload)
      : [];

    const totalTTC =
      lignesData.length > 0
        ? lignesData.reduce((sum, l) => sum + l.montantTTC, 0)
        : montantTotal || 0;

    const bon = await prisma.$transaction(async (tx) => {
      const created = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId,
          fournisseurId,
          serviceId: sourceDemande?.serviceId ?? req.user?.serviceId ?? null,
          serviceName: sourceDemande?.serviceName || serviceMeta.serviceName,
          dateCommande: dateCommande ? new Date(dateCommande) : new Date(),
          dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
          montantHT: lignesData.reduce((sum, ligne) => sum + ligne.montantHT, 0),
          montantTVA: lignesData.reduce((sum, ligne) => sum + (ligne.montantTTC - ligne.montantHT), 0),
          montantTotal: totalTTC,
          status: status || 'BROUILLON',
          ...(lignesData.length
            ? {
                lignes: {
                  createMany: {
                    data: lignesData,
                  },
                },
              }
            : {}),
        },
        include: {
          fournisseur: true,
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          demandeAchat: true,
          lignes: true,
        },
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: created.id,
        correlationId: getCorrelationId(req),
        payload: purchaseOrderCreatedPayload(serializeOrder(created)),
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error creating bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon de commande' });
  }
};

// Create bon commande from retained proforma
exports.createFromProforma = async (req, res) => {
  try {
    const { proformaId, status } = req.body;
    if (!proformaId) {
      return res.status(400).json({ error: 'proformaId est requis' });
    }

    const proforma = await prisma.proforma.findUnique({
      where: { id: String(proformaId) },
      include: {
        lignes: true,
        demandeAchat: true,
        fournisseur: true,
        bonCommande: true,
      },
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma introuvable' });
    }

    if (proforma.bonCommande) {
      return res.status(409).json({
        error: 'Un bon de commande existe déjà pour cette proforma',
        data: serializeOrder(proforma.bonCommande),
      });
    }

    if (!proforma.selectedForOrder && proforma.status !== 'APPROUVEE') {
      return res.status(400).json({
        error: 'La proforma doit être retenue et validée pour générer un bon de commande',
      });
    }

    const numeroBon = await generateBonCommandeNumber(prisma);

    const lignesData = Array.isArray(proforma.lignes)
      ? proforma.lignes.map((ligne) =>
          buildLignePayload({
            articleId: ligne.articleId,
            referenceArticle: ligne.referenceArticle,
            designation: ligne.designation,
            categorie: ligne.categorie,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tva: ligne.tva,
          })
        )
      : [];

    const montantHT = lignesData.reduce((sum, ligne) => sum + ligne.montantHT, 0);
    const montantTVA = lignesData.reduce((sum, ligne) => sum + (ligne.montantTTC - ligne.montantHT), 0);
    const montantTotal = lignesData.reduce((sum, ligne) => sum + ligne.montantTTC, 0);

    const serviceMeta =
      proforma.demandeAchat?.serviceId && !proforma.demandeAchat?.serviceName
        ? await fetchServiceMeta(req, proforma.demandeAchat.serviceId, proforma.demandeAchat?.serviceName || null)
        : { serviceName: proforma.demandeAchat?.serviceName || req.user?.serviceName || null };

    const bon = await prisma.$transaction(async (tx) => {
      const created = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId: proforma.demandeAchatId,
          proformaId: proforma.id,
          fournisseurId: proforma.fournisseurId,
          serviceId: proforma.demandeAchat?.serviceId ?? req.user?.serviceId ?? null,
          serviceName: proforma.demandeAchat?.serviceName || serviceMeta.serviceName,
          dateCommande: new Date(),
          montantHT,
          montantTVA,
          montantTotal,
          status: status || 'BROUILLON',
          createdFromApproval: true,
          ...(lignesData.length
            ? {
                lignes: {
                  createMany: {
                    data: lignesData,
                  },
                },
              }
            : {}),
        },
        include: {
          fournisseur: true,
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          demandeAchat: true,
          lignes: true,
        },
      });

      await tx.proforma.update({
        where: { id: proforma.id },
        data: {
          selectedForOrder: true,
        },
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: created.id,
        correlationId: getCorrelationId(req),
        payload: purchaseOrderCreatedPayload(serializeOrder(created)),
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error creating bon commande from proforma:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon de commande' });
  }
};

// Get bon commande by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const bon = await prisma.bonCommande.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        proforma: {
          select: {
            id: true,
            numeroProforma: true,
          },
        },
        demandeAchat: true,
        lignes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!bon) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    res.json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error fetching bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du bon de commande' });
  }
};

// Update bon commande
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
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, quantite, prixUnitaire, tva = 0 } = req.body;

    if (!designation || !quantite || !prixUnitaire) {
      return res.status(400).json({ error: 'designation, quantite et prixUnitaire sont requis' });
    }

    const payload = buildLignePayload({ designation, quantite, prixUnitaire, tva });

    const ligne = await prisma.ligneCommande.create({
      data: {
        bonCommandeId: id,
        ...payload,
      },
    });

    // Update bon commande montant total
    const bonLignes = await prisma.ligneCommande.findMany({
      where: { bonCommandeId: id }
    });

    const montantTotal = bonLignes.reduce((sum, l) => sum + parseFloat(l.montantTTC), 0);

    await prisma.bonCommande.update({
      where: { id },
      data: { montantTotal }
    });

    res.status(201).json(ligne);
  } catch (error) {
    console.error('Error adding ligne to bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la ligne' });
  }
};

// Update bon commande status
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
            createdById: req.userId || null
          }
        });

        await enqueueProcurementEvent(tx, {
          eventType: 'procurement.purchase_order.status_changed',
          aggregateType: 'PURCHASE_ORDER',
          aggregateId: updated.id,
          correlationId: getCorrelationId(req),
          payload: purchaseOrderStatusChangedPayload(serializeOrder(updated), existing.status),
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
exports.getValidationLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await prisma.bonCommandeValidationLog.findMany({
      where: { bonCommandeId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching validation logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

// Get global validation history
exports.getValidationHistory = async (req, res) => {
  try {
    const {
      limit = 50,
      page = 1,
      bonCommandeId,
      action,
      fromStatus,
      toStatus
    } = req.query;

    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (parseInt(page, 10) - 1) * take;

    const where = {};
    if (bonCommandeId) where.bonCommandeId = bonCommandeId;
    if (action) where.action = action;
    if (fromStatus) where.fromStatus = fromStatus;
    if (toStatus) where.toStatus = toStatus;

    const [logs, total] = await Promise.all([
      prisma.bonCommandeValidationLog.findMany({
        take,
        skip,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          bonCommande: {
            select: {
              id: true,
              numeroBon: true
            }
          }
        }
      }),
      prisma.bonCommandeValidationLog.count({ where })
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      action: log.action,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      createdAt: log.createdAt,
      createdById: log.createdById,
      bonCommandeId: log.bonCommande?.id || null,
      numeroBon: log.bonCommande?.numeroBon || null
    }));

    res.json({
      data,
      meta: {
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching validation history:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

// Get bons commande by fournisseur
exports.getByFournisseur = async (req, res) => {
  try {
    const { fournisseurId } = req.params;

    const bons = await prisma.bonCommande.findMany({
      where: { fournisseurId },
      include: {
        fournisseur: true,
        demandeAchat: true,
        lignes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: bons.map(serializeOrder),
    });
  } catch (error) {
    console.error('Error fetching bons commande by fournisseur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bons de commande' });
  }
};

// Delete bon commande
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
