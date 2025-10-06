// src/routes/permissions.ts
import {  Request, Response, Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { ALLOWED_PERMISSIONS } from '../middleware/permissions-constants';

const prisma = new PrismaClient();
const router: ExpressRouter = Router();

// GET /api/v1/users/:id/permissions
router.get('/users/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { service: true }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur introuvable' 
      });
    }

    // Récupérer les permissions depuis le champ permissions (JSON) ou utiliser les permissions par défaut
    const permissions = user.permissions ? JSON.parse(user.permissions) : [];

    return res.json({ 
      success: true, 
      data: {
        permissions,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          serviceId: user.serviceId
        }
      }
    });
  } catch (error) {
    console.error('Erreur getUserPermissions:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/v1/users/:id/permissions
router.put('/users/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const incoming = Array.isArray(req.body.permissions) ? req.body.permissions : [];

    // Valider les permissions
    const invalid = incoming.filter(p => !ALLOWED_PERMISSIONS.includes(p as any));
    if (invalid.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Permissions invalides', 
        invalid 
      });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        permissions: JSON.stringify(incoming) 
      },
      include: {
        service: true
      }
    });

    return res.json({ 
      success: true, 
      message: 'Permissions mises à jour avec succès', 
      data: {
        permissions: incoming,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          serviceId: updatedUser.serviceId
        }
      }
    });
  } catch (error) {
    console.error('Erreur updateUserPermissions:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

export default router;