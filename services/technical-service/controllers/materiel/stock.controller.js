// Enregistrement des sorties de materiel et de leurs retours.
const { prisma } = require('./shared');

exports.createSortie = async (req, res) => {
  try {
    const {
      materielId,
      interventionId,
      technicienId,
      quantite,
      notes
    } = req.body;

    if (!materielId || !interventionId || !technicienId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId, interventionId, technicienId et quantite sont requis'
      });
    }

    // Vérifier la disponibilité du matériel
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
        error: 'Stock insuffisant pour cette sortie'
      });
    }

    // Créer la sortie
    const sortie = await prisma.sortieMateriel.create({
      data: {
        materielId,
        interventionId,
        technicienId,
        quantite,
        notes
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        },
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        },
        technicien: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Mettre à jour le stock
    await prisma.materiel.update({
      where: { id: materielId },
      data: {
        quantiteStock: materiel.quantiteStock - quantite
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sortie de matériel créée avec succès',
      data: sortie
    });
  } catch (error) {
    console.error('Error in createSortie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la sortie'
    });
  }
};

/**
 * Retour de matériel
 */

exports.retourSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const { etatRetour, notes } = req.body;

    const sortie = await prisma.sortieMateriel.findUnique({
      where: { id }
    });

    if (!sortie) {
      return res.status(404).json({
        success: false,
        error: 'Sortie non trouvée'
      });
    }

    if (sortie.dateRetour) {
      return res.status(400).json({
        success: false,
        error: 'Cette sortie a déjà été retournée'
      });
    }

    const updated = await prisma.sortieMateriel.update({
      where: { id },
      data: {
        dateRetour: new Date(),
        etatRetour,
        notes
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        }
      }
    });

    // Restocker le matériel
    const materiel = await prisma.materiel.findUnique({
      where: { id: sortie.materielId }
    });

    if (materiel) {
      await prisma.materiel.update({
        where: { id: sortie.materielId },
        data: {
          quantiteStock: materiel.quantiteStock + sortie.quantite
        }
      });
    }

    res.json({
      success: true,
      message: 'Retour de matériel enregistré avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in retourSortie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement du retour'
    });
  }
};
