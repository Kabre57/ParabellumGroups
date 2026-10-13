// Creation, modification et suppression des secteurs.
const { prisma, logger, validationResult } = require('./shared');

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
      codeActivite,
      libelle,
      description,
      parentId
    } = req.body;

    // Check if codeActivite already exists
    if (codeActivite) {
      const existingSecteur = await prisma.secteurActivite.findUnique({
        where: { codeActivite }
      });

      if (existingSecteur) {
        return res.status(409).json({
          success: false,
          error: "Un secteur avec ce code d'activite existe déjà"
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
        codeActivite,
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
            codeActivite: true
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
        error: "Un secteur avec ce code d'activite existe déjà"
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
        error: "Un secteur avec ce code d'activite existe déjà"
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
