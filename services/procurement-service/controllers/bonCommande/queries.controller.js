// Consultation des commandes, filtres et historique de validation.
const { prisma, validationResult, generateBonCommandeNumber, serializeOrder, fetchServiceMeta, enqueueProcurementEvent, getCorrelationId, withEnterpriseContext, purchaseOrderCreatedPayload, purchaseOrderStatusChangedPayload, buildLignePayload } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, fournisseurId, search, serviceId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const { applyEnterpriseScope } = require('../../utils/enterpriseScope');
    const baseWhere = {};

    if (status) {
      baseWhere.status = status;
    }

    if (fournisseurId) {
      baseWhere.fournisseurId = fournisseurId;
    }

    if (serviceId) {
      baseWhere.serviceId = Number(serviceId);
    }

    if (search) {
      baseWhere.numeroBon = { contains: search, mode: 'insensitive' };
    }

    const where = await applyEnterpriseScope({
      req,
      where: baseWhere,
      requestedEnterpriseId: req.query.enterpriseId,
    });

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
