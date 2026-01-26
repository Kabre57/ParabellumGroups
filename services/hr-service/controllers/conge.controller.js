const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Get all leaves with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, employeId, status, typeConge } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (employeId) {
      where.employeId = employeId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (typeConge) {
      where.typeConge = typeConge;
    }

    const [conges, total] = await Promise.all([
      prisma.conge.findMany({
        where,
        skip,
        take,
        include: {
          employe: {
            select: {
              matricule: true,
              nom: true,
              prenom: true,
              departement: true
            }
          },
          approbateur: {
            select: {
              nom: true,
              prenom: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.conge.count({ where })
    ]);

    res.json({
      data: conges,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des congés' });
  }
};

// Create leave request
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeId, typeConge, dateDebut, dateFin, nbJours, motif } = req.body;

    const conge = await prisma.conge.create({
      data: {
        employeId,
        typeConge,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        nbJours,
        motif,
        status: 'DEMANDE'
      },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.status(201).json(conge);
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la demande de congé' });
  }
};

// Get leave by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const conge = await prisma.conge.findUnique({
      where: { id },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true,
            email: true
          }
        },
        approbateur: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    if (!conge) {
      return res.status(404).json({ error: 'Congé non trouvé' });
    }

    res.json(conge);
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du congé' });
  }
};

// Update leave
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { typeConge, dateDebut, dateFin, nbJours, motif } = req.body;

    const conge = await prisma.conge.update({
      where: { id },
      data: {
        typeConge,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        nbJours,
        motif
      },
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.json(conge);
  } catch (error) {
    console.error('Error updating leave:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Congé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du congé' });
  }
};

// Delete leave
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.conge.delete({
      where: { id }
    });

    res.json({ message: 'Congé supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Congé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du congé' });
  }
};

// Approve leave
exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const approbateurId = req.userId;

    const conge = await prisma.conge.update({
      where: { id },
      data: {
        status: 'APPROUVE',
        approbateurId,
        dateApprobation: new Date()
      },
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true
          }
        },
        approbateur: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.json(conge);
  } catch (error) {
    console.error('Error approving leave:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Congé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'approbation du congé' });
  }
};

// Reject leave
exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const approbateurId = req.userId;

    const conge = await prisma.conge.update({
      where: { id },
      data: {
        status: 'REJETE',
        approbateurId,
        dateApprobation: new Date()
      },
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true
          }
        },
        approbateur: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.json(conge);
  } catch (error) {
    console.error('Error rejecting leave:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Congé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors du rejet du congé' });
  }
};

// Get leave balance for employee
exports.getSoldeConge = async (req, res) => {
  try {
    const { employeId } = req.params;
    const { annee = new Date().getFullYear() } = req.query;

    const startDate = new Date(`${annee}-01-01`);
    const endDate = new Date(`${annee}-12-31`);

    const conges = await prisma.conge.findMany({
      where: {
        employeId,
        status: 'APPROUVE',
        dateDebut: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalByType = conges.reduce((acc, conge) => {
      acc[conge.typeConge] = (acc[conge.typeConge] || 0) + conge.nbJours;
      return acc;
    }, {});

    const congesAnnuelsUtilises = totalByType.ANNUEL || 0;
    const congesAnnuelsRestants = 25 - congesAnnuelsUtilises; // 25 jours par an standard

    res.json({
      annee: parseInt(annee),
      congesAnnuels: {
        total: 25,
        utilises: congesAnnuelsUtilises,
        restants: Math.max(0, congesAnnuelsRestants)
      },
      detailsParType: totalByType,
      totalJoursUtilises: Object.values(totalByType).reduce((sum, val) => sum + val, 0)
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du solde de congés' });
  }
};

// Get leave calendar
exports.getCalendrier = async (req, res) => {
  try {
    const { mois, annee = new Date().getFullYear() } = req.query;

    const where = {
      status: 'APPROUVE'
    };

    if (mois && annee) {
      const startDate = new Date(`${annee}-${String(mois).padStart(2, '0')}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      where.OR = [
        {
          dateDebut: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          dateFin: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          AND: [
            { dateDebut: { lte: startDate } },
            { dateFin: { gte: endDate } }
          ]
        }
      ];
    }

    const conges = await prisma.conge.findMany({
      where,
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true
          }
        }
      },
      orderBy: { dateDebut: 'asc' }
    });

    res.json({ data: conges, total: conges.length });
  } catch (error) {
    console.error('Error fetching leave calendar:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du calendrier des congés' });
  }
};
