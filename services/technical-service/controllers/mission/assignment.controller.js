// Affectation des techniciens aux missions.
const { prisma, getMissionWithInterventionState, missionHasCompletedIntervention } = require('./shared');

exports.assignTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    const mission = await getMissionWithInterventionState(id);

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    if (missionHasCompletedIntervention(mission)) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de modifier une mission ayant une intervention terminée'
      });
    }

    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    const assignment = await prisma.missionTechnicien.create({
      data: {
        missionId: id,
        technicienId,
        role
      },
      include: {
        technicien: {
          include: {
            specialite: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Technicien assigné à la mission avec succès',
      data: assignment
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette mission'
      });
    }
    console.error('Error in assignTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation du technicien'
    });
  }
};
