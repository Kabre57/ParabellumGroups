import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createCompte = async (req: AuthenticatedRequest, res: Response) => {
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
      accountNumber,
      accountType,
      balance,
      currency,
      description
    } = req.body;

    // Vérifier que le numéro de compte est unique
    const existingCompte = await prisma.account.findUnique({
      where: { accountNumber }
    });

    if (existingCompte) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de compte existe déjà'
      });
    }

    const compte = await prisma.account.create({
      data: {
        name,
        accountNumber,
        accountType,
        balance: balance || 0,
        currency: currency || 'XOF',
        description
      }
    });

    res.status(201).json({
      success: true,
      data: compte,
      message: 'Compte créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllComptes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, accountType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { accountNumber: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (accountType) {
      whereClause.accountType = accountType;
    }

    const [comptes, total] = await Promise.all([
      prisma.account.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              accountingEntries: true,
              cashFlows: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { accountNumber: 'asc' }
      }),
      prisma.account.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        comptes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des comptes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getCompteById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const compte = await prisma.account.findUnique({
      where: { id: Number(id) },
      include: {
        accountingEntries: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { date: 'desc' }
        },
        cashFlows: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!compte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    res.json({
      success: true,
      data: compte
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateCompte = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingCompte = await prisma.account.findUnique({
      where: { id: Number(id) }
    });

    if (!existingCompte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    const {
      name,
      accountType,
      description
    } = req.body;

    const compte = await prisma.account.update({
      where: { id: Number(id) },
      data: {
        name,
        accountType,
        description
      }
    });

    res.json({
      success: true,
      data: compte,
      message: 'Compte mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteCompte = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingCompte = await prisma.account.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            accountingEntries: true,
            cashFlows: true
          }
        }
      }
    });

    if (!existingCompte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    // Vérifier s'il y a des écritures associées
    if (existingCompte._count.accountingEntries > 0 || existingCompte._count.cashFlows > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un compte avec des écritures associées'
      });
    }

    await prisma.account.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateCompte = [
  body('name').notEmpty().withMessage('Nom du compte requis'),
  body('accountNumber').notEmpty().withMessage('Numéro de compte requis'),
  body('accountType').notEmpty().withMessage('Type de compte requis')
];