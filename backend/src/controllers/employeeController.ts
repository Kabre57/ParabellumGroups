// src/controllers/employeeController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * GET /employees
 * Liste paginée des "employés" (c.-à-d. des utilisateurs).
 * - Filtre par service (restreint pour les rôles non ADMIN/GENERAL_DIRECTOR)
 * - Recherche (firstName, lastName, email)
 * - Filtre sur isActive
 */
export const getEmployees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '10', search, serviceId, isActive } = req.query;

    const pageNum = Math.max(1, Number(page));
    const take = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    // 🔐 Visibilité : si l'utilisateur n'est pas ADMIN / GENERAL_DIRECTOR,
    // on limite aux utilisateurs de SON service.
    if (!['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role)) {
      if (req.user!.serviceId) {
        where.serviceId = Number(req.user!.serviceId);
      }
    } else if (serviceId) {
      // Les admins peuvent filtrer par n'importe quel serviceId
      where.serviceId = Number(serviceId);
    }

    if (typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'string') {
      // isActive attendu sous forme de string "true"/"false" côté query
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          // Inclure le service (table/rel "Service") si elle existe dans ton schéma
          service: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        employees: users, // pour compatibilité front qui parle d’“employees”
        pagination: {
          page: pageNum,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /employees/:id
 * Détails d’un "employé" = un user
 * - Restreint l’accès par service pour les rôles non ADMIN/GENERAL_DIRECTOR
 */
export const getEmployeeById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        service: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    }

    // 🔐 Contrôle d’accès: non-admins ne peuvent voir que leur service
    if (
      !['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) &&
      req.user!.serviceId &&
      user.serviceId !== req.user!.serviceId
    ) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cet employé' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'employé:", error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /employees
 * Création d’un user minimal (employé).
 * ⚠️ Cette méthode suppose qu’un flux de création utilisateur via auth/inscription
 * n’est pas strictement requis (mot de passe, email de validation, etc.).
 * Adapte selon ton projet (ex: déléguer au module d’auth).
 */
export const createEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,       // optionnel selon ton schéma
      address,     // optionnel
      serviceId,
      // role      // si ton schéma a un champ `role` (enum), tu peux l’accepter ici
    } = req.body;

    // Unicité email (bonne pratique)
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        address: address ?? null,
        serviceId: Number(serviceId),
        isActive: true,        // par défaut actif
        // role,                // si applicable dans ton schéma
      },
      include: {
        service: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'Employé créé avec succès',
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'employé:", error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PUT /employees/:id
 * Mise à jour des informations de base du user.
 * - Liste blanche des champs modifiables pour éviter d’écraser des colonnes sensibles.
 */
export const updateEmployee = async (req: AuthenticatedRequest, res: Response) => {
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

    const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    }

    // 🔐 Contrôle d’accès pour les non-admins (service)
    if (
      !['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) &&
      req.user!.serviceId &&
      existing.serviceId !== req.user!.serviceId
    ) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cet employé' });
    }

    // Liste blanche
    const updatable: any = {};
    const allowed = ['firstName', 'lastName', 'email', 'phone', 'address', 'serviceId', 'isActive' /*, 'role'*/];

    for (const key of allowed) {
      if (key in req.body) {
        updatable[key] = key === 'serviceId' ? Number(req.body[key]) : req.body[key];
      }
    }

    // Si l’email change, on vérifie l’unicité
    if (updatable.email && updatable.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: updatable.email } });
      if (emailTaken) {
        return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
      }
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updatable,
      include: { service: true },
    });

    res.json({ success: true, data: user, message: 'Employé mis à jour avec succès' });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'employé:", error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DELETE /employees/:id
 * Suppression logique (soft delete) -> isActive = false.
 * - Si tu veux une suppression physique, remplace par prisma.user.delete().
 */
export const deleteEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    }

    // 🔐 Contrôle d’accès (même règle de service pour les non-admins)
    if (
      !['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user!.role) &&
      req.user!.serviceId &&
      existing.serviceId !== req.user!.serviceId
    ) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cet employé' });
    }

    // Soft delete
    await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Employé désactivé avec succès' });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'employé:", error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/* -------------------------- Validation middleware -------------------------- */
/**
 * Valide les champs minimums pour create/update.
 * Adapte selon les champs réellement présents dans ta table `User`.
 */
export const validateEmployee = [
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('serviceId').optional().isInt().withMessage('Service invalide'),
  body('isActive').optional().isBoolean().withMessage('isActive doit être booléen'),
  // body('role').optional().isIn(['ADMIN','GENERAL_DIRECTOR','SERVICE_MANAGER','EMPLOYEE','ACCOUNTANT','PURCHASING_MANAGER'])
  //   .withMessage('Rôle invalide'),
];
