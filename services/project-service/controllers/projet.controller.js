const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateProjetNumber } = require('../utils/projetNumberGenerator');

const prisma = new PrismaClient();

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

    res.status(201).json(projet);
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
    const { status, clientId, priorite, page = 1, limit = 10 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (priorite) where.priorite = priorite;

    const skip = (parseInt(page) - 1) * parseInt(limit);

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
        orderBy: { createdAt: 'desc' }
      }),
      prisma.projet.count({ where })
    ]);

    res.json({
      projets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
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

    res.json(projet);
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

    res.json(projet);
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

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    console.error('Erreur suppression projet:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du projet' });
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

    res.json(stats);
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
  getProjetStats
};
