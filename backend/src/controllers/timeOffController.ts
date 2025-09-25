import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createTimeOff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Donnees invalides',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      type,
      priority = 'medium',
      isAllDay = false,
      location,
      reminder,
      calendarId,
      timeOffType,
      reason
    } = req.body;

    // Verifier que le calendrier existe
    const calendar = await prisma.userCalendar.findUnique({
      where: { id: calendarId },
      include: { user: true }
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendrier non trouve'
      });
    }

    // Creer l'evenement calendrier
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title: title || `Time Off - ${timeOffType}`,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type: type || 'TASK',
        priority,
        isAllDay,
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

    // Creer la demande de time off associee
    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        calendarId,
        type: timeOffType || 'OTHER',
        startDate: new Date(startTime),
        endDate: new Date(endTime),
        reason,
        status: 'PENDING'
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
        approvedBy: {
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
      data: {
        event: calendarEvent,
        timeOff: timeOffRequest
      },
      message: 'Demande de time off creee avec succes'
    });
  } catch (error) {
    console.error('Erreur lors de la creation du time off:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getTimeOffs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      userId,
      startDate,
      endDate
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par utilisateur
    if (userId) {
      whereClause.calendar = {
        userId: Number(userId)
      };
    }

    // Filtrage par dates
    if (startDate && endDate) {
      whereClause.OR = [
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
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const [timeOffs, total] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where: whereClause,
        include: {
          calendar: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  service: true
                }
              }
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { startDate: 'desc' }
      }),
      prisma.timeOffRequest.count({ where: whereClause })
    ]);

    // Recuperer les evenements calendrier associes
    const timeOffsWithEvents = await Promise.all(
      timeOffs.map(async (timeOff) => {
        const events = await prisma.calendarEvent.findMany({
          where: {
            calendarId: timeOff.calendarId,
            startTime: {
              gte: timeOff.startDate,
              lte: timeOff.endDate
            }
          },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        return {
          ...timeOff,
          events
        };
      })
    );

    res.json({
      success: true,
      data: {
        timeOffs: timeOffsWithEvents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recuperation des time offs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getTimeOffById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const timeOff = await prisma.timeOffRequest.findUnique({
      where: { id: Number(id) },
      include: {
        calendar: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                service: true
              }
            }
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!timeOff) {
      return res.status(404).json({
        success: false,
        message: 'Time off non trouve'
      });
    }

    // Recuperer les evenements calendrier associes
    const events = await prisma.calendarEvent.findMany({
      where: {
        calendarId: timeOff.calendarId,
        startTime: {
          gte: timeOff.startDate,
          lte: timeOff.endDate
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...timeOff,
        events
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recuperation du time off:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateTimeOffStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Donnees invalides',
        errors: errors.array()
      });
    }

    const existingTimeOff = await prisma.timeOffRequest.findUnique({
      where: { id: Number(id) }
    });

    if (!existingTimeOff) {
      return res.status(404).json({
        success: false,
        message: 'Time off non trouve'
      });
    }

    const {
      status,
      comments,
      approvedById
    } = req.body;

    const timeOff = await prisma.timeOffRequest.update({
      where: { id: Number(id) },
      data: {
        status,
        comments,
        approvedById: status === 'APPROVED' || status === 'REJECTED' ? approvedById || req.user!.userId : null
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
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Mettre a jour les evenements calendrier si le statut change
    if (status === 'APPROVED') {
      await prisma.calendarEvent.updateMany({
        where: {
          calendarId: timeOff.calendarId,
          startTime: {
            gte: timeOff.startDate,
            lte: timeOff.endDate
          }
        },
        data: {
          type: 'TASK',
          priority: 'high'
        }
      });
    }

    res.json({
      success: true,
      data: timeOff,
      message: 'Statut du time off mis a jour avec succes'
    });
  } catch (error) {
    console.error('Erreur lors de la mise a jour du time off:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getTimeOffStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;

    let whereClause: any = {};

    if (userId) {
      whereClause.calendar = {
        userId: Number(userId)
      };
    }

    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      totalTimeOffs,
      approvedTimeOffs,
      pendingTimeOffs,
      byType,
      byStatus
    ] = await Promise.all([
      prisma.timeOffRequest.count({ where: whereClause }),
      prisma.timeOffRequest.count({ 
        where: { ...whereClause, status: 'APPROVED' } 
      }),
      prisma.timeOffRequest.count({ 
        where: { ...whereClause, status: 'PENDING' } 
      }),
      prisma.timeOffRequest.groupBy({
        by: ['type'],
        where: whereClause,
        _count: true
      }),
      prisma.timeOffRequest.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      })
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as any);

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        totalTimeOffs,
        approvedTimeOffs,
        pendingTimeOffs,
        approvalRate: totalTimeOffs > 0 ? Math.round((approvedTimeOffs / totalTimeOffs) * 100) : 0,
        byType: typeStats,
        byStatus: statusStats
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recuperation des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateTimeOff = [
  body('calendarId').isInt({ min: 1 }).withMessage('Calendrier requis'),
  body('startTime').isISO8601().withMessage('Date de debut invalide'),
  body('endTime').isISO8601().withMessage('Date de fin invalide'),
  body('timeOffType').isIn(['MISSION', 'ABSENCE', 'DEPLACEMENT', 'FORMATION', 'VACATION', 'SICK_LEAVE', 'OTHER']).withMessage('Type de time off invalide')
];

export const validateTimeOffStatus = [
  body('status').isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).withMessage('Statut invalide')
];