// Consultation, recherche et statistiques des interactions.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Get all interactions with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      contactId,
      type,
      canal,
      resultat,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (clientId) where.clientId = clientId;
    if (contactId) where.contactId = contactId;
    if (type) where.type = type;
    if (canal) where.canal = canal;
    if (resultat) where.resultat = resultat;

    // Date filters
    if (startDate || endDate) {
      where.dateInteraction = {};
      if (startDate) where.dateInteraction.gte = new Date(startDate);
      if (endDate) where.dateInteraction.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { sujet: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { resultat: { contains: search, mode: 'insensitive' } },
        { actionRequise: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [interactions, total] = await Promise.all([
      prisma.interactionClient.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true
            }
          },
          contact: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          },
          tacheLiee: {
            select: {
              id: true,
              titre: true,
              statut: true
            }
          }
        },
        orderBy: { dateInteraction: 'desc' }
      }),
      prisma.interactionClient.count({ where })
    ]);

    res.json({
      success: true,
      data: interactions,
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des interactions'
    });
  }
};

/**
 * Get interaction by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true
          }
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            poste: true
          }
        },
        tacheLiee: {
          select: {
            id: true,
            titre: true,
            description: true,
            statut: true,
            dateEcheance: true
          }
        }
      }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'interaction'
    });
  }
};

/**
 * Get interaction statistics
 */
exports.getStats = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;

    const where = {};
    if (clientId) where.clientId = clientId;

    if (startDate || endDate) {
      where.dateInteraction = {};
      if (startDate) where.dateInteraction.gte = new Date(startDate);
      if (endDate) where.dateInteraction.lte = new Date(endDate);
    }

    const [
      totalInteractions,
      byType,
      byCanal,
      byResultat,
      averageDuration,
      recentInteractions
    ] = await Promise.all([
      prisma.interactionClient.count({ where }),

      prisma.interactionClient.groupBy({
        by: ['type'],
        _count: true,
        where
      }),

      prisma.interactionClient.groupBy({
        by: ['canal'],
        _count: true,
        where
      }),

      prisma.interactionClient.groupBy({
        by: ['resultat'],
        _count: true,
        where
      }),

      prisma.interactionClient.aggregate({
        where: {
          ...where,
          dureeMinutes: { not: null }
        },
        _avg: {
          dureeMinutes: true
        }
      }),

      prisma.interactionClient.findMany({
        where,
        take: 10,
        orderBy: { dateInteraction: 'desc' },
        select: {
          id: true,
          type: true,
          sujet: true,
          dateInteraction: true,
          client: {
            select: {
              nom: true,
              raisonSociale: true
            }
          }
        }
      })
    ]);

    const stats = {
      totals: {
        interactions: totalInteractions,
        averageDuration: averageDuration._avg.dureeMinutes || 0
      },
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {}),
      byCanal: byCanal.reduce((acc, curr) => {
        acc[curr.canal] = curr._count;
        return acc;
      }, {}),
      byResultat: byResultat.reduce((acc, curr) => {
        acc[curr.resultat || 'NON_DEFINI'] = curr._count;
        return acc;
      }, {}),
      recent: recentInteractions
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
