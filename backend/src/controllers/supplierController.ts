import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, contactName, email, phone, address } = req.body;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address
      }
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Fournisseur créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { contactName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              purchaseOrders: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.supplier.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Ajouter les autres méthodes CRUD...
export const getSupplierById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    const { name, contactName, email, phone, address } = req.body;

    const updatedSupplier = await prisma.supplier.update({
      where: { id: Number(id) },
      data: {
        name,
        contactName,
        email,
        phone,
        address
      }
    });

    res.json({
      success: true,
      data: updatedSupplier,
      message: 'Fournisseur mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Fournisseur non trouvé'
      });
    }

    await prisma.supplier.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Fournisseur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du fournisseur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const validateSupplier = [
  body('name').notEmpty().withMessage('Nom du fournisseur requis'),
  body('email').optional().isEmail().withMessage('Email invalide')
];