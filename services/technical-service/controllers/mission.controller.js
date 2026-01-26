const { PrismaClient } = require('@prisma/client');
const { getNextMissionNumber } = require('../utils/missionNumberGenerator');
const prisma = new PrismaClient();

const VALID_STATUSES = ['PLANIFIEE', 'EN_COURS', 'SUSPENDUE', 'TERMINEE', 'ANNULEE'];
const VALID_PRIORITIES = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priorite, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
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

exports.create = async (req, res) => {
  try {
    const {
      titre,
      description,
      clientNom,
      clientContact,
      adresse,
      dateDebut,
      dateFin,
      priorite = 'MOYENNE',
      budgetEstime,
      notes
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
        clientNom,
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

    const mission = await prisma.mission.findUnique({
      where: { id }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
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

exports.getStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      prisma.mission.count({ where: { status: 'PLANIFIEE' } }),
      prisma.mission.count({ where: { status: 'EN_COURS' } }),
      prisma.mission.count({ where: { status: 'TERMINEE' } }),
      prisma.mission.count({ where: { status: 'ANNULEE' } }),
      prisma.mission.count()
    ]);

    res.json({
      success: true,
      message: 'Statistiques des missions récupérées avec succès',
      data: {
        planifiees: stats[0],
        enCours: stats[1],
        terminees: stats[2],
        annulees: stats[3],
        total: stats[4]
      }
    });
  } catch (error) {
    console.error('Error in getStats missions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
