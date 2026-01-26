const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['BROUILLON', 'SOUMIS', 'VALIDE', 'REJETE'];

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

exports.create = async (req, res) => {
  try {
    const { interventionId, titre, contenu, conclusions, recommandations } = req.body;
    const redacteurId = req.headers['x-user-id'];

    if (!interventionId || !titre || !contenu) {
      return res.status(400).json({
        success: false,
        error: 'Les champs interventionId, titre et contenu sont requis'
      });
    }

    if (!redacteurId) {
      return res.status(400).json({
        success: false,
        error: 'ID du rédacteur manquant (X-User-Id header)'
      });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    const rapport = await prisma.rapport.create({
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
