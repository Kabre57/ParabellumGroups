// Consultation et recherche des rapports techniques.
const { prisma, VALID_STATUSES } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, interventionId, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (interventionId) {
      where.interventionId = interventionId;
    }
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [rapports, total] = await Promise.all([
      prisma.rapport.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
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
              prenom: true,
              email: true
            }
          }
        },
        orderBy: { dateCreation: 'desc' }
      }),
      prisma.rapport.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Rapports récupérés avec succès',
      data: rapports,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll rapports:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des rapports'
    });
  }
};

/**
 * Récupère un rapport par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapport.findUnique({
      where: { id },
      include: {
        intervention: {
          include: {
            mission: {
              select: {
                id: true,
                numeroMission: true,
                titre: true,
                clientNom: true,
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
                    prenom: true,
                    email: true,
                    telephone: true,
                    matricule: true
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
        },
        redacteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            matricule: true,
            competences: true,
            specialite: {
              select: {
                nom: true
              }
            }
          }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Rapport récupéré avec succès',
      data: rapport
    });
  } catch (error) {
    console.error('Error in getById rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du rapport'
    });
  }
};
