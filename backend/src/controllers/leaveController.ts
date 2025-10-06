import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * LISTE paginée des demandes de congé
 * - Aligne les filtres/préchargements sur le schéma: relation `user`, pas `employee`.
 * - Filtrage par rôle:
 *   ADMIN/GENERAL_DIRECTOR -> pas de restriction
 *   SERVICE_MANAGER        -> demandes des users de son service
 *   EMPLOYEE               -> ses propres demandes
 */
export const getLeaveRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, employeeId, status, year } = req.query;
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    // WHERE dynamique
    const where: any = {};

    // ⚠️ Dans ton schéma effectif, LeaveRequest a `userId` (pas `employeeId`)
    if (employeeId) {
      where.userId = Number(employeeId); // conserve le nom du query param, mappe sur userId
    }

    if (status) {
      where.status = status;
    }

    if (year) {
      const y = Number(year);
      const startDate = new Date(y, 0, 1);
      const endDate = new Date(y + 1, 0, 1);
      where.startDate = { gte: startDate, lt: endDate };
    }

    // Filtrage par rôle
    const role = req.user!.role;
    const currentUserId = Number(req.user!.userId);
    const currentServiceId = req.user!.serviceId ? Number(req.user!.serviceId) : undefined;

    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(role)) {
      if (role === 'SERVICE_MANAGER') {
        // Managers → demandes des users de leur service
        if (currentServiceId) {
          where.user = { serviceId: currentServiceId }; // relation `user`, pas `employee`
        }
      } else {
        // Employés → seulement leurs demandes
        where.userId = currentUserId;
      }
    }

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          // relation correcte = `user`
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              service: true, // si User -> Service relation existe
            },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      // .count n’accepte pas select/_count → on passe juste where
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        leaveRequests: items,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de congé:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DÉTAIL d’une demande de congé
 * - Précharge `user` (pas `employee`)
 * - Check d’accès selon rôle/service ou propriétaire
 */
export const getLeaveRequestById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            service: true,
          },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Demande de congé non trouvée' });
    }

    const role = req.user!.role;
    const currentUserId = Number(req.user!.userId);
    const currentServiceId = req.user!.serviceId ? Number(req.user!.serviceId) : undefined;

    const canAccess =
      role === 'ADMIN' ||
      role === 'GENERAL_DIRECTOR' ||
      leaveRequest.userId === currentUserId ||
      (role === 'SERVICE_MANAGER' &&
        leaveRequest.user?.service?.id &&
        currentServiceId &&
        Number(leaveRequest.user.service.id) === currentServiceId);

    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette demande de congé' });
    }

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande de congé:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * CRÉATION d’une demande de congé
 * - Dans ton schéma actuel: utiliser `userId` pour rattacher la demande à un utilisateur
 * - L’employé (EMPLOYEE) ne peut créer que pour lui-même
 */
