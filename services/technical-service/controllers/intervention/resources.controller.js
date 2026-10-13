const { prisma, getInterventionLockState, isLockedIntervention } = require('./shared');

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await getInterventionLockState(id, true);

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    if (isLockedIntervention(intervention)) {
      return res.status(409).json({
        success: false,
        error: 'Une intervention terminée ne peut plus être modifiée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await getInterventionLockState(id);

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    if (isLockedIntervention(intervention)) {
      return res.status(409).json({
        success: false,
        error: 'Une intervention terminée ne peut plus être modifiée'
      });
    }

    // Vérifier si le matériel existe et le stock
    const materiel = await prisma.materiel.findUnique({
      where: { id: materielId }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }

    if (materiel.quantiteStock < quantite) {
      return res.status(400).json({
        success: false,
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};
