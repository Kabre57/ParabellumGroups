const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, missionId, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (missionId) {
      where.missionId = missionId;
    }
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
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
          },
          _count: {
            select: {
              rapports: true,
              materielUtilise: true
            }
          }
        },
        orderBy: { dateDebut: 'desc' }
      }),
      prisma.intervention.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Interventions récupérées avec succès',
      data: interventions,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll interventions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des interventions'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      missionId,
      titre,
      description,
      dateDebut,
      dureeEstimee,
      technicienIds
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

    const intervention = await prisma.intervention.create({
      data: {
        missionId,
        titre,
        description,
        dateDebut: new Date(dateDebut),
        dureeEstimee,
        techniciens: technicienIds ? {
          create: technicienIds.map(technicienId => ({
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

    res.status(201).json({
      success: true,
      message: 'Intervention créée avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in create intervention:', error);
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
