import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

// GET /api/v1/users/:id/permissions
export const getUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        service: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    // Récupérer les permissions depuis le champ permissions (JSON) ou utiliser les permissions par défaut du rôle
    const userPermissions = user.permissions ? JSON.parse(user.permissions) : [];

    res.json({
      success: true,
      data: userPermissions
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// PUT /api/v1/users/:id/permissions
export const updateUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const { permissions } = req.body;

    // Valider les données
    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: 'Les permissions doivent être un tableau' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    // Mettre à jour les permissions de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: JSON.stringify(permissions)
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: permissions
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Routeur principal (si vous voulez garder une structure de routeur séparée)
import { Router } from 'express';
const router = Router();

router.get('/users/:id/permissions', getUserPermissions);
router.put('/users/:id/permissions', updateUserPermissions);

export default router;