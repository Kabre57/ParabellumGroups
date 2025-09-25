import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createPurchaseReceipt = async (req: AuthenticatedRequest, res: Response) => {
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
      purchaseOrderId,
      receiptDate,
      notes,
      items
    } = req.body;

    // Vérifier que la commande existe
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Commande d\'achat non trouvée'
      });
    }

    // Générer le numéro de reçu
    const lastReceipt = await prisma.purchaseReceipt.findFirst({
      orderBy: { receiptNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastReceipt) {
      const lastNumber = parseInt(lastReceipt.receiptNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const receiptNumber = `RC-${nextNumber.toString().padStart(4, '0')}`;

    const purchaseReceipt = await prisma.purchaseReceipt.create({
      data: {
        receiptNumber,
        purchaseOrderId,
        receiptDate: new Date(receiptDate),
        receivedBy: req.user!.userId,
        notes,
        items: {
          create: items.map((item: any) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            quantityReceived: item.quantityReceived
          }))
        }
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            purchaseOrderItem: true
          }
        }
      }
    });

    // Mettre à jour les quantités reçues dans les items de commande
    for (const item of items) {
      await prisma.purchaseOrderItem.update({
        where: { id: item.purchaseOrderItemId },
        data: {
          receivedQuantity: {
            increment: item.quantityReceived
          }
        }
      });
    }

    // Vérifier si la commande est complètement reçue
    const orderItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId }
    });

    const isComplete = orderItems.every(item => item.receivedQuantity >= item.quantity);
    if (isComplete) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'COMPLETED' }
      });
    } else if (orderItems.some(item => item.receivedQuantity > 0)) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'PARTIALLY_RECEIVED' }
      });
    }

    res.status(201).json({
      success: true,
      data: purchaseReceipt,
      message: 'Reçu d\'achat créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du reçu d\'achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getPurchaseReceipts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, purchaseOrderId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (purchaseOrderId) {
      whereClause.purchaseOrderId = Number(purchaseOrderId);
    }

    const [receipts, total] = await Promise.all([
      prisma.purchaseReceipt.findMany({
        where: whereClause,
        include: {
          purchaseOrder: {
            include: {
              supplier: true
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            include: {
              purchaseOrderItem: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { receiptDate: 'desc' }
      }),
      prisma.purchaseReceipt.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des reçus d\'achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validatePurchaseReceipt = [
  body('purchaseOrderId').isInt({ min: 1 }).withMessage('Commande d\'achat requise'),
  body('receiptDate').isISO8601().withMessage('Date de réception invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.purchaseOrderItemId').isInt({ min: 1 }).withMessage('Item de commande requis'),
  body('items.*.quantityReceived').isFloat({ min: 0.01 }).withMessage('Quantité reçue invalide')
];