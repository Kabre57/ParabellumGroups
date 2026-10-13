const { prisma, VALID_STATUSES } = require('./shared');

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

/**
 * Récupère une intervention par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id },
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
            dateDebut: true,
            dateFin: true,
            description: true,
            status: true,
            priorite: true,
          }
        },
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
        },
        rapports: {
          include: {
            redacteur: {
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
            materielUtilise: true,
            techniciens: true
          }
        }
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Intervention récupérée avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in getById intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'intervention'
    });
  }
};
