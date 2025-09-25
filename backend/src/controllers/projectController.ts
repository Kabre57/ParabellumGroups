import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      customerId,
      serviceId,
      startDate,
      endDate,
      budget,
      priority
    } = req.body;

    // Vérifier que le client existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // Vérifier que le service existe
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }
    }

    const project = await prisma.clientProject.create({
      data: {
        name,
        description,
        customerId,
        serviceId: serviceId || req.user!.serviceId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget,
        priority: priority || 'medium',
        createdBy: req.user!.userId
      },
      include: {
        customer: true,
        service: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Projet créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, customerId, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.serviceId = req.user!.serviceId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (customerId) {
      whereClause.customerId = Number(customerId);
    }

    if (status) {
      whereClause.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.clientProject.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              customerNumber: true
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          documents: true,
          _count: {
            select: {
              tasks: true,
              documents: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clientProject.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.clientProject.findUnique({
      where: { id: Number(id) },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerNumber: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            timeEntries: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        project.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce projet'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingProject = await prisma.clientProject.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        existingProject.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce projet'
      });
    }

    const {
      name,
      description,
      customerId,
      serviceId,
      startDate,
      endDate,
      budget,
      status,
      priority
    } = req.body;

    const project = await prisma.clientProject.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        customerId,
        serviceId: ['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) ? serviceId : existingProject.serviceId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budget,
        status,
        priority
      },
      include: {
        customer: true,
        service: true,
        tasks: true
      }
    });

    res.json({
      success: true,
      data: project,
      message: 'Projet mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingProject = await prisma.clientProject.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            tasks: true,
            documents: true
          }
        }
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        existingProject.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce projet'
      });
    }

    // Vérifier s'il y a des tâches ou documents associés
    if (existingProject._count.tasks > 0 || existingProject._count.documents > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un projet avec des tâches ou documents associés'
      });
    }

    await prisma.clientProject.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateProject = [
  body('name').notEmpty().withMessage('Nom du projet requis'),
  body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
  body('startDate').isISO8601().withMessage('Date de début invalide'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget invalide')
];