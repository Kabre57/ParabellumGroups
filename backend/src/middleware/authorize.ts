// Backend/src/middleware/authorize.ts
// Vérifie une permission "categorie.action" (ex: "missions.create")
// contre la table RolePermission où role est un enum UserRole (pas de modèle Role).

import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

/**
 * authorize('missions.read')
 * - suppose que req.user.userId est renseigné par authenticateToken
 * - vérifie (user.role enum, permission.name) dans RolePermission
 */
export const authorize = (permName: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      // Rôle de l'utilisateur (enum UserRole)
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      if (!dbUser) {
        return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
      }

      // La permission demandée existe-t-elle ?
      const perm = await prisma.permission.findUnique({
        where: { name: permName },
        select: { id: true }
      });
      if (!perm) {
        // tu peux choisir 404 ou 403; ici 403 pour rester simple
        return res.status(403).json({ success: false, message: 'Permission inconnue' });
      }

      // Lien (role enum + permissionId) doit exister
      const link = await prisma.rolePermission.findUnique({
        where: { role_permissionId: { role: dbUser.role, permissionId: perm.id } }
      });

      if (!link) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      return next();
    } catch (err) {
      console.error('authorize error:', err);
      return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  };
};

/**
 * authorizeAny(['missions.read','interventions.read'])
 * - autorise si l'utilisateur possède AU MOINS UNE des permissions données
 */
export const authorizeAny = (permNames: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      if (!dbUser) {
        return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
      }

      const perms = await prisma.permission.findMany({
        where: { name: { in: permNames } },
        select: { id: true }
      });

      if (!perms.length) {
        return res.status(403).json({ success: false, message: 'Permissions inconnues' });
      }

      const permIds = perms.map(p => p.id);
      const anyLink = await prisma.rolePermission.findFirst({
        where: { role: dbUser.role, permissionId: { in: permIds } }
      });

      if (!anyLink) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      return next();
    } catch (err) {
      console.error('authorizeAny error:', err);
      return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  };
};
