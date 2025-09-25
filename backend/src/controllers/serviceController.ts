import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getServices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            employees: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { services }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getServiceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        customers: {
          select: {
            id: true,
            name: true,
            customerNumber: true,
            isActive: true
          }
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            isActive: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    // Vérifier que le nom n'existe pas déjà
    const existingService = await prisma.service.findUnique({
      where: { name }
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom de service existe déjà'
      });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description
      },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            employees: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: service,
      message: 'Service créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateService = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingService = await prisma.service.findUnique({
      where: { id: Number(id) }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    const { name, description } = req.body;

    // Vérifier que le nom n'existe pas déjà (sauf pour ce service)
    if (name !== existingService.name) {
      const nameExists = await prisma.service.findUnique({
        where: { name }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom de service existe déjà'
        });
      }
    }

    const service = await prisma.service.update({
      where: { id: Number(id) },
      data: {
        name,
        description
      },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            employees: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: service,
      message: 'Service mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingService = await prisma.service.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            employees: true
          }
        }
      }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    // Vérifier s'il y a des données associées
    const hasData = existingService._count.users > 0 || 
                   existingService._count.customers > 0 || 
                   existingService._count.employees > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un service ayant des utilisateurs, clients ou employés associés'
      });
    }

    await prisma.service.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Service supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateService = [
  body('name').notEmpty().withMessage('Nom du service requis'),
  body('description').optional().isString().withMessage('Description invalide')
];