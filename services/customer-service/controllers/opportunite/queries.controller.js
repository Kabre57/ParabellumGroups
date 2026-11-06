const { scopedPrisma } = require('../../utils/scopedPrisma');
const { respondScopeError } = require('../../utils/enterpriseScope');
// Gestion de lecture et statistiques des opportunit?s.
const { prisma, logger } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const {
      clientId,
      etape,
      statut,
      commercialId,
      clientStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (clientId) where.clientId = clientId;
    if (etape) where.etape = etape;
    if (statut) where.statut = statut;
    if (commercialId) where.commercialId = commercialId;
    if (clientStatus) {
      where.client = { status: clientStatus };
    }

    // Date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['createdAt', 'dateFermetureEstimee', 'montantEstime', 'probabilite'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [opportunites, total] = await Promise.all([
      scoped.opportunite.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true,
              email: true,
              telephone: true,
              status: true
            }
          },
          produits: {
            select: {
              id: true,
              description: true,
              quantite: true,
              prixUnitaire: true,
              montantHT: true,
              montantTTC: true
            }
          },
          _count: {
            select: {
              produits: true
            }
          }
        },
        orderBy: { [sortField]: order }
      }),
      scoped.opportunite.count({ where })
    ]);

    // Calculate pipeline value
    const pipelineValue = await scoped.opportunite.aggregate({
      where: { ...where, statut: 'OUVERTE' },
      _sum: {
        montantEstime: true
      }
    });

    res.json({
      success: true,
      data: opportunites,
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        pipelineValue: pipelineValue._sum.montantEstime || 0
      }
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la récupération des opportunités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des opportunités'
    });
  }
};

/**
 * Create a new opportunity
 */

exports.getById = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;

    const opportunite = await scoped.opportunite.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true,
            commercialId: true
          }
        },
        produits: true
      }
    });

    if (!opportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.json({
      success: true,
      data: opportunite
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la récupération de l\'opportunité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'opportunité'
    });
  }
};

/**
 * Update opportunity
 */

exports.getPipelineStats = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { commercialId, startDate, endDate } = req.query;

    const where = {};
    if (commercialId) where.commercialId = commercialId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      byEtape,
      byStatut,
      totalValue,
      wonValue,
      conversionRate,
      averageDuration
    ] = await Promise.all([
      scoped.opportunite.groupBy({
        by: ['etape'],
        _count: true,
        _sum: {
          montantEstime: true
        },
        where: { ...where, statut: 'OUVERTE' }
      }),

      scoped.opportunite.groupBy({
        by: ['statut'],
        _count: true,
        _sum: {
          montantEstime: true
        },
        where
      }),

      scoped.opportunite.aggregate({
        where: { ...where, statut: 'OUVERTE' },
        _sum: {
          montantEstime: true
        }
      }),

      scoped.opportunite.aggregate({
        where: { ...where, statut: 'GAGNEE' },
        _sum: {
          montantEstime: true
        }
      }),

      // Calculate conversion rate
      (async () => {
        const total = await scoped.opportunite.count({
          where: { ...where, statut: { in: ['GAGNEE', 'PERDUE'] } }
        });

        const won = await scoped.opportunite.count({
          where: { ...where, statut: 'GAGNEE' }
        });

        return total > 0 ? (won / total * 100) : 0;
      })(),

      // Calculate average duration (days from creation to closure for won opportunities)
      scoped.opportunite.aggregate({
        where: { ...where, statut: 'GAGNEE', createdAt: { not: null } },
        _avg: {
          // This would need a closedAt field to calculate accurately
          // For now, we'll use a placeholder
        }
      })
    ]);

    const stats = {
      pipeline: byEtape.reduce((acc, curr) => {
        acc[curr.etape] = {
          count: curr._count,
          value: curr._sum.montantEstime || 0
        };
        return acc;
      }, {}),
      byStatut: byStatut.reduce((acc, curr) => {
        acc[curr.statut] = {
          count: curr._count,
          value: curr._sum.montantEstime || 0
        };
        return acc;
      }, {}),
      totals: {
        pipelineValue: totalValue._sum.montantEstime || 0,
        wonValue: wonValue._sum.montantEstime || 0,
        conversionRate: `${conversionRate.toFixed(2)}%`
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la récupération des statistiques du pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques du pipeline'
    });
  }
};
