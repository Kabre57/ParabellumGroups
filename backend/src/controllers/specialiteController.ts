import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getSpecialites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { libelle: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const specialites = await prisma.specialite.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            techniciens: true
          }
        }
      },
      orderBy: { libelle: 'asc' }
    });

    res.json({
      success: true,
      data: { specialites }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des spécialités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getSpecialiteById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const specialite = await prisma.specialite.findUnique({
      where: { id: Number(id) },
      include: {
        techniciens: {
          include: {
            utilisateur: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité non trouvée'
      });
    }

    res.json({
      success: true,
      data: specialite
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la spécialité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createSpecialite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { libelle, description } = req.body;

    // Vérifier que le libellé n'existe pas déjà
    const existingSpecialite = await prisma.specialite.findUnique({
      where: { libelle }
    });

    if (existingSpecialite) {
      return res.status(400).json({
        success: false,
        message: 'Cette spécialité existe déjà'
      });
    }

    const specialite = await prisma.specialite.create({
      data: {
        libelle,
        description
      },
      include: {
        _count: {
          select: {
            techniciens: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: specialite,
      message: 'Spécialité créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la spécialité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateSpecialite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingSpecialite = await prisma.specialite.findUnique({
      where: { id: Number(id) }
    });

    if (!existingSpecialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité non trouvée'
      });
    }

    const { libelle, description } = req.body;

    // Vérifier que le libellé n'existe pas déjà (sauf pour cette spécialité)
    if (libelle !== existingSpecialite.libelle) {
      const libelleExists = await prisma.specialite.findUnique({
        where: { libelle }
      });

      if (libelleExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce libellé existe déjà'
        });
      }
    }

    const specialite = await prisma.specialite.update({
      where: { id: Number(id) },
      data: {
        libelle,
        description
      },
      include: {
        _count: {
          select: {
            techniciens: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: specialite,
      message: 'Spécialité mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la spécialité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteSpecialite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingSpecialite = await prisma.specialite.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            techniciens: true
          }
        }
      }
    });

    if (!existingSpecialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité non trouvée'
      });
    }

    // Vérifier s'il y a des techniciens associés
    if (existingSpecialite._count.techniciens > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une spécialité ayant des techniciens associés'
      });
    }

    await prisma.specialite.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Spécialité supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la spécialité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateSpecialite = [
  body('libelle').notEmpty().withMessage('Libellé requis'),
  body('description').optional().isString().withMessage('Description invalide')
];