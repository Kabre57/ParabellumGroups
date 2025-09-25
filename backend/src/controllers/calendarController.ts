import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getCalendarWithTimeOffs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, userId, includeTimeOffs = true } = req.query;

    let whereClause: any = {};

    if (userId) {
      whereClause.calendar = {
        userId: Number(userId)
      };
    }

    if (startDate && endDate) {
      whereClause.OR = [
        {
          startTime: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        {
          endTime: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        }
      ];
    }

    const [events, timeOffs] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          calendar: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      }),
      includeTimeOffs ? prisma.timeOffRequest.findMany({
        where: {
          calendar: userId ? { userId: Number(userId) } : undefined,
          OR: [
            {
              startDate: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
              }
            },
            {
              endDate: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
              }
            }
          ]
        },
        include: {
          calendar: {
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
        }
      }) : []
    ]);

    // Convertir les time offs en evenements calendrier
    const timeOffEvents = timeOffs.map(timeOff => ({
      id: `timeoff-${timeOff.id}`,
      title: `Time Off - ${timeOff.type}`,
      description: timeOff.reason,
      startTime: timeOff.startDate,
      endTime: timeOff.endDate,
      type: 'TIMEOFF',
      priority: timeOff.status === 'APPROVED' ? 'high' : 'medium',
      isAllDay: true,
      location: null,
      reminder: null,
      calendarId: timeOff.calendarId,
      createdBy: null,
      createdAt: timeOff.createdAt,
      updatedAt: timeOff.updatedAt,
      calendar: timeOff.calendar,
      creator: null,
      timeOffData: timeOff,
      isTimeOff: true
    }));

    const allEvents = [...events, ...timeOffEvents];

    res.json({
      success: true,
      data: {
        events: allEvents,
        timeOffs: includeTimeOffs ? timeOffs : []
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recuperation du calendrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
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
      title,
      description,
      startTime,
      endTime,
      type,
      priority,
      isAllDay,
      location,
      reminder,
      calendarId
    } = req.body;

    // Vérifier que le calendrier existe
    const calendar = await prisma.userCalendar.findUnique({
      where: { id: calendarId }
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendrier non trouvé'
      });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type,
        priority: priority || 'medium',
        isAllDay: isAllDay || false,
        location,
        reminder: reminder ? new Date(reminder) : null,
        calendarId,
        createdBy: req.user!.userId
      },
      include: {
        calendar: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Événement créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par date
    if (startDate && endDate) {
      whereClause.OR = [
        {
          startTime: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        {
          endTime: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        }
      ];
    }

    if (type) {
      whereClause.type = type;
    }

    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          calendar: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { startTime: 'asc' }
      }),
      prisma.calendarEvent.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getEventById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: Number(id) },
      include: {
        calendar: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
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

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id: Number(id) }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      type,
      priority,
      isAllDay,
      location,
      reminder
    } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        type,
        priority,
        isAllDay,
        location,
        reminder: reminder ? new Date(reminder) : null
      },
      include: {
        calendar: {
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
      }
    });

    res.json({
      success: true,
      data: event,
      message: 'Événement mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id: Number(id) }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    await prisma.calendarEvent.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Événement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};


// Validation middleware
export const validateEvent = [
  body('title').notEmpty().withMessage('Titre requis'),
  body('startTime').isISO8601().withMessage('Date de début invalide'),
  body('endTime').isISO8601().withMessage('Date de fin invalide'),
  body('calendarId').isInt({ min: 1 }).withMessage('Calendrier requis'),
  body('type').isIn(['MEETING', 'TASK', 'APPOINTMENT', 'REMINDER', 'OTHER']).withMessage('Type d\'événement invalide')
];