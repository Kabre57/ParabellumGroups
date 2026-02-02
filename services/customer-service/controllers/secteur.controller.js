const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

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
        { codeNAF: { contains: search, mode: 'insensitive' } },
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
            codeNAF: true
          }
        },
        enfants: {
          select: {
            id: true,
            libelle: true,
            codeNAF: true,
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
 * Get sector tree structure
 */
exports.getTree = async (req, res) => {
  try {
    const secteurs = await prisma.secteurActivite.findMany({
      include: {
        parent: {
          select: {
            id: true,
            libelle: true
          }
        },
        enfants: {
          select: {
            id: true,
            libelle: true,
            codeNAF: true,
            niveau: true,
            enfants: {
              select: {
                id: true,
                libelle: true,
                niveau: true
              }
            }
          }
        },
        _count: {
          select: {
            clients: true
          }
        }
      },
      orderBy: [
        { niveau: 'asc' },
        { libelle: 'asc' }
      ]
    });

    // Build tree structure
    const buildTree = (parentId = null) => {
      return secteurs
        .filter(secteur => secteur.parentId === parentId)
        .map(secteur => ({
          ...secteur,
          enfants: buildTree(secteur.id)
        }));
    };

    const tree = buildTree();

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'arbre des secteurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'arbre des secteurs'
    });
  }
};

/**
 * Create a new sector
 */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      codeNAF,
      libelle,
      description,
      parentId
    } = req.body;

    // Check if codeNAF already exists
    if (codeNAF) {
      const existingSecteur = await prisma.secteurActivite.findUnique({
        where: { codeNAF }
      });

      if (existingSecteur) {
        return res.status(409).json({
          success: false,
          error: 'Un secteur avec ce code NAF existe déjà'
        });
      }
    }

    // Calculate level based on parent
    let niveau = 1;
    if (parentId) {
      const parent = await prisma.secteurActivite.findUnique({
        where: { id: parentId }
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Secteur parent non trouvé'
        });
      }

      niveau = parent.niveau + 1;
    }

    const secteur = await prisma.secteurActivite.create({
      data: {
        codeNAF,
        libelle,
        description,
        parentId: parentId || null,
        niveau
      },
      include: {
        parent: {
          select: {
            id: true,
            libelle: true,
            codeNAF: true
          }
        }
      }
    });

    logger.info('Secteur créé', {
      secteurId: secteur.id,
      userId: req.user.id,
      libelle: secteur.libelle
    });

    res.status(201).json({
      success: true,
      message: 'Secteur créé avec succès',
      data: secteur
    });
  } catch (error) {
    logger.error('Erreur lors de la création du secteur:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un secteur avec ce code NAF existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du secteur',
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
            codeNAF: true,
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
 * Update sector
 */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const existingSecteur = await prisma.secteurActivite.findUnique({
      where: { id }
    });

    if (!existingSecteur) {
      return res.status(404).json({
        success: false,
        error: 'Secteur non trouvé'
      });
    }

    // If changing parent, recalculate level
    if (updateData.parentId !== undefined) {
      let nouveauNiveau = 1;
      
      if (updateData.parentId) {
        const nouveauParent = await prisma.secteurActivite.findUnique({
          where: { id: updateData.parentId }
        });

        if (!nouveauParent) {
          return res.status(404).json({
            success: false,
            error: 'Secteur parent non trouvé'
          });
        }

        // Prevent circular reference
        if (updateData.parentId === id) {
          return res.status(400).json({
            success: false,
            error: 'Un secteur ne peut pas être son propre parent'
          });
        }

        // Check if the new parent is a child of this sector
        const estEnfant = await isDescendant(updateData.parentId, id);
        if (estEnfant) {
          return res.status(400).json({
            success: false,
            error: 'Impossible de définir un secteur enfant comme parent'
          });
        }

        nouveauNiveau = nouveauParent.niveau + 1;
      }
      
      updateData.niveau = nouveauNiveau;

      // Update children levels
      await updateChildrenLevels(id, nouveauNiveau + 1);
    }

    const secteur = await prisma.secteurActivite.update({
      where: { id },
      data: updateData
    });

    logger.info('Secteur mis à jour', {
      secteurId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Secteur mis à jour avec succès',
      data: secteur
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du secteur:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Secteur non trouvé'
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un secteur avec ce code NAF existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du secteur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete sector
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sector has clients
    const clientCount = await prisma.client.count({
      where: { secteurActiviteId: id }
    });

    if (clientCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer ce secteur car il est utilisé par des clients',
        clientCount
      });
    }

    // Check if sector has children
    const childrenCount = await prisma.secteurActivite.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer ce secteur car il a des sous-secteurs',
        childrenCount
      });
    }

    await prisma.secteurActivite.delete({
      where: { id }
    });

    logger.info('Secteur supprimé', {
      secteurId: id,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du secteur:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Secteur non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du secteur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to check if a sector is descendant of another
 */
async function isDescendant(potentialChildId, potentialParentId) {
  let currentId = potentialChildId;
  
  while (currentId) {
    const secteur = await prisma.secteurActivite.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    
    if (!secteur) break;
    if (secteur.parentId === potentialParentId) return true;
    
    currentId = secteur.parentId;
  }
  
  return false;
}

/**
 * Helper function to update children levels
 */
async function updateChildrenLevels(parentId, baseLevel) {
  const enfants = await prisma.secteurActivite.findMany({
    where: { parentId }
  });

  for (const enfant of enfants) {
    await prisma.secteurActivite.update({
      where: { id: enfant.id },
      data: { niveau: baseLevel }
    });

    // Recursively update grandchildren
    await updateChildrenLevels(enfant.id, baseLevel + 1);
  }
}

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
        codeNAF: true,
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
 * Search sectors by code NAF or name
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
          { codeNAF: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: parseInt(limit),
      select: {
        id: true,
        codeNAF: true,
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
          fields: ['libelle', 'codeNAF', 'description'],
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