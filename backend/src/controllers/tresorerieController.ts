import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createTresorerie = async (req: AuthenticatedRequest, res: Response) => {
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
      date,
      description,
      amount,
      type,
      accountId
    } = req.body;

    // Vérifier que le compte existe
    const compte = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!compte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    const tresorerie = await prisma.cashFlow.create({
      data: {
        date: new Date(date),
        description,
        amount,
        type,
        accountId,
        createdBy: req.user!.userId
      },
      include: {
        account: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Mettre à jour le solde du compte
    const newBalance = type === 'INFLOW' 
      ? compte.balance + amount 
      : compte.balance - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance }
    });

    res.status(201).json({
      success: true,
      data: tresorerie,
      message: 'Flux de trésorerie créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du flux de trésorerie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllTresorerie = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, accountId, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (accountId) {
      whereClause.accountId = Number(accountId);
    }

    if (type) {
      whereClause.type = type;
    }

    const [tresorerie, total] = await Promise.all([
      prisma.cashFlow.findMany({
        where: whereClause,
        include: {
          account: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { date: 'desc' }
      }),
      prisma.cashFlow.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        tresorerie,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des flux de trésorerie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getTresorerieById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tresorerie = await prisma.cashFlow.findUnique({
      where: { id: Number(id) },
      include: {
        account: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!tresorerie) {
      return res.status(404).json({
        success: false,
        message: 'Flux de trésorerie non trouvé'
      });
    }

    res.json({
      success: true,
      data: tresorerie
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du flux de trésorerie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateTresorerie = [
  body('date').isISO8601().withMessage('Date invalide'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('type').isIn(['INFLOW', 'OUTFLOW']).withMessage('Type de flux invalide'),
  body('accountId').isInt({ min: 1 }).withMessage('Compte requis')
];