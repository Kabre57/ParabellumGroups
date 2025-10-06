// src/controllers/loanController.ts
import { Response } from 'express';
import { PrismaClient, LoanStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * GET /loans
 * Liste paginée + recherche + filtres.
 * - Filtrage service via relation user.serviceId
 * - Recherche sur loanNumber / user.firstName / user.lastName / purpose
 */
const getLoans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '10', search, status, employeeId, userId } = req.query;

    const pageNum = Math.max(1, Number(page));
    const take = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { loanNumber: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && typeof status === 'string') {
      where.status = status as LoanStatus;
    }

    // Compat : employeeId (ancien) => userId (nouveau)
    if (employeeId) where.userId = Number(employeeId);
    if (userId) where.userId = Number(userId);

    // Visibilité par rôle: seuls ADMIN / GENERAL_DIRECTOR voient tout
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      if (req.user!.serviceId) {
        where.user = { serviceId: Number(req.user!.serviceId) };
      }
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          user: { include: { service: true } },  // ✅ relation correcte
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loan.count({ where }),              // ✅ count attend juste { where }
    ]);

    res.json({
      success: true,
      data: {
        loans,
        pagination: {
          page: pageNum,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des prêts:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /loans/:id
 * Détails d’un prêt
 */
const getLoanById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: Number(id) },
      include: {
        user: { include: { service: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Prêt non trouvé' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    console.error('Erreur lors de la récupération du prêt:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /loans
 * Création d’un prêt.
 * - Reçoit userId (ou employeeId pour compat → mappé vers userId)
 * - Génère un numéro du type PRET-0001
 */
const createLoan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const targetUserId = Number(req.body.userId ?? req.body.employeeId);

    const {
      amount,
      interestRate,
      monthlyPayment,
      startDate,
      endDate,
      purpose,
      notes,
    } = req.body;

    // Vérifie l'utilisateur cible
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Génération d’un numéro incrémental
    const lastLoan = await prisma.loan.findFirst({ orderBy: { loanNumber: 'desc' } });
    let nextNumber = 1;
    if (lastLoan?.loanNumber) {
      const n = Number((lastLoan.loanNumber.split('-')[1] ?? '0'));
      if (!Number.isNaN(n)) nextNumber = n + 1;
    }
    const loanNumber = `PRET-${nextNumber.toString().padStart(4, '0')}`;

    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        userId: targetUserId,                       // ✅ champ correct
        amount: Number(amount),
        interestRate: Number(interestRate ?? 0),
        monthlyPayment: Number(monthlyPayment),
        remainingAmount: Number(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        purpose,
        notes,
        createdBy: Number(req.user!.userId),
        status: 'ACTIVE',
      },
      include: {
        user: { include: { service: true } },       // ✅ include correct
      },
    });

    res.status(201).json({
      success: true,
      data: loan,
      message: 'Prêt créé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du prêt:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PUT /loans/:id
 * Mise à jour (liste blanche des champs modifiables)
 */
const updateLoan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const existing = await prisma.loan.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prêt non trouvé' });
    }

    const updatable: any = {};
    const allowed = [
      'amount',
      'interestRate',
      'monthlyPayment',
      'remainingAmount',
      'startDate',
      'endDate',
      'purpose',
      'notes',
      'status',
      'userId',
    ];
    for (const key of allowed) {
      if (key in req.body) updatable[key] = req.body[key];
    }
    if (updatable.startDate) updatable.startDate = new Date(updatable.startDate);
    if (updatable.endDate) updatable.endDate = new Date(updatable.endDate);
    if (updatable.amount !== undefined) updatable.amount = Number(updatable.amount);
    if (updatable.interestRate !== undefined) updatable.interestRate = Number(updatable.interestRate);
    if (updatable.monthlyPayment !== undefined) updatable.monthlyPayment = Number(updatable.monthlyPayment);
    if (updatable.remainingAmount !== undefined) updatable.remainingAmount = Number(updatable.remainingAmount);

    const loan = await prisma.loan.update({
      where: { id: Number(id) },
      data: updatable,
      include: {
        user: { include: { service: true } },
      },
    });

    res.json({ success: true, data: loan, message: 'Prêt mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prêt:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DELETE /loans/:id
 * Suppression si aucun paiement n’est rattaché
 */
const deleteLoan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.loan.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { payments: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prêt non trouvé' });
    }
    if (existing._count.payments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un prêt ayant des paiements',
      });
    }

    await prisma.loan.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: 'Prêt supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du prêt:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /loans/:id/payments
 * Liste des paiements d’un prêt
 */
const getLoanPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payments = await prisma.loanPayment.findMany({
      where: { loanId: Number(id) },
      include: { salary: { select: { paymentDate: true } } },
      orderBy: { paymentDate: 'desc' },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /loans/:id/payments
 * Création d’un paiement + mise à jour du solde et du statut du prêt
 */
const createLoanPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, salaryId, notes } = req.body;

    const loan = await prisma.loan.findUnique({ where: { id: Number(id) } });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Prêt non trouvé' });
    }

    if (Number(amount) > loan.remainingAmount) {
      return res.status(400).json({ success: false, message: 'Le montant dépasse le solde restant' });
    }

    // Calcul des intérêts/principal pour ce paiement
    const monthlyInterest = (loan.interestRate / 100) / 12;
    const interest = loan.remainingAmount * monthlyInterest;
    const principal = Math.min(Number(amount) - interest, loan.remainingAmount);

    const payment = await prisma.loanPayment.create({
      data: {
        loanId: loan.id,
        salaryId: salaryId ?? null,
        amount: Number(amount),
        paymentDate: new Date(paymentDate),
        principal,
        interest,
        notes,
      },
    });

    const newRemaining = loan.remainingAmount - principal;
    const newStatus: LoanStatus = newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE';

    await prisma.loan.update({
      where: { id: loan.id },
      data: { remainingAmount: newRemaining, status: newStatus },
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Paiement enregistré avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* ------------------------- Validation middleware ------------------------- */
/**
 * validateLoan
 * - exige userId OU employeeId (compat)
 * - vérifie les bornes et formats
 */
const validateLoan = [
  body().custom((_, { req }) => {
    const hasUser = req.body.userId !== undefined || req.body.employeeId !== undefined;
    if (!hasUser) throw new Error('userId requis (employeeId accepté pour compatibilité)');
    return true;
  }),
  body('amount').isFloat({ min: 1 }).withMessage('Montant invalide'),
  body('monthlyPayment').isFloat({ min: 1 }).withMessage('Mensualité invalide'),
  body('startDate').isISO8601().withMessage('Date de début invalide'),
  body('endDate').isISO8601().withMessage('Date de fin invalide'),
  body('interestRate').optional().isFloat({ min: 0 }).withMessage('Taux invalide'),
  body('purpose').notEmpty().withMessage('Objet du prêt requis'),
];

/* ------------------------------- EXPORTS --------------------------------- */
/**
 * On exporte TOUT à la fin pour garantir que les imports
 * (ex: createLoanPayment) ne soient jamais `undefined`.
 */
export {
  getLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  createLoanPayment,
  validateLoan,
};
