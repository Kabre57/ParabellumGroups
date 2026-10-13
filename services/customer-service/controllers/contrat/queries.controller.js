// Lecture des contrats, filtres, statistiques et echeances.
const { prisma, logger } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      status,
      typeContrat,
      dateDebutStart,
      dateDebutEnd,
      dateFinStart,
      dateFinEnd,
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
    if (status) where.status = status;
    if (typeContrat) where.typeContrat = typeContrat;

    // Date filters
    if (dateDebutStart || dateDebutEnd) {
      where.dateDebut = {};
      if (dateDebutStart) where.dateDebut.gte = new Date(dateDebutStart);
      if (dateDebutEnd) where.dateDebut.lte = new Date(dateDebutEnd);
    }

    if (dateFinStart || dateFinEnd) {
      where.dateFin = {};
      if (dateFinStart) where.dateFin.gte = new Date(dateFinStart);
      if (dateFinEnd) where.dateFin.lte = new Date(dateFinEnd);
    }

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { numeroContrat: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['dateDebut', 'dateFin', 'createdAt', 'montantHT', 'montantTTC'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [contrats, total] = await Promise.all([
      prisma.contrat.findMany({
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
              status: true,
              typeClient: {
                select: { libelle: true }
              }
            }
          },
          avenants: {
            orderBy: { dateEffet: 'desc' },
            take: 3
          },
          factures: {
            where: { statut: { in: ['EMISE', 'ENVOYEE', 'PAYEE'] } },
            orderBy: { dateEmission: 'desc' },
            take: 3
          },
          _count: {
            select: {
              avenants: true,
              factures: true
            }
          }
        },
        orderBy: { [sortField]: order }
      }),
      prisma.contrat.count({ where })
    ]);

    res.json({
      success: true,
      data: contrats,
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
    logger.error('Erreur lors de la récupération des contrats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contrats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new contract
 */

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              where: { principal: true },
              take: 1
            }
          }
        },
        avenants: {
          orderBy: { dateEffet: 'desc' }
        },
        factures: {
          orderBy: { dateEmission: 'desc' }
        }
      }
    });

    if (!contrat) {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
      });
    }

    res.json({
      success: true,
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du contrat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du contrat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update contract status
 */

exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, typeContrat } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.dateDebut = {};
      if (startDate) where.dateDebut.gte = new Date(startDate);
      if (endDate) where.dateDebut.lte = new Date(endDate);
    }

    if (typeContrat) where.typeContrat = typeContrat;

    const [
      total,
      byStatus,
      byType,
      montantTotal,
      upcomingRenewals,
      expiringSoon
    ] = await Promise.all([
      // Total contracts
      prisma.contrat.count({ where }),

      // Contracts grouped by status
      prisma.contrat.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          montantTTC: true
        },
        where
      }),

      // Contracts grouped by type
      prisma.contrat.groupBy({
        by: ['typeContrat'],
        _count: true,
        _sum: {
          montantTTC: true
        },
        where
      }),

      // Total contract value
      prisma.contrat.aggregate({
        where: { ...where, status: { in: ['ACTIF', 'EN_RENOUVELLEMENT'] } },
        _sum: {
          montantTTC: true
        }
      }),

      // Upcoming renewals (next 30 days)
      prisma.contrat.count({
        where: {
          ...where,
          status: 'ACTIF',
          dateProchainRenouvellement: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      }),

      // Contracts expiring soon (next 30 days)
      prisma.contrat.count({
        where: {
          ...where,
          status: 'ACTIF',
          dateFin: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      })
    ]);

    const stats = {
      totals: {
        all: total,
        activeValue: montantTotal._sum.montantTTC || 0
      },
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = {
          count: curr._count,
          value: curr._sum.montantTTC || 0
        };
        return acc;
      }, {}),
      byType: byType.reduce((acc, curr) => {
        acc[curr.typeContrat] = {
          count: curr._count,
          value: curr._sum.montantTTC || 0
        };
        return acc;
      }, {}),
      alerts: {
        upcomingRenewals,
        expiringSoon
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create contract amendment (avenant)
 */

exports.getExpiringSoon = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const thresholdDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

    const contrats = await prisma.contrat.findMany({
      where: {
        status: 'ACTIF',
        dateFin: {
          lte: thresholdDate,
          gte: new Date()
        }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true
          }
        }
      },
      orderBy: { dateFin: 'asc' }
    });

    res.json({
      success: true,
      data: contrats,
      meta: {
        thresholdDays: parseInt(days),
        thresholdDate,
        count: contrats.length
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des contrats expirants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contrats expirants'
    });
  }
};
