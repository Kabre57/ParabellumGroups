import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getProspects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, stage, priority, assignedTo } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.OR = [
        { assignedTo: req.user!.userId },
        { createdBy: req.user!.userId },
        { assignedUser: { serviceId: req.user!.serviceId } }
      ];
    }

    if (search) {
      whereClause.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (stage) {
      whereClause.stage = stage;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (assignedTo) {
      whereClause.assignedTo = Number(assignedTo);
    }

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where: whereClause,
        include: {
          assignedUser: {
            select: { firstName: true, lastName: true }
          },
          creator: {
            select: { firstName: true, lastName: true }
          },
          _count: {
            select: { activities: true }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: [
          { priority: 'asc' }, // A avant B avant C
          { lastContact: 'desc' }
        ]
      }),
      prisma.prospect.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        prospects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des prospects:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getProspectById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const prospect = await prisma.prospect.findUnique({
      where: { id: Number(id) },
      include: {
        assignedUser: {
          select: { firstName: true, lastName: true, service: true }
        },
        creator: {
          select: { firstName: true, lastName: true }
        },
        activities: {
          include: {
            creator: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect non trouvé'
      });
    }

    res.json({
      success: true,
      data: prospect
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createProspect = async (req: AuthenticatedRequest, res: Response) => {
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
      companyName,
      contactName,
      position,
      email,
      phone,
      address,
      website,
      industry,
      companySize,
      estimatedValue,
      priority,
      source,
      notes,
      hasBudget,
      isDecisionMaker,
      hasNeed,
      timeline
    } = req.body;

    const prospect = await prisma.prospect.create({
      data: {
        companyName,
        contactName,
        position,
        email,
        phone,
        address,
        website,
        industry,
        companySize,
        estimatedValue,
        priority,
        stage: 'research', // Commence toujours en recherche
        source,
        notes,
        hasBudget,
        isDecisionMaker,
        hasNeed,
        timeline,
        assignedTo: req.user!.userId, // Auto-assigné au créateur
        createdBy: req.user!.userId
      },
      include: {
        assignedUser: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Créer l'activité initiale
    await prisma.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        type: 'note',
        subject: 'Prospect créé',
        description: `Nouveau prospect ajouté au pipeline. Priorité: ${priority}`,
        completedAt: new Date(),
        createdBy: req.user!.userId
      }
    });

    res.status(201).json({
      success: true,
      data: prospect,
      message: 'Prospect créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateProspect = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingProspect = await prisma.prospect.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProspect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect non trouvé'
      });
    }

    const prospect = await prisma.prospect.update({
      where: { id: Number(id) },
      data: req.body,
      include: {
        assignedUser: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: prospect,
      message: 'Prospect mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteProspect = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingProspect = await prisma.prospect.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProspect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect non trouvé'
      });
    }

    await prisma.prospect.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Prospect supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const moveProspectStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;

    const prospect = await prisma.prospect.findUnique({
      where: { id: Number(id) }
    });

    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect non trouvé'
      });
    }

    const validStages = ['preparation', 'research', 'contact', 'discovery', 'proposal', 'won', 'lost'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: 'Étape invalide'
      });
    }

    // Mettre à jour le prospect
    const updatedProspect = await prisma.prospect.update({
      where: { id: Number(id) },
      data: {
        stage,
        lastContact: new Date(),
        ...(notes && { notes: `${prospect.notes || ''}\n${new Date().toLocaleDateString()}: ${notes}` })
      }
    });

    // Créer l'activité de changement d'étape
    await prisma.prospectActivity.create({
      data: {
        prospectId: Number(id),
        type: 'stage_change',
        subject: `Passage à l'étape: ${stage}`,
        description: notes || `Prospect déplacé vers l'étape ${stage}`,
        completedAt: new Date(),
        createdBy: req.user!.userId
      }
    });

    // Si converti en client, créer le client
    if (stage === 'won') {
      await convertProspectToCustomer(prospect, req.user!.userId);
    }

    res.json({
      success: true,
      data: updatedProspect,
      message: `Prospect déplacé vers l'étape ${stage}`
    });
  } catch (error) {
    console.error('Erreur lors du déplacement du prospect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getProspectionStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let whereClause: any = {};

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.OR = [
        { assignedTo: req.user!.userId },
        { createdBy: req.user!.userId }
      ];
    }

    const [
      totalProspects,
      activeProspects,
      convertedProspects,
      byStage,
      byPriority
    ] = await Promise.all([
      prisma.prospect.count({ where: whereClause }),
      prisma.prospect.count({ 
        where: { 
          ...whereClause, 
          stage: { in: ['research', 'contact', 'discovery', 'proposal'] } 
        } 
      }),
      prisma.prospect.count({ 
        where: { ...whereClause, stage: 'won' } 
      }),
      prisma.prospect.groupBy({
        by: ['stage'],
        where: whereClause,
        _count: true
      }),
      prisma.prospect.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: true
      })
    ]);

    const stageStats = byStage.reduce((acc, item) => {
      acc[item.stage] = item._count;
      return acc;
    }, {} as any);

    const priorityStats = byPriority.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {} as any);

    const conversionRate = totalProspects > 0 
      ? Math.round((convertedProspects / totalProspects) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        totalProspects,
        activeProspects,
        convertedProspects,
        conversionRate,
        byStage: stageStats,
        byPriority: priorityStats
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Fonction utilitaire pour convertir un prospect en client
async function convertProspectToCustomer(prospect: any, userId: number) {
  try {
    // Générer le numéro client
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { customerNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastCustomer) {
      const lastNumber = parseInt(lastCustomer.customerNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const customerNumber = `CLI-${nextNumber.toString().padStart(3, '0')}`;

    // Créer le client
    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        name: prospect.companyName,
        type: 'COMPANY',
        email: prospect.email,
        phone: prospect.phone,
        website: prospect.website,
        category: prospect.industry,
        notes: `Converti depuis prospect. ${prospect.notes || ''}`,
        serviceId: prospect.assignedUser?.serviceId || null,
        createdBy: userId,
        addresses: prospect.address ? {
          create: [{
            type: 'BILLING',
            name: 'Adresse principale',
            addressLine1: prospect.address,
            city: 'Abidjan', // Par défaut
            postalCode: '01 BP 0000',
            country: 'Côte d\'Ivoire',
            isDefault: true
          }]
        } : undefined
      }
    });

    // Créer une activité de conversion
    await prisma.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        type: 'conversion',
        subject: 'Prospect converti en client',
        description: `Prospect converti en client ${customerNumber}`,
        completedAt: new Date(),
        createdBy: userId
      }
    });

    return customer;
  } catch (error) {
    console.error('Erreur lors de la conversion en client:', error);
    throw error;
  }
}

// Validation middleware
export const validateProspect = [
  body('companyName').notEmpty().withMessage('Nom de l\'entreprise requis'),
  body('contactName').notEmpty().withMessage('Nom du contact requis'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('priority').optional().isIn(['A', 'B', 'C']).withMessage('Priorité invalide'),
  body('estimatedValue').optional().isFloat({ min: 0 }).withMessage('Valeur estimée invalide')
];