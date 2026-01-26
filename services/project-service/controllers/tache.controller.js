const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Créer une nouvelle tâche
 */
const createTache = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      projetId, 
      titre, 
      description, 
      dateDebut, 
      dateEcheance, 
      dureeEstimee, 
      status, 
      priorite 
    } = req.body;

    const tache = await prisma.tache.create({
      data: {
        projetId,
        titre,
        description,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        dureeEstimee: dureeEstimee ? parseInt(dureeEstimee) : null,
        status: status || 'A_FAIRE',
        priorite: priorite || 'MOYENNE'
      },
      include: {
        projet: {
          select: {
            id: true,
            numeroProjet: true,
            nom: true
          }
        },
        assignations: true
      }
    });

    res.status(201).json(tache);
  } catch (error) {
    console.error('Erreur création tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la tâche' });
  }
};

/**
 * Récupérer toutes les tâches avec filtres
 */
const getAllTaches = async (req, res) => {
  try {
    const { projetId, status, priorite, userId, page = 1, limit = 10 } = req.query;

    const where = {};
    if (projetId) where.projetId = projetId;
    if (status) where.status = status;
    if (priorite) where.priorite = priorite;
    if (userId) {
      where.assignations = {
        some: {
          userId
        }
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [taches, total] = await Promise.all([
      prisma.tache.findMany({
        where,
        include: {
          projet: {
            select: {
              id: true,
              numeroProjet: true,
              nom: true
            }
          },
          assignations: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tache.count({ where })
    ]);

    res.json({
      taches,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des tâches' });
  }
};

/**
 * Récupérer une tâche par ID
 */
const getTacheById = async (req, res) => {
  try {
    const { id } = req.params;

    const tache = await prisma.tache.findUnique({
      where: { id },
      include: {
        projet: true,
        assignations: true
      }
    });

    if (!tache) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(tache);
  } catch (error) {
    console.error('Erreur récupération tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de la tâche' });
  }
};

/**
 * Mettre à jour une tâche
 */
const updateTache = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titre, 
      description, 
      dateDebut, 
      dateEcheance, 
      dureeEstimee, 
      dureeReelle, 
      status, 
      priorite 
    } = req.body;

    const updateData = {};
    if (titre) updateData.titre = titre;
    if (description !== undefined) updateData.description = description;
    if (dateDebut !== undefined) updateData.dateDebut = dateDebut ? new Date(dateDebut) : null;
    if (dateEcheance !== undefined) updateData.dateEcheance = dateEcheance ? new Date(dateEcheance) : null;
    if (dureeEstimee !== undefined) updateData.dureeEstimee = dureeEstimee ? parseInt(dureeEstimee) : null;
    if (dureeReelle !== undefined) updateData.dureeReelle = dureeReelle ? parseInt(dureeReelle) : null;
    if (status) updateData.status = status;
    if (priorite) updateData.priorite = priorite;

    const tache = await prisma.tache.update({
      where: { id },
      data: updateData,
      include: {
        projet: true,
        assignations: true
      }
    });

    res.json(tache);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    console.error('Erreur mise à jour tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la tâche' });
  }
};

/**
 * Supprimer une tâche
 */
const deleteTache = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.tache.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    console.error('Erreur suppression tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la tâche' });
  }
};

/**
 * Assigner un utilisateur à une tâche
 */
const assignTache = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId est requis' });
    }

    const tache = await prisma.tache.findUnique({
      where: { id }
    });

    if (!tache) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    const assignation = await prisma.tacheAssignation.create({
      data: {
        tacheId: id,
        userId,
        role: role || null
      },
      include: {
        tache: {
          include: {
            projet: true
          }
        }
      }
    });

    res.status(201).json(assignation);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Utilisateur déjà assigné à cette tâche' });
    }
    console.error('Erreur assignation tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'assignation de la tâche' });
  }
};

/**
 * Retirer un utilisateur d'une tâche
 */
const unassignTache = async (req, res) => {
  try {
    const { id, userId } = req.params;

    await prisma.tacheAssignation.deleteMany({
      where: {
        tacheId: id,
        userId
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur retrait assignation tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors du retrait de l\'assignation' });
  }
};

/**
 * Marquer une tâche comme terminée
 */
const completeTache = async (req, res) => {
  try {
    const { id } = req.params;
    const { dureeReelle } = req.body;

    const updateData = {
      status: 'TERMINEE'
    };

    if (dureeReelle) {
      updateData.dureeReelle = parseInt(dureeReelle);
    }

    const tache = await prisma.tache.update({
      where: { id },
      data: updateData,
      include: {
        projet: true,
        assignations: true
      }
    });

    res.json(tache);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    console.error('Erreur completion tâche:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la completion de la tâche' });
  }
};

module.exports = {
  createTache,
  getAllTaches,
  getTacheById,
  updateTache,
  deleteTache,
  assignTache,
  unassignTache,
  completeTache
};
