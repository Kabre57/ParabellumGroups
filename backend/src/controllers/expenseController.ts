import { Request, Response } from 'express';
import { PrismaClient, SourceDocumentType } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getExpenses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { expenseNumber: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: {
          supplier: {
            select: { name: true, contactPerson: true }
          },
          creator: {
            select: { firstName: true, lastName: true }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.expense.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getExpenseById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: true,
        creator: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
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
      category,
      description,
      amountHt,
      vatAmount,
      expenseDate,
      paymentDate,
      paymentMethod,
      receiptUrl,
      notes
    } = req.body;

    // Générer le numéro de dépense
    const lastExpense = await prisma.expense.findFirst({
      orderBy: { expenseNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastExpense) {
      const lastNumber = parseInt(lastExpense.expenseNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    const expenseNumber = `DEP-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;

    const totalTtc = amountHt + (vatAmount || 0);

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        supplierId,
        category,
        description,
        amountHt,
        vatAmount: vatAmount || 0,
        totalTtc,
        expenseDate: new Date(expenseDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        status: paymentDate ? 'PAID' : 'PENDING',
        receiptUrl,
        notes,
        createdBy: req.user!.userId
      },
      include: {
        supplier: true,
        creator: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Créer les écritures comptables
    await createExpenseAccountingEntries(expense.id, amountHt, vatAmount || 0, totalTtc, req.user!.userId);

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Dépense créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingExpense = await prisma.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }

    const {
      supplierId,
      category,
      description,
      amountHt,
      vatAmount,
      expenseDate,
      paymentDate,
      paymentMethod,
      status,
      receiptUrl,
      notes
    } = req.body;

    const totalTtc = amountHt + (vatAmount || 0);

    const expense = await prisma.expense.update({
      where: { id: Number(id) },
      data: {
        supplierId,
        category,
        description,
        amountHt,
        vatAmount: vatAmount || 0,
        totalTtc,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        status,
        receiptUrl,
        notes
      },
      include: {
        supplier: true,
        creator: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: expense,
      message: 'Dépense mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la dépense:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingExpense = await prisma.expense.findUnique({
      where: { id: Number(id) }
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }

    await prisma.expense.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Dépense supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getExpenseCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.expense.findMany({
      where: {
        category: { not: undefined }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    const categoryList = categories
      .map(e => e.category)
      .filter(Boolean)
      .sort() as string[];

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Fonction utilitaire pour créer les écritures comptables de dépense
async function createExpenseAccountingEntries(
  expenseId: number,
  amountHt: number,
  vatAmount: number,
  totalTtc: number,
  userId: number
) {
  const entries = [];

  // Débit charges
  entries.push({
    entryDate: new Date(),
    accountNumber: '606000', // Achats
    debit: amountHt,
    credit: 0,
    description: 'Dépense HT',
    sourceDocumentType: 'EXPENSE' as SourceDocumentType,
    sourceDocumentId: expenseId,
    createdBy: userId
  });

  // Débit TVA déductible
  if (vatAmount > 0) {
    entries.push({
      entryDate: new Date(),
      accountNumber: '445620', // TVA déductible
      debit: vatAmount,
      credit: 0,
      description: 'TVA déductible',
      sourceDocumentType: 'EXPENSE' as SourceDocumentType,
      sourceDocumentId: expenseId,
      createdBy: userId
    });
  }

  // Crédit fournisseur ou banque
  entries.push({
    entryDate: new Date(),
    accountNumber: '401000', // Fournisseurs
    debit: 0,
    credit: totalTtc,
    description: 'Dépense fournisseur',
    sourceDocumentType: 'EXPENSE' as SourceDocumentType,
    sourceDocumentId: expenseId,
    createdBy: userId
  });

  await prisma.accountingEntry.createMany({
    data: entries
  });

  // Créer l'entrée de trésorerie
  await prisma.cashFlow.create({
    data: {
      transactionDate: new Date(),
      type: 'OUTFLOW',
      amount: totalTtc,
      description: 'Dépense',
      category: 'Dépenses',
      sourceDocumentType: 'EXPENSE' as SourceDocumentType,
      sourceDocumentId: expenseId,
      createdBy: userId
    }
  });
}

// Validation middleware
export const validateExpense = [
  body('category').notEmpty().withMessage('Catégorie requise'),
  body('description').notEmpty().withMessage('Description requise'),
  body('amountHt').isFloat({ min: 0 }).withMessage('Montant HT invalide'),
  body('vatAmount').optional().isFloat({ min: 0 }).withMessage('Montant TVA invalide'),
  body('expenseDate').isISO8601().withMessage('Date de dépense invalide'),
  body('paymentMethod').isIn(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).withMessage('Mode de paiement invalide')
];