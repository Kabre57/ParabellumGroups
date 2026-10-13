// Lecture de la hierarchie des secteurs.
const { prisma, logger, validationResult } = require('./shared');

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
            codeActivite: true,
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
