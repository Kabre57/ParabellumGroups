// Consultation, recherche et statistiques des secteurs.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Get all sectors with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const { parentId, niveau, search } = req.query;

    const where = {};

    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    if (niveau) where.niveau = parseInt(niveau);

    if (search) {
      where.OR = [
        { libelle: { contains: search, mode: 'insensitive' } },
        { codeActivite: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const secteurs = await prisma.secteurActivite.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            libelle: true,
            codeActivite: true
          }
        },
        enfants: {
          select: {
            id: true,
            libelle: true,
            codeActivite: true,
            niveau: true
          }
        },
        _count: {
          select: {
            clients: true,
            enfants: true
          }
        }
      },
      orderBy: [
        { niveau: 'asc' },
        { libelle: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: secteurs
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des secteurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des secteurs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sector by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const secteur = await prisma.secteurActivite.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            libelle: true,
            codeActivite: true,
            description: true
          }
        },
        enfants: {
          include: {
            _count: {
              select: {
                clients: true,
                enfants: true
              }
            }
          }
        },
        clients: {
          take: 10,
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            status: true
          }
        },
        _count: {
          select: {
            clients: true,
            enfants: true
          }
        }
      }
    });

    if (!secteur) {
      return res.status(404).json({
        success: false,
        error: 'Secteur non trouvé'
      });
    }

    res.json({
      success: true,
      data: secteur
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du secteur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du secteur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sector statistics
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await prisma.secteurActivite.groupBy({
      by: ['niveau'],
      _count: true,
      orderBy: { niveau: 'asc' }
    });

    const clientsBySecteur = await prisma.secteurActivite.findMany({
      select: {
        id: true,
        libelle: true,
        codeActivite: true,
        _count: {
          select: {
            clients: true
          }
        }
      },
      orderBy: {
        libelle: 'asc'
      }
    });

    res.json({
      success: true,
      data: {
        byLevel: stats,
        clientsDistribution: clientsBySecteur.filter(s => s._count.clients > 0),
        totalSecteurs: await prisma.secteurActivite.count(),
        totalWithClients: await prisma.secteurActivite.count({
          where: {
            clients: {
              some: {}
            }
          }
        })
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques des secteurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Search sectors by code d'activite or name
 */
exports.search = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    const secteurs = await prisma.secteurActivite.findMany({
      where: {
        OR: [
          { libelle: { contains: q, mode: 'insensitive' } },
          { codeActivite: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: parseInt(limit),
      select: {
        id: true,
        codeActivite: true,
        libelle: true,
        description: true,
        niveau: true,
        parent: {
          select: {
            id: true,
            libelle: true
          }
        },
        _count: {
          select: {
            clients: true
          }
        }
      },
      orderBy: {
        _relevance: {
          fields: ['libelle', 'codeActivite', 'description'],
          search: q,
          sort: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: secteurs,
      meta: {
        query: q,
        limit: parseInt(limit),
        count: secteurs.length
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la recherche des secteurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
