// Création, modification et suppression des missions.
const { getNextMissionNumber, isForceDelete, prisma, VALID_STATUSES, VALID_PRIORITIES, parseScopedInteger, getMissionWithInterventionState, missionHasInterventions, missionHasCompletedIntervention } = require('./shared');

exports.create = async (req, res) => {
  try {
    const {
      titre,
      description,
      clientId,
      adresseId,
      clientNom,
      nomAdresseChantier,
      clientContact,
      adresse,
      dateDebut,
      dateFin,
      priorite = 'MOYENNE',
      budgetEstime,
      notes,
      enterpriseId,
      serviceId
    } = req.body;

    if (!titre || !clientNom || !adresse || !dateDebut) {
      return res.status(400).json({
        success: false,
        error: 'Les champs titre, clientNom, adresse et dateDebut sont requis'
      });
    }

    if (priorite && !VALID_PRIORITIES.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: `La priorité doit être l'une des suivantes: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const numeroMission = await getNextMissionNumber();

    const mission = await prisma.mission.create({
      data: {
        numeroMission,
        titre,
        description,
        crmClientId: clientId || null,
        crmAdresseId: adresseId || null,
        enterpriseId: parseScopedInteger(enterpriseId) ?? parseScopedInteger(req.user?.enterpriseId),
        serviceId: parseScopedInteger(serviceId) ?? parseScopedInteger(req.user?.serviceId),
        clientNom,
        nomAdresseChantier,
        clientContact,
        adresse,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        priorite,
        budgetEstime,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in create mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la mission'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      clientId,
      adresseId,
      clientNom,
      nomAdresseChantier,
      clientContact,
      adresse,
      dateDebut,
      dateFin,
      priorite,
      budgetEstime,
      notes,
      enterpriseId,
      serviceId,
      status,
    } = req.body;

    const missionExist = await getMissionWithInterventionState(id);

    if (!missionExist) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(missionExist)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier une mission ayant une intervention terminée'
      });
    }

    if (priorite && !VALID_PRIORITIES.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: `La priorité doit être l'une des suivantes: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'une des suivantes: ${VALID_STATUSES.join(', ')}`
      });
    }

    const mission = await prisma.mission.update({
      where: { id },
      data: {
        titre,
        description,
        crmClientId: clientId || undefined,
        crmAdresseId: adresseId || undefined,
        enterpriseId: Object.prototype.hasOwnProperty.call(req.body, 'enterpriseId')
          ? parseScopedInteger(enterpriseId)
          : undefined,
        serviceId: Object.prototype.hasOwnProperty.call(req.body, 'serviceId')
          ? parseScopedInteger(serviceId)
          : undefined,
        clientNom,
        nomAdresseChantier,
        clientContact,
        adresse,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : null,
        priorite,
        budgetEstime,
        notes,
        status,
      },
      include: {
        interventions: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            interventions: true,
            techniciens: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Mission mise à jour avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in update mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la mission'
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

    const missionExist = await getMissionWithInterventionState(id);

    if (!missionExist) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(missionExist)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier le statut d\'une mission ayant une intervention terminée'
      });
    }

    const mission = await prisma.mission.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      message: 'Statut de la mission mis à jour avec succès',
      data: mission
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }
    console.error('Error in updateStatus mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    const mission = await getMissionWithInterventionState(id);

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(mission) && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une mission ayant une intervention terminée'
      });
    }

    if (missionHasInterventions(mission) && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une mission qui contient déjà des interventions'
      });
    }

    await prisma.$transaction(async (tx) => {
      if (forceDelete && missionHasInterventions(mission)) {
        const interventionIds = mission.interventions.map((intervention) => intervention.id);

        if (interventionIds.length > 0) {
          await tx.rapport.deleteMany({
            where: {
              interventionId: { in: interventionIds }
            }
          });
        }
      }

      await tx.mission.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Mission supprimée avec succès'
    });
  } catch (error) {
    console.error('Error in delete mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la mission'
    });
  }
};
