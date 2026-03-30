const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateProjetNumber } = require('../utils/projetNumberGenerator');

const prisma = new PrismaClient();

const projectStatusMap = {
  PLANIFIE: 'PLANNING',
  EN_COURS: 'ACTIVE',
  SUSPENDU: 'ON_HOLD',
  TERMINE: 'COMPLETED',
  ANNULE: 'CANCELLED',
};

const serializeProjet = (projet) => ({
  id: projet.id,
  projectNumber: projet.numeroProjet,
  numeroProjet: projet.numeroProjet,
  name: projet.nom,
  nom: projet.nom,
  description: projet.description,
  customerId: projet.clientId,
  clientId: projet.clientId,
  status: projectStatusMap[projet.status] || projet.status,
  rawStatus: projet.status,
  startDate: projet.dateDebut,
  endDate: projet.dateFin,
  budget: projet.budget != null ? Number(projet.budget) : 0,
  spent: projet.coutReel != null ? Number(projet.coutReel) : 0,
  currency: 'XOF',
  priority: projet.priorite,
  managerId: '',
  completion: Array.isArray(projet.taches) && projet.taches.length > 0
    ? Math.round(
        (projet.taches.filter((tache) => tache.status === 'TERMINEE').length / projet.taches.length) * 100
      )
    : 0,
  tasksCount: Array.isArray(projet.taches) ? projet.taches.length : 0,
  milestonesCount: Array.isArray(projet.jalons) ? projet.jalons.length : 0,
  createdAt: projet.createdAt,
  updatedAt: projet.updatedAt,
});

/**
 * Créer un nouveau projet
 */
const createProjet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, description, clientId, dateDebut, dateFin, budget, status, priorite } = req.body;

    const numeroProjet = await generateProjetNumber(prisma);

    const projet = await prisma.projet.create({
      data: {
        numeroProjet,
        nom,
        description,
        clientId,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        budget: budget ? parseFloat(budget) : null,
        status: status || 'PLANIFIE',
        priorite: priorite || 'MOYENNE'
      },
      include: {
        taches: true,
        jalons: true
      }
    });

    res.status(201).json({
      success: true,
      data: serializeProjet(projet),
      message: 'Projet créé avec succès',
    });
  } catch (error) {
    console.error('Erreur création projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du projet' });
  }
};

/**
 * Récupérer tous les projets avec filtres
 */
