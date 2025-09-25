import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createUserCalendar = async (req: AuthenticatedRequest, res: Response) => {
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
      userId,
      date,
      workingHours
    } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const userCalendar = await prisma.userCalendar.create({
      data: {
        userId,
        date: new Date(date),
        workingHours: workingHours || 8.0
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        events: true,
        timeOffs: true
      }
    });

    res.status(201).json({
      success: true,
      data: userCalendar,
      message: 'Calendrier utilisateur créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du calendrier utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getUserCalendars = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (userId) {
      whereClause.userId = Number(userId);
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [calendars, total] = await Promise.all([
      prisma.userCalendar.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          events: {
            orderBy: { startTime: 'asc' }
          },
          timeOffs: {
            where: { status: 'APPROVED' }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { date: 'asc' }
      }),
      prisma.userCalendar.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        calendars,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des calendriers utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateUserCalendar = [
  body('userId').isInt({ min: 1 }).withMessage('Utilisateur requis'),
  body('date').isISO8601().withMessage('Date invalide'),
  body('workingHours').optional().isFloat({ min: 0, max: 24 }).withMessage('Heures de travail invalides')
];