import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createRecurringInvoice = async (req: AuthenticatedRequest, res: Response) => {
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
      templateName,
      frequency,
      startDate,
      endDate,
      nextInvoiceDate,
      terms,
      notes,
      items
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

    // Calculer les totaux
    let subtotalHt = 0;
    let totalVat = 0;

    items.forEach((item: any) => {
      const itemTotal = item.quantity * item.unitPriceHt;
      subtotalHt += itemTotal;
      totalVat += itemTotal * (item.vatRate / 100);
    });

    const totalTtc = subtotalHt + totalVat;

    const recurringInvoice = await prisma.recurringInvoice.create({
      data: {
        customerId,
        templateName,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextInvoiceDate: new Date(nextInvoiceDate),
        subtotalHt,
        totalVat,
        totalTtc,
        terms,
        notes,
        createdBy: req.user!.userId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPriceHt: item.unitPriceHt,
            vatRate: item.vatRate,
            totalHt: item.quantity * item.unitPriceHt
          }))
        }
      },
      include: {
        customer: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: recurringInvoice,
      message: 'Facture récurrente créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la facture récurrente:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllRecurringInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, customerId, frequency, isActive } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (customerId) {
      whereClause.customerId = Number(customerId);
    }

    if (frequency) {
      whereClause.frequency = frequency;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [recurringInvoices, total] = await Promise.all([
      prisma.recurringInvoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              customerNumber: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.recurringInvoice.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        recurringInvoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des factures récurrentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Ajouter les autres méthodes (getById, update, delete, etc.)

export const validateRecurringInvoice = [
  body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
  body('templateName').notEmpty().withMessage('Nom du modèle requis'),
  body('frequency').isIn(['MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Fréquence invalide'),
  body('startDate').isISO8601().withMessage('Date de début invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis')
];