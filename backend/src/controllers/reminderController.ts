import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const createReminder = async (req: AuthenticatedRequest, res: Response) => {
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
      invoiceId,
      type,
      dueDate,
      amountDue,
      lateFees,
      emailSubject,
      emailBody
    } = req.body;

    // Vérifier que la facture existe
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const reminder = await prisma.reminder.create({
      data: {
        invoiceId,
        type,
        sentDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        amountDue,
        lateFees: lateFees || 0,
        emailSubject,
        emailBody,
        createdBy: req.user!.userId
      },
      include: {
        invoice: {
          include: {
            customer: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Relance créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la relance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getReminders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, invoiceId, type, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (invoiceId) {
      whereClause.invoiceId = Number(invoiceId);
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where: whereClause,
        include: {
          invoice: {
            include: {
              customer: true
            }
          },
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
        orderBy: { sentDate: 'desc' }
      }),
      prisma.reminder.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        reminders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des relances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateReminderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingReminder = await prisma.reminder.findUnique({
      where: { id: Number(id) }
    });

    if (!existingReminder) {
      return res.status(404).json({
        success: false,
        message: 'Relance non trouvée'
      });
    }

    const reminder = await prisma.reminder.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        invoice: {
          include: {
            customer: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: reminder,
      message: 'Statut de la relance mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la relance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateReminder = [
  body('invoiceId').isInt({ min: 1 }).withMessage('Facture requise'),
  body('type').isIn(['FRIENDLY', 'FORMAL', 'FINAL', 'LEGAL']).withMessage('Type de relance invalide'),
  body('amountDue').isFloat({ min: 0 }).withMessage('Montant dû invalide')
];