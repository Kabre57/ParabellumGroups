import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      },
      orderBy: [
        { role: 'asc' },
        { permission: { name: 'asc' } }
      ]
    });

    // Grouper par rôle
    const permissionsByRole = rolePermissions.reduce((acc, rp) => {
      if (!acc[rp.role]) {
        acc[rp.role] = [];
      }
      acc[rp.role].push({
        permission: rp.permission,
        canView: rp.canView,
        canCreate: rp.canCreate,
        canEdit: rp.canEdit,
        canDelete: rp.canDelete,
        canApprove: rp.canApprove
      });
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: permissionsByRole
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions des rôles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { role } = req.params;
    const { permissions } = req.body;

    // Valider le rôle
    const validRoles = ['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }

    // Mettre à jour les permissions pour ce rôle
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as any,
            permissionId: perm.permissionId
          }
        },
        update: {
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canApprove: perm.canApprove
        },
        create: {
          role: role as any,
          permissionId: perm.permissionId,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canApprove: perm.canApprove
        }
      });
    }

    res.json({
      success: true,
      message: 'Permissions mises à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateRolePermission = [
  body('permissions').isArray().withMessage('Permissions requis'),
  body('permissions.*.permissionId').isInt({ min: 1 }).withMessage('ID de permission invalide'),
  body('permissions.*.canView').isBoolean().withMessage('canView doit être un booléen'),
  body('permissions.*.canCreate').isBoolean().withMessage('canCreate doit être un booléen'),
  body('permissions.*.canEdit').isBoolean().withMessage('canEdit doit être un booléen'),
  body('permissions.*.canDelete').isBoolean().withMessage('canDelete doit être un booléen'),
  body('permissions.*.canApprove').isBoolean().withMessage('canApprove doit être un booléen')
];