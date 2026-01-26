const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Get all evaluations with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, employeId, evaluateurId, periode } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (employeId) {
      where.employeId = employeId;
    }
    
    if (evaluateurId) {
      where.evaluateurId = evaluateurId;
    }
    
    if (periode) {
      where.periode = periode;
    }

    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip,
        take,
        include: {
          employe: {
            select: {
              matricule: true,
              nom: true,
              prenom: true,
              departement: true,
              poste: true
            }
          },
          evaluateur: {
            select: {
              nom: true,
              prenom: true,
              poste: true
            }
          }
        },
        orderBy: { dateEvaluation: 'desc' }
      }),
      prisma.evaluation.count({ where })
    ]);

    res.json({
      data: evaluations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des évaluations' });
  }
};

// Create evaluation
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeId, evaluateurId, dateEvaluation, periode, noteGlobale, competences, commentaires, objectifs } = req.body;

    const evaluation = await prisma.evaluation.create({
      data: {
        employeId,
        evaluateurId,
        dateEvaluation: new Date(dateEvaluation),
        periode,
        noteGlobale,
        competences,
        commentaires,
        objectifs
      },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true
          }
        },
        evaluateur: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.status(201).json(evaluation);
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'évaluation' });
  }
};

// Get evaluation by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true,
            poste: true,
            email: true
          }
        },
        evaluateur: {
          select: {
            nom: true,
            prenom: true,
            poste: true,
            email: true
          }
        }
      }
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }

    res.json(evaluation);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'évaluation' });
  }
};

// Update evaluation
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { dateEvaluation, periode, noteGlobale, competences, commentaires, objectifs } = req.body;

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        dateEvaluation: dateEvaluation ? new Date(dateEvaluation) : undefined,
        periode,
        noteGlobale,
        competences,
        commentaires,
        objectifs
      },
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true
          }
        },
        evaluateur: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.json(evaluation);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'évaluation' });
  }
};

// Delete evaluation
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.evaluation.delete({
      where: { id }
    });

    res.json({ message: 'Évaluation supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'évaluation' });
  }
};

// Get evaluations by employee
exports.getByEmploye = async (req, res) => {
  try {
    const { employeId } = req.params;

    const evaluations = await prisma.evaluation.findMany({
      where: { employeId },
      include: {
        evaluateur: {
          select: {
            nom: true,
            prenom: true,
            poste: true
          }
        }
      },
      orderBy: { dateEvaluation: 'desc' }
    });

    // Calculate average note
    const averageNote = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + parseFloat(e.noteGlobale), 0) / evaluations.length
      : 0;

    res.json({
      data: evaluations,
      total: evaluations.length,
      averageNote: Math.round(averageNote * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching employee evaluations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des évaluations de l\'employé' });
  }
};
