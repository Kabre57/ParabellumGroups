import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getLeaveRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, employeeId, status, year } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (employeeId) {
      whereClause.employeeId = Number(employeeId);
    }

    if (status) {
      whereClause.status = status;
    }

    if (year) {
      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year) + 1, 0, 1);
      whereClause.startDate = {
        gte: startDate,
        lt: endDate
      };
    }

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      if (req.user!.role === 'SERVICE_MANAGER') {
        // Les managers voient les demandes de leur service
        whereClause.employee = {
          serviceId: req.user!.serviceId
        };
      } else {
        // Les employés ne voient que leurs propres demandes
        whereClause.employee = {
          userId: req.user!.userId
        };
      }
    }

    const [leaveRequests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            include: {
              service: true,
              user: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leaveRequest.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        leaveRequests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getLeaveRequestById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          include: {
            service: true,
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée'
      });
    }

    // Vérifier les permissions d'accès
    const canAccess = 
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'GENERAL_DIRECTOR' ||
      leaveRequest.employee.userId === req.user!.userId ||
      (req.user!.role === 'SERVICE_MANAGER' && leaveRequest.employee.serviceId === req.user!.serviceId);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette demande de congé'
      });
    }

    res.json({
      success: true,
      data: leaveRequest
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
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
      leaveType,
      startDate,
      endDate,
      reason,
      notes
    } = req.body;

    // Vérifier que l'employé existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Vérifier que l'utilisateur peut créer une demande pour cet employé
    if (req.user!.role === 'EMPLOYEE' && employee.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez créer des demandes que pour vous-même'
      });
    }

    // Calculer le nombre de jours
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Vérifier les chevauchements
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: {
          in: ['PENDING', 'APPROVED']
        },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'Il existe déjà une demande de congé pour cette période'
      });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        days: diffDays,
        reason,
        notes,
        status: 'PENDING'
      },
      include: {
        employee: {
          include: {
            service: true,
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: leaveRequest,
      message: 'Demande de congé créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la demande de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: {
        employee: true
      }
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée'
      });
    }

    // Seules les demandes en attente peuvent être modifiées
    if (existingRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes en attente peuvent être modifiées'
      });
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      notes
    } = req.body;

    // Recalculer le nombre de jours si les dates changent
    let days = existingRequest.days;
    if (startDate || endDate) {
      const start = new Date(startDate || existingRequest.startDate);
      const end = new Date(endDate || existingRequest.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        leaveType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        days,
        reason,
        notes
      },
      include: {
        employee: {
          include: {
            service: true,
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: leaveRequest,
      message: 'Demande de congé mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const approveLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: {
        employee: true
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée'
      });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    // Vérifier les permissions d'approbation
    const canApprove = 
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'GENERAL_DIRECTOR' ||
      (req.user!.role === 'SERVICE_MANAGER' && leaveRequest.employee.serviceId === req.user!.serviceId);

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à approuver cette demande'
      });
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
        comments
      },
      include: {
        employee: {
          include: {
            service: true,
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Demande de congé approuvée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation de la demande de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const rejectLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: {
        employee: true
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée'
      });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    // Vérifier les permissions de rejet
    const canReject = 
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'GENERAL_DIRECTOR' ||
      (req.user!.role === 'SERVICE_MANAGER' && leaveRequest.employee.serviceId === req.user!.serviceId);

    if (!canReject) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à rejeter cette demande'
      });
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
        comments
      },
      include: {
        employee: {
          include: {
            service: true,
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Demande de congé rejetée'
    });
  } catch (error) {
    console.error('Erreur lors du rejet de la demande de congé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getLeaveBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      include: {
        contracts: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Calculer les congés pris dans l'année
    const startDate = new Date(Number(year), 0, 1);
    const endDate = new Date(Number(year) + 1, 0, 1);

    const takenLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: Number(employeeId),
        status: 'APPROVED',
        startDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    // Calculer par type de congé
    const leaveBalance = takenLeaves.reduce((acc, leave) => {
      if (!acc[leave.leaveType]) {
        acc[leave.leaveType] = 0;
      }
      acc[leave.leaveType] += leave.days;
      return acc;
    }, {} as any);

    // Congés légaux annuels (exemple: 30 jours)
    const annualLeaveEntitlement = 30;
    const sickLeaveEntitlement = 90; // Exemple
    const personalLeaveEntitlement = 5; // Exemple

    res.json({
      success: true,
      data: {
        year: Number(year),
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName
        },
        entitlements: {
          ANNUAL: annualLeaveEntitlement,
          SICK: sickLeaveEntitlement,
          PERSONAL: personalLeaveEntitlement,
          MATERNITY: 120,
          PATERNITY: 15
        },
        taken: {
          ANNUAL: leaveBalance.ANNUAL || 0,
          SICK: leaveBalance.SICK || 0,
          PERSONAL: leaveBalance.PERSONAL || 0,
          MATERNITY: leaveBalance.MATERNITY || 0,
          PATERNITY: leaveBalance.PATERNITY || 0
        },
        remaining: {
          ANNUAL: annualLeaveEntitlement - (leaveBalance.ANNUAL || 0),
          SICK: sickLeaveEntitlement - (leaveBalance.SICK || 0),
          PERSONAL: personalLeaveEntitlement - (leaveBalance.PERSONAL || 0),
          MATERNITY: 120 - (leaveBalance.MATERNITY || 0),
          PATERNITY: 15 - (leaveBalance.PATERNITY || 0)
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors du calcul du solde de congés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateLeaveRequest = [
  body('employeeId').isInt().withMessage('ID employé requis'),
  body('leaveType').isIn(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']).withMessage('Type de congé invalide'),
  body('startDate').isISO8601().withMessage('Date de début invalide'),
  body('endDate').isISO8601().withMessage('Date de fin invalide'),
  body('reason').notEmpty().withMessage('Motif requis')
];