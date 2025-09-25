import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where: whereClause,
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { category: 'asc' }
      }),
      prisma.permission.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        permissions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getPermissionById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: Number(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, description, category } = req.body;

    // Vérifier que la permission n'existe pas déjà
    const existingPermission = await prisma.permission.findUnique({
      where: { name }
    });

    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Cette permission existe déjà'
      });
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        description,
        category
      },
      include: {
        rolePermissions: true
      }
    });

    res.status(201).json({
      success: true,
      data: permission,
      message: 'Permission créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updatePermission = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingPermission = await prisma.permission.findUnique({
      where: { id: Number(id) }
    });

    if (!existingPermission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    const { description, category } = req.body;

    const permission = await prisma.permission.update({
      where: { id: Number(id) },
      data: {
        description,
        category
      },
      include: {
        rolePermissions: true
      }
    });

    res.json({
      success: true,
      data: permission,
      message: 'Permission mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deletePermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingPermission = await prisma.permission.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    });

    if (!existingPermission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    // Vérifier s'il y a des rôles associés
    if (existingPermission._count.rolePermissions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une permission associée à des rôles'
      });
    }

    await prisma.permission.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Permission supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validatePermission = [
  body('name').notEmpty().withMessage('Nom de permission requis'),
  body('category').notEmpty().withMessage('Catégorie requise')
];