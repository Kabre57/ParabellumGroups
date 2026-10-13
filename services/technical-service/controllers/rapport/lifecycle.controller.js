// Creation et changement de statut des rapports.
const { prisma, VALID_STATUSES } = require('./shared');

exports.create = async (req, res) => {
  try {
    const {
      interventionId,
      titre,
      contenu,
      conclusions,
      recommandations,
      resultats,
      observations,
      redacteurId: bodyRedacteurId,
    } = req.body;
    const headerRedacteurId = req.headers['x-user-id'];

    if (!interventionId || !titre || !contenu) {
      return res.status(400).json({
        success: false,
        error: 'Les champs interventionId, titre et contenu sont requis'
      });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    let redacteurId = bodyRedacteurId || headerRedacteurId;
    if (redacteurId) {
      const existing = await prisma.technicien.findUnique({ where: { id: redacteurId } });
      if (!existing) {
        redacteurId = null;
      }
    }

    if (!redacteurId) {
      const fallbackTech = intervention.techniciens?.[0];
      if (fallbackTech?.technicienId) {
        redacteurId = fallbackTech.technicienId;
      }
    }

    if (!redacteurId) {
      return res.status(400).json({
        success: false,
        error: 'Aucun technicien assigné à l’intervention pour définir le rédacteur'
      });
    }

    const rapport = await prisma.$transaction(async (tx) => {
      const createdRapport = await tx.rapport.create({
        data: {
          interventionId,
          redacteurId,
          titre,
          contenu,
          conclusions,
          recommandations
        },
        include: {
          intervention: {
            select: {
              id: true,
              titre: true,
              mission: {
                select: {
                  numeroMission: true,
                  titre: true
                }
              }
            }
          },
          redacteur: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          }
        }
      });

      if (typeof resultats === 'string' || typeof observations === 'string') {
        await tx.intervention.update({
          where: { id: interventionId },
          data: {
            ...(typeof resultats === 'string' ? { resultats } : {}),
            ...(typeof observations === 'string' ? { observations } : {}),
          }
        });
      }

      return createdRapport;
    });

    res.status(201).json({
      success: true,
      message: 'Rapport créé avec succès',
      data: rapport
    });
  } catch (error) {
    console.error('Error in create rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du rapport'
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'un des suivants: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updateData = { status };
    if (status === 'VALIDE') {
      updateData.dateValidation = new Date();
    }

    const rapport = await prisma.rapport.update({
      where: { id },
      data: updateData,
      include: {
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Statut du rapport mis à jour avec succès',
      data: rapport
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }
    console.error('Error in updateStatus rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};
