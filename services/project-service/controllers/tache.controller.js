const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const taskStatusMap = {
  A_FAIRE: 'TODO',
  EN_COURS: 'IN_PROGRESS',
  TERMINEE: 'DONE',
  BLOQUEE: 'BLOCKED',
};

const priorityMap = {
  BASSE: 'LOW',
  MOYENNE: 'MEDIUM',
  HAUTE: 'HIGH',
  CRITIQUE: 'URGENT',
};

const serializeTache = (tache) => ({
  id: tache.id,
  projectId: tache.projetId,
  projetId: tache.projetId,
  title: tache.titre,
  titre: tache.titre,
  description: tache.description,
  status: taskStatusMap[tache.status] || tache.status,
  rawStatus: tache.status,
  priority: priorityMap[tache.priorite] || tache.priorite,
  rawPriority: tache.priorite,
  dueDate: tache.dateEcheance,
  dateEcheance: tache.dateEcheance,
  startDate: tache.dateDebut,
  dateDebut: tache.dateDebut,
  estimatedHours: tache.dureeEstimee,
  actualHours: tache.dureeReelle,
  assignedToId: tache.assignations?.[0]?.userId || null,
  assignations: tache.assignations || [],
  project: tache.projet
    ? {
        id: tache.projet.id,
        projectNumber: tache.projet.numeroProjet,
        name: tache.projet.nom,
      }
    : null,
  createdAt: tache.createdAt,
  updatedAt: tache.updatedAt,
});

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

    res.status(201).json({
      success: true,
      data: serializeTache(tache),
      message: 'Tâche créée avec succès',
    });
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
    const { projetId, projectId, status, priority, priorite, userId, assignedToId, page = 1, limit = 10, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (projetId || projectId) where.projetId = projetId || projectId;
    if (status) {
      const requestedStatus = Object.entries(taskStatusMap).find(([, frontendStatus]) => frontendStatus === status);
      where.status = requestedStatus?.[0] || status;
    }
    if (priorite || priority) {
      const requestedPriority = Object.entries(priorityMap).find(([, frontendPriority]) => frontendPriority === (priority || priorite));
      where.priorite = requestedPriority?.[0] || priority || priorite;
    }
    if (userId || assignedToId) {
      where.assignations = {
        some: {
          userId: userId || assignedToId
        }
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortableFields = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      dueDate: 'dateEcheance',
      dateEcheance: 'dateEcheance',
      startDate: 'dateDebut',
      dateDebut: 'dateDebut',
    };
    const orderField = sortableFields[String(sortBy)] || 'updatedAt';
    const direction = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

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
        orderBy: { [orderField]: direction }
      }),
      prisma.tache.count({ where })
    ]);

    res.json({
      success: true,
      data: taches.map(serializeTache),
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
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

    res.json({
      success: true,
      data: serializeTache(tache),
    });
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

    res.json({
      success: true,
      data: serializeTache(tache),
      message: 'Tâche mise à jour avec succès',
    });
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

    res.json({ success: true, message: 'Tâche supprimée avec succès' });
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