export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const { employeeId, leaveType, startDate, endDate, reason, notes } = req.body;
    const targetUserId = Number(employeeId ?? req.user!.userId); // fallback pour soi-même

    // Vérifier que l'utilisateur existe
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Utilisateur cible non trouvé" });
    }

    // EMPLOYEE ne peut créer que pour lui-même
    if (req.user!.role === 'EMPLOYEE' && targetUserId !== Number(req.user!.userId)) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez créer des demandes que pour vous-même' });
    }

    // Calcul des jours
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Chevauchements (PENDING ou APPROVED) pour ce user
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: targetUserId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlapping) {
      return res.status(400).json({ success: true, message: 'Il existe déjà une demande de congé pour cette période' });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: targetUserId,
        leaveType,
        startDate: start,
        endDate: end,
        days: diffDays,
        reason,
        notes,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, service: true },
        },
      },
    });

    res.status(201).json({ success: true, data: leaveRequest, message: 'Demande de congé créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la demande de congé:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * MISE À JOUR d’une demande en attente
 */
export const updateLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true, startDate: true, endDate: true, days: true, userId: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Demande de congé non trouvée' });
    }
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être modifiées' });
    }

    const { leaveType, startDate, endDate, reason, notes } = req.body;

    // Recalcul des jours si dates changent
    let days = existing.days;
    if (startDate || endDate) {
      const start = new Date(startDate ?? existing.startDate);
      const end = new Date(endDate ?? existing.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        leaveType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        days,
        reason,
        notes,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, service: true } },
      },
    });

    res.json({ success: true, data: updated, message: 'Demande de congé mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande de congé:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * APPROBATION d’une demande
 * - Check autorisation: ADMIN, GENERAL_DIRECTOR, SERVICE_MANAGER sur son service
 */
export const approveLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: { user: { select: { service: true, id: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Demande de congé non trouvée' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée' });
    }

    const role = req.user!.role;
    const currentServiceId = req.user!.serviceId ? Number(req.user!.serviceId) : undefined;
    const canApprove =
      role === 'ADMIN' ||
      role === 'GENERAL_DIRECTOR' ||
      (role === 'SERVICE_MANAGER' &&
        existing.user?.service?.id &&
        currentServiceId &&
        Number(existing.user.service.id) === currentServiceId);

    if (!canApprove) {
      return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à approuver cette demande" });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED',
        approvedById: Number(req.user!.userId),
        approvedAt: new Date(),
        comments,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, service: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: updated, message: 'Demande de congé approuvée avec succès' });
  } catch (error) {
    console.error("Erreur lors de l'approbation de la demande de congé:", error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * REJET d’une demande
 */
export const rejectLeaveRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: { user: { select: { service: true, id: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Demande de congé non trouvée' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée' });
    }

    const role = req.user!.role;
    const currentServiceId = req.user!.serviceId ? Number(req.user!.serviceId) : undefined;
    const canReject =
      role === 'ADMIN' ||
      role === 'GENERAL_DIRECTOR' ||
      (role === 'SERVICE_MANAGER' &&
        existing.user?.service?.id &&
        currentServiceId &&
        Number(existing.user.service.id) === currentServiceId);

    if (!canReject) {
      return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à rejeter cette demande" });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        approvedById: Number(req.user!.userId),
        approvedAt: new Date(),
        comments,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, service: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: updated, message: 'Demande de congé rejetée' });
  } catch (error) {
    console.error('Erreur lors du rejet de la demande de congé:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * SOLDE DE CONGÉS pour un user (ex-param `employeeId` -> mappe vers userId)
 */
export const getLeaveBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const userId = Number(employeeId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // ex: contrat actif si tu l’as sous User
        contracts: { where: { isActive: true }, take: 1 },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    const y = Number(year);
    const startDate = new Date(y, 0, 1);
    const endDate = new Date(y + 1, 0, 1);

    const taken = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { gte: startDate, lt: endDate },
      },
    });

    const balance = taken.reduce((acc: any, l) => {
      acc[l.leaveType] = (acc[l.leaveType] || 0) + l.days;
      return acc;
    }, {});

    // Barèmes d’exemple
    const entitlements = {
      ANNUAL: 30,
      SICK: 90,
      PERSONAL: 5,
      MATERNITY: 120,
      PATERNITY: 15,
    };

    res.json({
      success: true,
      data: {
        year: y,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
        entitlements,
        taken: {
          ANNUAL: balance.ANNUAL || 0,
          SICK: balance.SICK || 0,
          PERSONAL: balance.PERSONAL || 0,
          MATERNITY: balance.MATERNITY || 0,
          PATERNITY: balance.PATERNITY || 0,
        },
        remaining: {
          ANNUAL: entitlements.ANNUAL - (balance.ANNUAL || 0),
          SICK: entitlements.SICK - (balance.SICK || 0),
          PERSONAL: entitlements.PERSONAL - (balance.PERSONAL || 0),
          MATERNITY: entitlements.MATERNITY - (balance.MATERNITY || 0),
          PATERNITY: entitlements.PATERNITY - (balance.PATERNITY || 0),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors du calcul du solde de congés:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

// Validation middleware
export const validateLeaveRequest = [
  body('employeeId').isInt().withMessage('ID utilisateur requis'),
  body('leaveType')
    .isIn(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER'])
    .withMessage('Type de congé invalide'),
  body('startDate').isISO8601().withMessage('Date de début invalide'),
  body('endDate').isISO8601().withMessage('Date de fin invalide'),
  body('reason').notEmpty().withMessage('Motif requis'),
];
