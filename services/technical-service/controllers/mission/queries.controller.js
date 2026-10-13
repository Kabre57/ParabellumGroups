// Lecture et recherche des missions.
const { prisma, VALID_STATUSES, VALID_PRIORITIES, buildMissionScopeWhere } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priorite, search, enterpriseId, serviceId } = req.query;
    const skip = (page - 1) * limit;

    const where = buildMissionScopeWhere(req, enterpriseId, serviceId);
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (priorite && VALID_PRIORITIES.includes(priorite)) {
      where.priorite = priorite;
    }
    if (search) {
      where.OR = [
        { numeroMission: { contains: search, mode: 'insensitive' } },
        { titre: { contains: search, mode: 'insensitive' } },
        { clientNom: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
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
          },
          interventions: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              interventions: true,
              techniciens: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mission.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Missions récupérées avec succès',
      data: missions,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll missions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des missions'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true
              }
            }
          }
        },
        interventions: {
          include: {
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
        }
      }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Mission récupérée avec succès',
      data: mission
    });
  } catch (error) {
    console.error('Error in getById mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la mission'
    });
  }
};
