import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createTechnicienIntervention = async (req: AuthenticatedRequest, res: Response) => {
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
      technicienId,
      interventionId,
      role,
      commentaire
    } = req.body;

    // Vérifier que le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        message: 'Technicien non trouvé'
      });
    }

    // Vérifier que l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    const technicienIntervention = await prisma.technicienIntervention.create({
      data: {
        technicienId,
        interventionId,
        role: role || 'assistant',
        commentaire
      },
      include: {
        technicien: {
          include: {
            specialite: true
          }
        },
        intervention: {
          include: {
            mission: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: technicienIntervention,
      message: 'Technicien assigné à l\'intervention avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getTechniciensByIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { interventionId } = req.params;

    const techniciens = await prisma.technicienIntervention.findMany({
      where: { interventionId: Number(interventionId) },
      include: {
        technicien: {
          include: {
            specialite: true,
            utilisateur: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: techniciens
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des techniciens:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getInterventionsByTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { technicienId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [interventions, total] = await Promise.all([
      prisma.technicienIntervention.findMany({
        where: { technicienId: Number(technicienId) },
        include: {
          intervention: {
            include: {
              mission: {
                include: {
                  client: true
                }
              }
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.technicienIntervention.count({ 
        where: { technicienId: Number(technicienId) } 
      })
    ]);

    res.json({
      success: true,
      data: {
        interventions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des interventions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateTechnicienIntervention = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingAssignment = await prisma.technicienIntervention.findUnique({
      where: { id: Number(id) }
    });

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignation non trouvée'
      });
    }

    const { role, commentaire } = req.body;

    const technicienIntervention = await prisma.technicienIntervention.update({
      where: { id: Number(id) },
      data: {
        role,
        commentaire
      },
      include: {
        technicien: {
          include: {
            specialite: true
          }
        },
        intervention: {
          include: {
            mission: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: technicienIntervention,
      message: 'Assignation mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'assignation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteTechnicienIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingAssignment = await prisma.technicienIntervention.findUnique({
      where: { id: Number(id) }
    });

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignation non trouvée'
      });
    }

    await prisma.technicienIntervention.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Assignation supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'assignation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateTechnicienIntervention = [
  body('technicienId').isInt({ min: 1 }).withMessage('Technicien requis'),
  body('interventionId').isInt({ min: 1 }).withMessage('Intervention requise'),
  body('role').optional().isIn(['chef', 'assistant']).withMessage('Rôle invalide')
];