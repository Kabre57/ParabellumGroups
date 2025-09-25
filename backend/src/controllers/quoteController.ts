import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getQuotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, serviceId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par service et rôle
    if (req.user!.role === 'EMPLOYEE') {
      whereClause.createdBy = req.user!.userId;
    } else if (req.user!.role === 'SERVICE_MANAGER') {
      whereClause.creator = {
        serviceId: req.user!.serviceId
      };
    } else if (req.user!.role === 'ACCOUNTANT') {
      whereClause.status = {
        in: ['APPROVED_BY_DG', 'ACCEPTED_BY_CLIENT']
      };
    } else if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.creator = {
        serviceId: req.user!.serviceId
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (serviceId && ['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.creator = {
        serviceId: Number(serviceId)
      };
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { name: true, customerNumber: true }
          },
          creator: {
            select: { firstName: true, lastName: true }
          },
          serviceManager: {
            select: { firstName: true, lastName: true }
          },
          dgApprover: {
            select: { firstName: true, lastName: true }
          },
          items: {
            include: {
              product: {
                select: { name: true, sku: true }
              }
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.quote.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        quotes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getQuoteById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id: Number(id) },
      include: {
        customer: {
          include: {
            addresses: true
          }
        },
        customerAddress: true,
        creator: {
          select: { firstName: true, lastName: true, service: true }
        },
        serviceManager: {
          select: { firstName: true, lastName: true }
        },
        dgApprover: {
          select: { firstName: true, lastName: true }
        },
        items: {
          include: {
            product: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        approvals: {
          include: {
            approver: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    const canAccess = 
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'GENERAL_DIRECTOR' ||
      quote.createdBy === req.user!.userId ||
      (req.user!.role === 'SERVICE_MANAGER' && quote.creator.service?.id === req.user!.serviceId) ||
      (req.user!.role === 'ACCOUNTANT' && ['APPROVED_BY_DG', 'ACCEPTED_BY_CLIENT'].includes(quote.status));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce devis'
      });
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createQuote = async (req: AuthenticatedRequest, res: Response) => {
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
      customerId,
      customerAddressId,
      quoteDate,
      validUntil,
      terms,
      notes,
      items
    } = req.body;

    // Vérifier que le client existe et appartient au bon service
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        customer.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce client'
      });
    }

    // Générer le numéro de devis
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const quoteNumber = `DEV-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;

    // Calculer les totaux
    let subtotalHt = 0;
    let totalVat = 0;

    const processedItems = items.map((item: any) => {
      const itemTotal = item.quantity * item.unitPriceHt * (1 - item.discountRate / 100);
      const itemVat = itemTotal * (item.vatRate / 100);
      
      subtotalHt += itemTotal;
      totalVat += itemVat;

      return {
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceHt: item.unitPriceHt,
        discountRate: item.discountRate || 0,
        vatRate: item.vatRate,
        totalHt: itemTotal,
        sortOrder: item.sortOrder || 0
      };
    });

    const totalTtc = subtotalHt + totalVat;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId,
        customerAddressId,
        quoteDate: new Date(quoteDate),
        validUntil: new Date(validUntil),
        subtotalHt,
        totalVat,
        totalTtc,
        terms,
        notes,
        createdBy: req.user!.userId,
        items: {
          create: processedItems
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: quote,
      message: 'Devis créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const submitForServiceApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id: Number(id) },
      include: {
        creator: {
          include: { service: true }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    // Vérifier que l'utilisateur peut soumettre ce devis
    if (quote.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez soumettre que vos propres devis'
      });
    }

    if (quote.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les devis en brouillon peuvent être soumis'
      });
    }

    // Trouver le responsable de service
    const serviceManager = await prisma.user.findFirst({
      where: {
        serviceId: quote.creator.serviceId,
        role: 'SERVICE_MANAGER',
        isActive: true
      }
    });

    if (!serviceManager) {
      return res.status(400).json({
        success: false,
        message: 'Aucun responsable de service trouvé'
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: Number(id) },
      data: {
        status: 'SUBMITTED_FOR_SERVICE_APPROVAL',
        submittedForServiceApprovalAt: new Date()
      }
    });

    // Créer l'approbation en attente
    await prisma.quoteApproval.create({
      data: {
        quoteId: Number(id),
        approverId: serviceManager.id,
        approvalLevel: 'SERVICE_MANAGER'
      }
    });

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Devis soumis pour validation du service'
    });
  } catch (error) {
    console.error('Erreur lors de la soumission du devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const approveByServiceManager = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (req.user!.role !== 'SERVICE_MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les responsables de service peuvent approuver'
      });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: Number(id) },
      include: {
        creator: true
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    if (quote.status !== 'SUBMITTED_FOR_SERVICE_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Ce devis n\'est pas en attente de validation service'
      });
    }

    if (quote.creator.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez approuver que les devis de votre service'
      });
    }

    // Trouver le directeur général
    const dg = await prisma.user.findFirst({
      where: {
        role: 'GENERAL_DIRECTOR',
        isActive: true
      }
    });

    if (!dg) {
      return res.status(400).json({
        success: false,
        message: 'Aucun directeur général trouvé'
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: Number(id) },
      data: {
        status: 'SUBMITTED_FOR_DG_APPROVAL',
        serviceManagerApprovedBy: req.user!.userId,
        serviceManagerApprovalDate: new Date(),
        serviceManagerComments: comments
      }
    });

    // Mettre à jour l'approbation service
    await prisma.quoteApproval.update({
      where: {
        quoteId_approvalLevel: {
          quoteId: Number(id),
          approvalLevel: 'SERVICE_MANAGER'
        }
      },
      data: {
        status: 'APPROVED',
        approvalDate: new Date(),
        comments
      }
    });

    // Créer l'approbation DG
    await prisma.quoteApproval.create({
      data: {
        quoteId: Number(id),
        approverId: dg.id,
        approvalLevel: 'GENERAL_DIRECTOR'
      }
    });

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Devis approuvé par le service et soumis au DG'
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation du devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const approveByDG = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    if (req.user!.role !== 'GENERAL_DIRECTOR') {
      return res.status(403).json({
        success: false,
        message: 'Seul le directeur général peut effectuer cette approbation'
      });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: Number(id) }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    if (quote.status !== 'SUBMITTED_FOR_DG_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Ce devis n\'est pas en attente de validation DG'
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED_BY_DG',
        dgApprovedBy: req.user!.userId,
        dgApprovalDate: new Date(),
        dgComments: comments
      }
    });

    // Mettre à jour l'approbation DG
    await prisma.quoteApproval.update({
      where: {
        quoteId_approvalLevel: {
          quoteId: Number(id),
          approvalLevel: 'GENERAL_DIRECTOR'
        }
      },
      data: {
        status: 'APPROVED',
        approvalDate: new Date(),
        comments
      }
    });

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Devis approuvé par le directeur général'
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation DG:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const rejectQuote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id: Number(id) },
      include: {
        creator: true
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    let canReject = false;
    let newStatus = '';
    let approvalLevel: 'SERVICE_MANAGER' | 'GENERAL_DIRECTOR' | null = null;

    if (req.user!.role === 'SERVICE_MANAGER' && 
        quote.status === 'SUBMITTED_FOR_SERVICE_APPROVAL' &&
        quote.creator.serviceId === req.user!.serviceId) {
      canReject = true;
      newStatus = 'REJECTED_BY_SERVICE_MANAGER';
      approvalLevel = 'SERVICE_MANAGER';
    } else if (req.user!.role === 'GENERAL_DIRECTOR' && 
               quote.status === 'SUBMITTED_FOR_DG_APPROVAL') {
      canReject = true;
      newStatus = 'REJECTED_BY_DG';
      approvalLevel = 'GENERAL_DIRECTOR';
    }

    if (!canReject) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à rejeter ce devis'
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: Number(id) },
      data: {
        status: newStatus as any,
        ...(approvalLevel === 'SERVICE_MANAGER' ? {
          serviceManagerComments: comments
        } : {
          dgComments: comments
        })
      }
    });

    // Mettre à jour l'approbation
    if (approvalLevel) {
      await prisma.quoteApproval.update({
        where: {
          quoteId_approvalLevel: {
            quoteId: Number(id),
            approvalLevel
          }
        },
        data: {
          status: 'REJECTED',
          approvalDate: new Date(),
          comments
        }
      });
    }

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Devis rejeté'
    });
  } catch (error) {
    console.error('Erreur lors du rejet du devis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateQuote = [
  body('customerId').isInt().withMessage('ID client requis'),
  body('quoteDate').isISO8601().withMessage('Date de devis invalide'),
  body('validUntil').isISO8601().withMessage('Date de validité invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.description').notEmpty().withMessage('Description requise'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
  body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide')
];