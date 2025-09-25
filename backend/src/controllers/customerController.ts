import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, serviceId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Filtrage par service pour les utilisateurs non-admin
    let whereClause: any = {};
    
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      whereClause.serviceId = req.user!.serviceId;
    } else if (serviceId) {
      whereClause.serviceId = Number(serviceId);
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { customerNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          service: true,
          creator: {
            select: { firstName: true, lastName: true }
          },
          addresses: true,
          _count: {
            select: {
              quotes: true,
              invoices: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        service: true,
        creator: {
          select: { firstName: true, lastName: true }
        },
        addresses: true,
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        customer.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce client'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
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
      name,
      type,
      legalName,
      siret,
      vatNumber,
      email,
      phone,
      mobile,
      website,
      paymentTerms,
      paymentMethod,
      creditLimit,
      discountRate,
      category,
      tags,
      notes,
      addresses
    } = req.body;

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

    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        name,
        type,
        legalName,
        siret,
        vatNumber,
        email,
        phone,
        mobile,
        website,
        paymentTerms: paymentTerms || 30,
        paymentMethod: paymentMethod || 'TRANSFER',
        creditLimit: creditLimit || 0,
        discountRate: discountRate || 0,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        notes,
        serviceId: req.user!.serviceId,
        createdBy: req.user!.userId,
        addresses: addresses ? {
          create: addresses.map((addr: any) => ({
            type: addr.type,
            name: addr.name,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            postalCode: addr.postalCode,
            city: addr.city,
            country: addr.country || 'France',
            isDefault: addr.isDefault || false
          }))
        } : undefined
      },
      include: {
        service: true,
        addresses: true
      }
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Client créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
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

    // Vérifier que le client existe et appartient au bon service
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: Number(id) }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        existingCustomer.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce client'
      });
    }

    const {
      name,
      type,
      legalName,
      siret,
      vatNumber,
      email,
      phone,
      mobile,
      website,
      paymentTerms,
      paymentMethod,
      creditLimit,
      discountRate,
      category,
      tags,
      notes,
      isActive
    } = req.body;

    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        name,
        type,
        legalName,
        siret,
        vatNumber,
        email,
        phone,
        mobile,
        website,
        paymentTerms,
        paymentMethod,
        creditLimit,
        discountRate,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        notes,
        isActive
      },
      include: {
        service: true,
        addresses: true
      }
    });

    res.json({
      success: true,
      data: customer,
      message: 'Client mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Vérifier que le client existe et appartient au bon service
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            quotes: true,
            invoices: true
          }
        }
      }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) && 
        existingCustomer.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce client'
      });
    }

    // Vérifier s'il y a des devis ou factures associés
    if (existingCustomer._count.quotes > 0 || existingCustomer._count.invoices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un client ayant des devis ou factures associés'
      });
    }

    await prisma.customer.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Client supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateCustomer = [
  body('name').notEmpty().withMessage('Le nom est requis'),
  body('type').isIn(['INDIVIDUAL', 'COMPANY']).withMessage('Type invalide'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('paymentTerms').optional().isInt({ min: 0 }).withMessage('Délai de paiement invalide'),
  body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Limite de crédit invalide'),
  body('discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide')
];