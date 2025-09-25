import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
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
      employeeId,
      reviewDate,
      periodStart,
      periodEnd,
      type,
      overallScore,
      strengths,
      areasToImprove,
      goals,
      comments,
      criteria
    } = req.body;

    // Vérifier que l'employé existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    const review = await prisma.performanceReview.create({
      data: {
        employeeId,
        reviewerId: req.user!.userId,
        reviewDate: new Date(reviewDate),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        type,
        overallScore,
        strengths,
        areasToImprove,
        goals,
        comments,
        criteria: {
          create: criteria.map((criterion: any) => ({
            criteria: criterion.criteria,
            description: criterion.description,
            weight: criterion.weight,
            score: criterion.score,
            comments: criterion.comments
          }))
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        criteria: true
      }
    });

    res.status(201).json({
      success: true,
      data: review,
      message: 'Évaluation de performance créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllReviews = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, employeeId, type, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (employeeId) {
      whereClause.employeeId = Number(employeeId);
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true
            }
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          criteria: true
        },
        skip: offset,
        take: Number(limit),
        orderBy: { reviewDate: 'desc' }
      }),
      prisma.performanceReview.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des évaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getReviewById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const review = await prisma.performanceReview.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        criteria: true
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingReview = await prisma.performanceReview.findUnique({
      where: { id: Number(id) }
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    const {
      overallScore,
      strengths,
      areasToImprove,
      goals,
      comments,
      employeeComments,
      status
    } = req.body;

    const review = await prisma.performanceReview.update({
      where: { id: Number(id) },
      data: {
        overallScore,
        strengths,
        areasToImprove,
        goals,
        comments,
        employeeComments,
        status
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        criteria: true
      }
    });

    res.json({
      success: true,
      data: review,
      message: 'Évaluation mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingReview = await prisma.performanceReview.findUnique({
      where: { id: Number(id) }
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    await prisma.performanceReview.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Évaluation supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateReview = [
  body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
  body('reviewDate').isISO8601().withMessage('Date d\'évaluation invalide'),
  body('periodStart').isISO8601().withMessage('Date de début de période invalide'),
  body('periodEnd').isISO8601().withMessage('Date de fin de période invalide'),
  body('type').isIn(['ANNUAL', 'PROBATION', 'PROMOTION', 'PROJECT']).withMessage('Type d\'évaluation invalide')
];