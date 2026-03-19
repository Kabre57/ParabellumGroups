const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { isForceDelete } = require('../utils/authz');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [specialites, total] = await Promise.all([
      prisma.specialite.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          _count: {
            select: { techniciens: true }
          }
        },
        orderBy: { nom: 'asc' }
      }),
      prisma.specialite.count()
    ]);

    res.json({
      success: true,
      message: 'Spécialités récupérées avec succès',
      data: specialites,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll specialites:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des spécialités'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de la spécialité est requis'
      });
    }

    const specialite = await prisma.specialite.create({
      data: { nom, description }
    });

    res.status(201).json({
      success: true,
      message: 'Spécialité créée avec succès',
      data: specialite
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Une spécialité avec ce nom existe déjà'
      });
    }
    console.error('Error in create specialite:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la spécialité'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const specialite = await prisma.specialite.findUnique({
      where: { id },
      include: {
        techniciens: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            status: true
          }
        },
        _count: {
          select: { techniciens: true }
        }
      }
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        error: 'Spécialité non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Spécialité récupérée avec succès',
      data: specialite
    });
  } catch (error) {
    console.error('Error in getById specialite:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la spécialité'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description } = req.body;

    const specialite = await prisma.specialite.update({
      where: { id },
      data: { nom, description }
    });

    res.json({
      success: true,
      message: 'Spécialité mise à jour avec succès',
      data: specialite
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Spécialité non trouvée'
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Une spécialité avec ce nom existe déjà'
      });
    }
    console.error('Error in update specialite:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la spécialité'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    const specialite = await prisma.specialite.findUnique({
      where: { id },
      include: {
        _count: {
          select: { techniciens: true }
        }
      }
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        error: 'Spécialité non trouvée'
      });
    }

    if ((specialite._count?.techniciens || 0) > 0 && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une spécialité déjà affectée à un ou plusieurs techniciens'
      });
    }

    if ((specialite._count?.techniciens || 0) > 0 && forceDelete) {
      const fallback = await prisma.specialite.create({
        data: {
          nom:
            specialite.nom === 'Spécialité non assignée'
              ? `Spécialité non assignée ${Date.now()}`
              : 'Spécialité non assignée',
          description: 'Spécialité de réaffectation automatique après suppression administrateur'
        }
      });

      await prisma.technicien.updateMany({
        where: { specialiteId: id },
        data: { specialiteId: fallback.id }
      });
    }

    await prisma.specialite.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Spécialité supprimée avec succès'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Spécialité non trouvée'
      });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer une spécialité encore utilisée'
      });
    }
    console.error('Error in delete specialite:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la spécialité'
    });
  }
};
