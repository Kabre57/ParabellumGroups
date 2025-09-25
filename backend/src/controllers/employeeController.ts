import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getEmployees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, serviceId, isActive } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.serviceId = req.user!.serviceId;
    } else if (serviceId) {
      whereClause.serviceId = Number(serviceId);
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { employeeNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        include: {
          service: true,
          user: {
            select: { id: true, email: true, role: true }
          },
          contracts: {
            where: { isActive: true },
            take: 1,
            orderBy: { startDate: 'desc' }
          },
          _count: {
            select: {
              salaries: true,
              leaveRequests: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getEmployeeById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        service: true,
        user: {
          select: { id: true, email: true, role: true, isActive: true }
        },
        contracts: {
          orderBy: { startDate: 'desc' }
        },
        salaries: {
          orderBy: { paymentDate: 'desc' },
          take: 12
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        employee.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cet employé'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response) => {
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
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      placeOfBirth,
      nationality,
      socialSecurityNumber,
      bankAccount,
      emergencyContact,
      serviceId,
      position,
      department,
      manager,
      hireDate,
      contractType,
      baseSalary,
      workingHours
    } = req.body;

    // Générer le numéro d'employé
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastEmployee) {
      const lastNumber = parseInt(lastEmployee.employeeNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const employeeNumber = `EMP-${nextNumber.toString().padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth: new Date(dateOfBirth),
        placeOfBirth,
        nationality,
        socialSecurityNumber,
        bankAccount,
        emergencyContact,
        serviceId,
        position,
        department,
        manager,
        hireDate: new Date(hireDate),
        contracts: {
          create: {
            contractType,
            startDate: new Date(hireDate),
            baseSalary,
            workingHours,
            isActive: true
          }
        }
      },
      include: {
        service: true,
        contracts: true
      }
    });

    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employé créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: Number(id) }
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Vérifier les permissions
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        existingEmployee.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cet employé'
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      placeOfBirth,
      nationality,
      socialSecurityNumber,
      bankAccount,
      emergencyContact,
      serviceId,
      position,
      department,
      manager,
      isActive
    } = req.body;

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        placeOfBirth,
        nationality,
        socialSecurityNumber,
        bankAccount,
        emergencyContact,
        serviceId,
        position,
        department,
        manager,
        isActive
      },
      include: {
        service: true,
        contracts: {
          where: { isActive: true }
        }
      }
    });

    res.json({
      success: true,
      data: employee,
      message: 'Employé mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            salaries: true,
            leaveRequests: true
          }
        }
      }
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Vérifier s'il y a des données associées
    if (existingEmployee._count.salaries > 0 || existingEmployee._count.leaveRequests > 0) {
      // Désactiver au lieu de supprimer
      await prisma.employee.update({
        where: { id: Number(id) },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Employé désactivé (des données lui sont associées)'
      });
    } else {
      await prisma.employee.delete({
        where: { id: Number(id) }
      });

      res.json({
        success: true,
        message: 'Employé supprimé avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateEmployee = [
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('dateOfBirth').isISO8601().withMessage('Date de naissance invalide'),
  body('hireDate').isISO8601().withMessage('Date d\'embauche invalide'),
  body('serviceId').isInt().withMessage('Service requis'),
  body('position').notEmpty().withMessage('Poste requis')
];