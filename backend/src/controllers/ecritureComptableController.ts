import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createEcritureComptable = async (req: AuthenticatedRequest, res: Response) => {
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
      entryType,
      accountId,
      sourceDocumentType,
      sourceDocumentId
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

    const ecritureComptable = await prisma.accountingEntry.create({
      data: {
        date: new Date(date),
        description,
        amount,
        entryType,
        accountId,
        sourceDocumentType,
        sourceDocumentId,
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
    const newBalance = entryType === 'INFLOW' 
      ? compte.balance + amount 
      : compte.balance - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance }
    });

    res.status(201).json({
      success: true,
      data: ecritureComptable,
      message: 'Écriture comptable créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'écriture comptable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getAllEcrituresComptables = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, accountId, entryType } = req.query;
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

    if (entryType) {
      whereClause.entryType = entryType;
    }

    const [ecritures, total] = await Promise.all([
      prisma.accountingEntry.findMany({
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
      prisma.accountingEntry.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        ecritures,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des écritures comptables:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getEcritureComptableById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ecriture = await prisma.accountingEntry.findUnique({
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

    if (!ecriture) {
      return res.status(404).json({
        success: false,
        message: 'Écriture comptable non trouvée'
      });
    }

    res.json({
      success: true,
      data: ecriture
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'écriture comptable:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateEcritureComptable = [
  body('date').isISO8601().withMessage('Date invalide'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('entryType').isIn(['INFLOW', 'OUTFLOW']).withMessage('Type d\'écriture invalide'),
  body('accountId').isInt({ min: 1 }).withMessage('Compte requis'),
  body('sourceDocumentType').isIn(['INVOICE', 'QUOTE', 'PAYMENT', 'EXPENSE', 'SALARY', 'OTHER']).withMessage('Type de document source invalide')
];