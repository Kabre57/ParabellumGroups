import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { ROLE_PERMISSIONS, PERMISSIONS_LIST } from '../database/permissions';

const prisma = new PrismaClient();

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, role, serviceId, isActive } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (serviceId) {
      whereClause.serviceId = Number(serviceId);
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          service: {
            select: { id: true, name: true }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    // Exclure le mot de passe des résultats
    const safeUsers = users.map(user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });

    res.json({
      success: true,
      data: {
        users: safeUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        service: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Exclure le mot de passe
    const { passwordHash, ...safeUser } = user;

    // Ajouter les permissions basées sur le rôle
    const customPermissions = user.preferences ? JSON.parse(user.preferences) : null;
    const permissions = customPermissions?.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    res.json({
      success: true,
      data: {
        ...safeUser,
        permissions: permissions.map((perm: string) => ({
          id: 0,
          name: perm,
          resource: perm.split('.')[0],
          action: perm.split('.')[1]
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
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
      email,
      password,
      firstName,
      lastName,
      role,
      serviceId,
      isActive = true
    } = req.body;

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier que le service existe si spécifié
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        serviceId,
        isActive
      },
      include: {
        service: true
      }
    });

    // Exclure le mot de passe de la réponse
    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({
      success: true,
      data: safeUser,
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const {
      email,
      firstName,
      lastName,
      role,
      serviceId,
      isActive
    } = req.body;

    // Vérifier que l'email n'existe pas déjà (sauf pour cet utilisateur)
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Vérifier que le service existe si spécifié
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        email,
        firstName,
        lastName,
        role,
        serviceId,
        isActive
      },
      include: {
        service: true
      }
    });

    // Exclure le mot de passe
    const { passwordHash, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user!.userId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            createdCustomers: true,
            createdQuotes: true,
            createdInvoices: true
          }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier s'il y a des données associées
    const hasData = existingUser._count.createdCustomers > 0 || 
                   existingUser._count.createdQuotes > 0 || 
                   existingUser._count.createdInvoices > 0;

    if (hasData) {
      // Désactiver au lieu de supprimer
      await prisma.user.update({
        where: { id: Number(id) },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Utilisateur désactivé (des données lui sont associées)'
      });
    } else {
      await prisma.user.delete({
        where: { id: Number(id) }
      });

      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Vérifier que l'utilisateur modifie son propre mot de passe ou est admin
    if (Number(id) !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que votre propre mot de passe'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel si ce n'est pas un admin
    if (Number(id) === req.user!.userId) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { passwordHash }
    });

    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = [
      { value: 'ADMIN', label: 'Administrateur' },
      { value: 'GENERAL_DIRECTOR', label: 'Directeur Général' },
      { value: 'SERVICE_MANAGER', label: 'Responsable de Service' },
      { value: 'EMPLOYEE', label: 'Employé' },
      { value: 'ACCOUNTANT', label: 'Comptable' }
    ];

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getServices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getUserPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les permissions personnalisées ou celles du rôle par défaut
    const customPermissions = user.preferences ? JSON.parse(user.preferences) : null;
    const defaultPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    
    res.json({
      success: true,
      data: customPermissions?.permissions || defaultPermissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateUserPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    console.log('📥 Requête reçue - updateUserPermissions:', { id, permissions });

    if (!Array.isArray(permissions)) {
      console.log('❌ Erreur de validation: permissions doit être un tableau');
      return res.status(400).json({
        success: false,
        message: 'Les permissions doivent être un tableau'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', id);
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Valider que toutes les permissions existent
    const validPermissions = Object.keys(PERMISSIONS_LIST);
    const invalidPermissions = permissions.filter((perm: string) => !validPermissions.includes(perm));
    
    if (invalidPermissions.length > 0) {
      console.log('❌ Permissions invalides:', invalidPermissions);
      return res.status(400).json({
        success: false,
        message: 'Permissions invalides',
        errors: invalidPermissions
      });
    }

    console.log('✅ Validation OK, mise à jour des permissions');

    // Stocker les permissions dans le champ preferences
    const preferences = user.preferences ? JSON.parse(user.preferences) : {};
    preferences.permissions = permissions;

    await prisma.user.update({
      where: { id: Number(id) },
      data: {
        preferences: JSON.stringify(preferences)
      }
    });

    console.log('✅ Permissions mises à jour avec succès');

    res.json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: permissions
    });
  } catch (error) {
    console.error('❌ Erreur serveur updateUserPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateUser = [
  body('email').isEmail().withMessage('Email invalide'),
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('role').isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT']).withMessage('Rôle invalide')
];

export const validateUserCreation = [
  ...validateUser,
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

export const validatePasswordUpdate = [
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];