// src/controllers/expenseController.ts
import { Request, Response } from 'express';
import { PrismaClient, ExpenseStatus, SourceDocumentType } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * NOTES D’ALIGNEMENT AVEC LE SCHÉMA
 * ---------------------------------
 * Modèle Expense (tel que fourni) :
 *   id, userId, date, category, description?, amount, currency="XOF",
 *   status=ExpenseStatus.PENDING, receiptUrl?, notes?, createdBy, createdAt, updatedAt
 * Relations:
 *   creator: User @relation("ExpenseCreatedBy", fields: [createdBy], references: [id])
 *   user:    User @relation("ExpenseEmployee",  fields: [userId],    references: [id])
 *
 * => AUCUNE relation/colonne "supplier", "expenseNumber", "amountHt", "vatAmount", "paymentMethod".
 * => On supprime tout ce qui y faisait référence.
 */

/* ===========================
 * GET /expenses
 * =========================== */
export const getExpenses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '10', search = '', category, status } = req.query as Record<string, string>;
    const take = Math.max(1, Number(limit) || 10);
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category:    { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status)   where.status   = status as ExpenseStatus; // string -> enum

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          // relations existantes dans ton schéma
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
          user:    { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ===========================
 * GET /expenses/:id
 * =========================== */
export const getExpenseById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        user:    { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    }

    return res.json({ success: true, data: expense });
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ===========================
 * POST /expenses
 * ===========================
 * Champs acceptés (alignés modèle) :
 *  - userId (employé concerné)
 *  - date (ISO string)
 *  - category
 *  - description? , amount (number), currency? (default XOF)
 *  - status? (PENDING/APPROVED/REJECTED/PAID selon ton enum)
 *  - receiptUrl?, notes?
 *  - createdBy = req.user!.id (depuis le token)
 */
export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const me = req.user!;
    const {
      userId,
      date,
      category,
      description,
      amount,
      currency,   // optionnel
      status,     // optionnel (sinon PENDING par défaut)
      receiptUrl, // optionnel
      notes,      // optionnel
    } = req.body;

    const created = await prisma.expense.create({
      data: {
        userId: Number(userId),
        date: new Date(date),
        category,
        description: description ?? null,
        amount: Number(amount),
        currency: currency ?? undefined, // laisser défaut "XOF" si non fourni
        status: status as ExpenseStatus | undefined, // sinon défaut PENDING
        receiptUrl: receiptUrl ?? null,
        notes: notes ?? null,
        createdBy: me.id,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        user:    { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // (Optionnel) écriture comptable + cashflow (si tes modèles existent)
    await createExpenseAccountingEntries(created.id, created.amount, me.id).catch(() => { /* ne pas bloquer */ });

    return res.status(201).json({ success: true, data: created, message: 'Dépense créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ===========================
 * PUT /expenses/:id
 * =========================== */
export const updateExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const {
      userId,
      date,
      category,
      description,
      amount,
      currency,
      status,
      receiptUrl,
      notes,
    } = req.body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(userId       !== undefined && { userId: Number(userId) }),
        ...(date         !== undefined && { date: new Date(date) }),
        ...(category     !== undefined && { category }),
        ...(description  !== undefined && { description }),
        ...(amount       !== undefined && { amount: Number(amount) }),
        ...(currency     !== undefined && { currency }),
        ...(status       !== undefined && { status: status as ExpenseStatus }),
        ...(receiptUrl   !== undefined && { receiptUrl }),
        ...(notes        !== undefined && { notes }),
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        user:    { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return res.json({ success: true, data: updated, message: 'Dépense mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la dépense:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ===========================
 * DELETE /expenses/:id
 * =========================== */
export const deleteExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    await prisma.expense.delete({ where: { id } });
    return res.json({ success: true, message: 'Dépense supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ===========================
 * GET /expenses/categories
 * =========================== */
export const getExpenseCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.expense.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return res.json({
      success: true,
      data: categories.map(c => c.category).filter(Boolean),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ==========================================================
 * Utilitaire – écritures comptables et cashflow (optionnel)
 * ========================================================== */
async function createExpenseAccountingEntries(
  expenseId: number,
  amount: number,
  userId: number
) {
  // Si tes modèles n’existent pas, cette fonction ne doit pas bloquer.
  // Adapte les numéros de comptes selon ta compta.
  try {
    await prisma.accountingEntry.createMany({
      data: [
        {
          entryDate: new Date(),
          accountNumber: '606000', // Charges - achats
          debit: amount,
          credit: 0,
          description: 'Dépense',
          sourceDocumentType: 'EXPENSE' as SourceDocumentType,
          sourceDocumentId: expenseId,
          createdBy: userId,
        },
        {
          entryDate: new Date(),
          accountNumber: '401000', // Fournisseurs (ou banque si tu préfères 512000)
          debit: 0,
          credit: amount,
          description: 'Dépense',
          sourceDocumentType: 'EXPENSE' as SourceDocumentType,
          sourceDocumentId: expenseId,
          createdBy: userId,
        },
      ],
    });

    await prisma.cashFlow.create({
      data: {
        transactionDate: new Date(),
        type: 'OUTFLOW',
        amount,
        description: 'Dépense',
        category: 'Dépenses',
        sourceDocumentType: 'EXPENSE' as SourceDocumentType,
        sourceDocumentId: expenseId,
        createdBy: userId,
      },
    });
  } catch (e) {
    // ne pas bloquer le flux principal
    console.warn('[createExpenseAccountingEntries] ignoré:', e);
  }
}

/* ===========================
 * VALIDATION (express-validator)
 * =========================== */
export const validateExpense = [
  body('userId').isInt({ gt: 0 }).withMessage('Employé (userId) requis'),
  body('date').isISO8601().withMessage('Date invalide'),
  body('category').notEmpty().withMessage('Catégorie requise'),
  body('amount').isFloat({ gt: 0 }).withMessage('Montant invalide'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Devise invalide (ex: XOF)'),
  body('status').optional().isIn(['PENDING','APPROVED','REJECTED','PAID']).withMessage('Statut invalide'),
  body('description').optional().isString(),
  body('receiptUrl').optional().isString(),
  body('notes').optional().isString(),
];