const getAllProjets = async (req, res) => {
  try {
    const {
      status,
      clientId,
      customerId,
      priorite,
      search,
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    const where = {};
    if (status) {
      const requestedStatus = Object.entries(projectStatusMap).find(([, frontendStatus]) => frontendStatus === status);
      where.status = requestedStatus?.[0] || status;
    }
    if (clientId || customerId) where.clientId = clientId || customerId;
    if (priorite) where.priorite = priorite;
    if (search) {
      where.OR = [
        { nom: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { numeroProjet: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortableFields = new Set(['createdAt', 'updatedAt', 'dateDebut', 'dateFin', 'budget', 'coutReel']);
    const orderField = sortableFields.has(String(sortBy)) ? String(sortBy) : 'updatedAt';
    const direction = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [projets, total] = await Promise.all([
      prisma.projet.findMany({
        where,
        include: {
          taches: {
            select: {
              id: true,
              titre: true,
              status: true
            }
          },
          jalons: {
            select: {
              id: true,
              nom: true,
              status: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { [orderField]: direction }
      }),
      prisma.projet.count({ where })
    ]);

    res.json({
      success: true,
      data: projets.map(serializeProjet),
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
    console.error('Erreur récupération projets:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des projets' });
  }
};

/**
 * Récupérer un projet par ID
 */
const getProjetById = async (req, res) => {
  try {
    const { id } = req.params;

    const projet = await prisma.projet.findUnique({
      where: { id },
      include: {
        taches: {
          include: {
            assignations: true
          }
        },
        jalons: true
      }
    });

    if (!projet) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json({
      success: true,
      data: serializeProjet(projet),
    });
  } catch (error) {
    console.error('Erreur récupération projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du projet' });
  }
};

/**
 * Mettre à jour un projet
 */
const updateProjet = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, dateDebut, dateFin, budget, coutReel, status, priorite } = req.body;

    const updateData = {};
    if (nom) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    if (dateDebut) updateData.dateDebut = new Date(dateDebut);
    if (dateFin !== undefined) updateData.dateFin = dateFin ? new Date(dateFin) : null;
    if (budget !== undefined) updateData.budget = budget ? parseFloat(budget) : null;
    if (coutReel !== undefined) updateData.coutReel = coutReel ? parseFloat(coutReel) : null;
    if (status) updateData.status = status;
    if (priorite) updateData.priorite = priorite;

    const projet = await prisma.projet.update({
      where: { id },
      data: updateData,
      include: {
        taches: true,
        jalons: true
      }
    });

    res.json({
      success: true,
      data: serializeProjet(projet),
      message: 'Projet mis à jour avec succès',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    console.error('Erreur mise à jour projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du projet' });
  }
};

/**
 * Supprimer un projet
 */
const deleteProjet = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.projet.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Projet supprimé avec succès' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    console.error('Erreur suppression projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du projet' });
  }
};

/**
 * Obtenir les statistiques globales des projets
 */
const getGlobalProjetStats = async (_req, res) => {
  try {
    const projets = await prisma.projet.findMany({
      include: {
        taches: true,
      },
    });

    const totalProjects = projets.length;
    const projectsEnCours = projets.filter((projet) => projet.status === 'EN_COURS').length;
    const projectsTermines = projets.filter((projet) => projet.status === 'TERMINE').length;
    const budgetTotal = projets.reduce((sum, projet) => sum + Number(projet.budget || 0), 0);
    const budgetConsomme = projets.reduce((sum, projet) => sum + Number(projet.coutReel || 0), 0);
    const totalTasks = projets.reduce((sum, projet) => sum + projet.taches.length, 0);
    const completedTasks = projets.reduce(
      (sum, projet) => sum + projet.taches.filter((tache) => tache.status === 'TERMINEE').length,
      0
    );

    res.json({
      success: true,
      data: {
        totalProjects,
        projectsEnCours,
        projectsTermines,
        budgetTotal,
        budgetConsomme,
        tauxCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Erreur récupération stats globales projets:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques globales' });
  }
};

/**
 * Obtenir les statistiques d'un projet
 */
const getProjetStats = async (req, res) => {
  try {
    const { id } = req.params;

    const projet = await prisma.projet.findUnique({
      where: { id },
      include: {
        taches: true,
        jalons: true
      }
    });

    if (!projet) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const tachesStats = {
      total: projet.taches.length,
      aFaire: projet.taches.filter(t => t.status === 'A_FAIRE').length,
      enCours: projet.taches.filter(t => t.status === 'EN_COURS').length,
      terminees: projet.taches.filter(t => t.status === 'TERMINEE').length,
      bloquees: projet.taches.filter(t => t.status === 'BLOQUEE').length
    };

    const jalonsStats = {
      total: projet.jalons.length,
      planifies: projet.jalons.filter(j => j.status === 'PLANIFIE').length,
      atteints: projet.jalons.filter(j => j.status === 'ATTEINT').length,
      manques: projet.jalons.filter(j => j.status === 'MANQUE').length
    };

    const dureeEstimeeTotal = projet.taches.reduce((sum, t) => sum + (t.dureeEstimee || 0), 0);
    const dureeReelleTotal = projet.taches.reduce((sum, t) => sum + (t.dureeReelle || 0), 0);

    const stats = {
      projet: {
        id: projet.id,
        numeroProjet: projet.numeroProjet,
        nom: projet.nom,
        status: projet.status,
        budget: projet.budget,
        coutReel: projet.coutReel
      },
      taches: tachesStats,
      jalons: jalonsStats,
      durees: {
        estimee: dureeEstimeeTotal,
        reelle: dureeReelleTotal
      },
      progression: {
        pourcentage: tachesStats.total > 0 
          ? Math.round((tachesStats.terminees / tachesStats.total) * 100) 
          : 0
      }
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Erreur récupération stats projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
  }
};

module.exports = {
  createProjet,
  getAllProjets,
  getProjetById,
  updateProjet,
  deleteProjet,
  getProjetStats,
  getGlobalProjetStats
};
