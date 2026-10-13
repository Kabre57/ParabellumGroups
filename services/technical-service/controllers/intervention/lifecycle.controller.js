const { prisma, VALID_STATUSES, getInterventionLockState, isLockedIntervention } = require('./shared');
const { isForceDelete } = require('../../utils/authz');

exports.create = async (req, res) => {
  try {
    const {
      missionId,
      titre,
      description,
      resultats,
      observations,
      dateDebut,
      dateFin,
      dureeEstimee,
      technicienIds,
      techniciens,
      materiels
    } = req.body;

    if (!missionId || !titre || !dateDebut) {
      return res.status(400).json({
        success: false,
        error: 'Les champs missionId, titre et dateDebut sont requis'
      });
    }

    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    const resolvedTechnicienIds = Array.isArray(technicienIds)
      ? technicienIds
      : Array.isArray(techniciens)
        ? techniciens.map((technicien) => technicien.technicienId).filter(Boolean)
        : [];

    // Techniciens optionnels maintenant, peuvent être ajoutés après
    const intervention = await prisma.$transaction(async (tx) => {
      const created = await tx.intervention.create({
        data: {
          missionId,
          titre,
          description,
          resultats,
          observations,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : undefined,
          dureeEstimee,
          techniciens: resolvedTechnicienIds.length > 0 ? {
            create: resolvedTechnicienIds.map((technicienId) => ({
              technicienId
            }))
          } : undefined
        }
      });

      if (Array.isArray(materiels) && materiels.length > 0) {
        for (const materielItem of materiels) {
          const materielId = materielItem?.materielId;
          const quantite = Number(materielItem?.quantite || 0);
          const technicienId = materielItem?.technicienId || resolvedTechnicienIds[0];

          if (!materielId || !quantite) {
            continue;
          }

          if (!technicienId) {
            const error = new Error('Technicien requis pour la sortie de matériel');
            error.status = 400;
            throw error;
          }

          const materiel = await tx.materiel.findUnique({
            where: { id: materielId }
          });

          if (!materiel) {
            const error = new Error('Matériel non trouvé');
            error.status = 404;
            throw error;
          }

          if (materiel.quantiteStock < quantite) {
            const error = new Error('Stock insuffisant pour cette sortie');
            error.status = 400;
            throw error;
          }

          await tx.sortieMateriel.create({
            data: {
              materielId,
              interventionId: created.id,
              technicienId,
              quantite,
              notes: materielItem?.notes
            }
          });

          await tx.materiel.update({
            where: { id: materielId },
            data: {
              quantiteStock: materiel.quantiteStock - quantite
            }
          });
        }
      }

      return tx.intervention.findUnique({
        where: { id: created.id },
        include: {
          mission: {
            select: {
              id: true,
              numeroMission: true,
              titre: true,
              clientNom: true,
              nomAdresseChantier: true,
              clientContact: true,
              adresse: true,
              description: true,
              dateDebut: true,
              dateFin: true,
              priorite: true,
              status: true
            }
          },
          techniciens: {
            include: {
              technicien: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true
                }
              }
            }
          },
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
    });

    res.status(201).json({
      success: true,
      message: 'Intervention créée avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in create intervention:', error);
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    });
  }
};

exports.complete = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultats, observations } = req.body;

    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

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

    const dateFin = new Date();
    const dureeReelle = intervention.dateDebut ?
      (dateFin - intervention.dateDebut) / (1000 * 60 * 60) : null;

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        status: 'TERMINEE',
        dateFin,
        dureeReelle,
        resultats,
        observations
      },
      include: {
        mission: {
          select: {
            id: true,
            numeroMission: true,
            titre: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Intervention terminée avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in complete intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la finalisation de l\'intervention'
    });
  }
};

/**
 * Met à jour une intervention
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      resultats,
      observations,
      dateDebut,
      dateFin,
      dureeEstimee,
      status,
      technicienIds,
      techniciens
    } = req.body;

    // Vérifier si l'intervention existe
    const interventionExist = await getInterventionLockState(id);

    if (!interventionExist) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    if (isLockedIntervention(interventionExist)) {
      return res.status(409).json({
        success: false,
        error: 'Une intervention terminée ne peut plus être modifiée'
      });
    }

    // Valider le statut si fourni
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'un des suivants: ${VALID_STATUSES.join(', ')}`
      });
    }

    const resolvedTechnicienIds = Array.isArray(technicienIds)
      ? technicienIds
      : Array.isArray(techniciens)
        ? techniciens.map((technicien) => technicien.technicienId).filter(Boolean)
        : null;

    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        titre,
        description,
        resultats,
        observations,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : undefined,
        dureeEstimee,
        status,
        techniciens: resolvedTechnicienIds ? {
          deleteMany: {}, // Supprimer les assignations existantes
          create: resolvedTechnicienIds.map(technicienId => ({
            technicienId
          }))
        } : undefined
      },
      include: {
        mission: {
          select: {
            id: true,
            numeroMission: true,
            titre: true
          }
        },
        techniciens: {
          include: {
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
      message: 'Intervention mise à jour avec succès',
      data: intervention
    });

    if (status === 'TERMINEE' && intervention?.mission?.id) {
      try {
        const remaining = await prisma.intervention.count({
          where: {
            missionId: intervention.mission.id,
            status: { not: 'TERMINEE' }
          }
        });

        if (remaining === 0) {
          await prisma.mission.update({
            where: { id: intervention.mission.id },
            data: {
              status: 'TERMINEE',
              dateFin: new Date()
            }
          });
        }
      } catch (autoError) {
        console.error('Auto close mission failed:', autoError);
      }
    }
  } catch (error) {
    console.error('Error in update intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'intervention'
    });
  }
};

/**
 * Supprime une intervention
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    // Vérifier si l'intervention existe
    const intervention = await getInterventionLockState(id);

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    if (isLockedIntervention(intervention) && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Une intervention terminée ne peut pas être supprimée'
      });
    }

    await prisma.$transaction(async (tx) => {
      if (forceDelete) {
        await tx.rapport.deleteMany({
          where: { interventionId: id }
        });
        await tx.sortieMateriel.deleteMany({
          where: { interventionId: id }
        });
        await tx.interventionTechnicien.deleteMany({
          where: { interventionId: id }
        });
      }

      await tx.intervention.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Intervention supprimée avec succès'
    });
  } catch (error) {
    console.error('Error in delete intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'intervention'
    });
  }
};
