import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
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
      supplierId,
      orderDate,
      expectedDate,
      notes,
      items
    } = req.body;

    // Vérifier que le fournisseur existe
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    // Calculer les totaux
    let subtotalHt = 0;
    let totalVat = 0;
    let totalTtc = 0;

    items.forEach((item: any) => {
      const itemTotal = item.quantity * item.unitPriceHt;
      subtotalHt += itemTotal;
      totalVat += itemTotal * (item.vatRate / 100);
    });
    totalTtc = subtotalHt + totalVat;

    // Générer le numéro de commande
    const lastOrder = await prisma.purchaseOrder.findFirst({
      orderBy: { orderNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const orderNumber = `PO-${nextNumber.toString().padStart(4, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        requestedById: req.user!.userId,
        serviceId: req.user!.serviceId,
        orderDate: new Date(orderDate),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotalHt,
        totalVat,
        totalTtc,
        notes,
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
        supplier: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
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
      data: order,
      message: 'Commande d\'achat créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, supplierId, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'PURCHASING_MANAGER'].includes(req.user!.role)) {
      whereClause.serviceId = req.user!.serviceId;
    }

    if (supplierId) {
      whereClause.supplierId = Number(supplierId);
    }

    if (status) {
      whereClause.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: whereClause,
        include: {
          supplier: true,
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          },
          items: {
            include: {
              product: true
            }
          },
          receipts: {
            include: {
              items: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { orderDate: 'desc' }
      }),
      prisma.purchaseOrder.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            product: true,
            receiptItems: {
              include: {
                purchaseReceipt: true
              }
            }
          }
        },
        receipts: {
          include: {
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
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier les permissions d'accès
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'PURCHASING_MANAGER'].includes(req.user!.role) && 
        order.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateOrder = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier les permissions
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'PURCHASING_MANAGER'].includes(req.user!.role) && 
        existingOrder.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande'
      });
    }

    const { status, expectedDate, notes } = req.body;

    const order = await prisma.purchaseOrder.update({
      where: { id: Number(id) },
      data: {
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: order,
      message: 'Commande mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            items: true,
            receipts: true
          }
        }
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier les permissions
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'PURCHASING_MANAGER'].includes(req.user!.role) && 
        existingOrder.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande'
      });
    }

    // Vérifier s'il y a des reçus associés
    if (existingOrder._count.receipts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une commande avec des reçus associés'
      });
    }

    await prisma.purchaseOrder.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Commande supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateOrder = [
  body('supplierId').isInt({ min: 1 }).withMessage('Fournisseur requis'),
  body('orderDate').isISO8601().withMessage('Date de commande invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.description').notEmpty().withMessage('Description de l\'article requise'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
  body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide')
];