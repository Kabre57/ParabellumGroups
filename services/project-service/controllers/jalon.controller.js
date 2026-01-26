const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Créer un nouveau jalon
 */
const createJalon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projetId, nom, description, dateEcheance, status } = req.body;

    const jalon = await prisma.jalon.create({
      data: {
        projetId,
        nom,
        description,
        dateEcheance: new Date(dateEcheance),
        status: status || 'PLANIFIE'
      },
      include: {
        projet: {
          select: {
            id: true,
            numeroProjet: true,
            nom: true
          }
        }
      }
    });

    res.status(201).json(jalon);
  } catch (error) {
    console.error('Erreur création jalon:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du jalon' });
  }
};

/**
 * Récupérer tous les jalons avec filtres
 */
const getAllJalons = async (req, res) => {
  try {
    const { projetId, status, page = 1, limit = 10 } = req.query;

    const where = {};
    if (projetId) where.projetId = projetId;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jalons, total] = await Promise.all([
      prisma.jalon.findMany({
        where,
        include: {
          projet: {
            select: {
              id: true,
              numeroProjet: true,
              nom: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { dateEcheance: 'asc' }
      }),
      prisma.jalon.count({ where })
    ]);

    res.json({
      jalons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur récupération jalons:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des jalons' });
  }
};

/**
 * Récupérer un jalon par ID
 */
const getJalonById = async (req, res) => {
  try {
    const { id } = req.params;

    const jalon = await prisma.jalon.findUnique({
      where: { id },
      include: {
        projet: true
      }
    });

    if (!jalon) {
      return res.status(404).json({ error: 'Jalon non trouvé' });
    }

    res.json(jalon);
  } catch (error) {
    console.error('Erreur récupération jalon:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du jalon' });
  }
};

/**
 * Mettre à jour un jalon
 */
const updateJalon = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, dateEcheance, status } = req.body;

    const updateData = {};
    if (nom) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    if (dateEcheance) updateData.dateEcheance = new Date(dateEcheance);
    if (status) updateData.status = status;

    const jalon = await prisma.jalon.update({
      where: { id },
      data: updateData,
      include: {
        projet: true
      }
    });

    res.json(jalon);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Jalon non trouvé' });
    }
    console.error('Erreur mise à jour jalon:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du jalon' });
  }
};

/**
 * Supprimer un jalon
 */
const deleteJalon = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.jalon.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Jalon non trouvé' });
    }
    console.error('Erreur suppression jalon:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du jalon' });
  }
};

/**
 * Mettre à jour le statut d'un jalon
 */
const updateJalonStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PLANIFIE', 'ATTEINT', 'MANQUE'].includes(status)) {
      return res.status(400).json({ error: 'Status invalide. Valeurs acceptées: PLANIFIE, ATTEINT, MANQUE' });
    }

    const jalon = await prisma.jalon.update({
      where: { id },
      data: { status },
      include: {
        projet: true
      }
    });

    res.json(jalon);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Jalon non trouvé' });
    }
    console.error('Erreur mise à jour statut jalon:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du statut' });
  }
};

module.exports = {
  createJalon,
  getAllJalons,
  getJalonById,
  updateJalon,
  deleteJalon,
  updateJalonStatus
};
