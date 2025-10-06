import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../config/database';
import { ROLE_PERMISSIONS } from '../database/permissions';
import { AuthResponse, LoginRequest } from '../types';
import { logger, auditLogger } from '../config/logger';
import { config } from '../config';

const prisma = getPrismaClient();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validation des entrées
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        service: true 
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // ✅ PLUS BESOIN DE CRÉER EMPLOYEE - User est déjà complet

    // Obtenir les permissions basées sur le rôle
    const customPermissions = user.preferences ? JSON.parse(user.preferences) : null;
    const permissions = customPermissions?.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    // Générer les tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      serviceId: user.serviceId,
      permissions
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Mettre à jour la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // ✅ SUPPRIMER LA PARTIE EMPLOYEE - User contient déjà tous les champs
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as any,
        serviceId: user.serviceId || undefined,
        isActive: user.isActive,
        lastLogin: user.lastLogin || undefined,
        avatarUrl: user.avatarUrl || undefined,
        // ✅ Champs fusionnés depuis Employee
        employeeNumber: user.employeeNumber || undefined,
        phone: user.phone || undefined,
        position: user.position || undefined,
        department: user.department || undefined,
        hireDate: user.hireDate || undefined,
        // Service
        service: user.service ? {
          ...user.service,
          description: user.service.description || undefined
        } : undefined,
      },
      token,
      refreshToken,
      permissions: permissions.map((perm: string) => ({
        id: 0,
        name: perm,
        resource: perm.split('.')[0],
        action: perm.split('.')[1]
      }))
    };

    // Log d'audit
    auditLogger.info('Connexion réussie', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requis'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: number };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { service: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    const customPermissions = user.preferences ? JSON.parse(user.preferences) : null;
    const permissions = customPermissions?.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        serviceId: user.serviceId,
        permissions
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      data: { token: newToken }
    });

  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Refresh token invalide'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  // Dans une implémentation complète, on pourrait blacklister le token
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { service: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const customPermissions = user.preferences ? JSON.parse(user.preferences) : null;
    const permissions = customPermissions?.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          serviceId: user.serviceId || undefined,
          isActive: user.isActive,
          lastLogin: user.lastLogin || undefined,
          avatarUrl: user.avatarUrl || undefined,
          // ✅ Champs fusionnés depuis Employee
          employeeNumber: user.employeeNumber || undefined,
          phone: user.phone || undefined,
          position: user.position || undefined,
          department: user.department || undefined,
          hireDate: user.hireDate || undefined,
          service: user.service || undefined
        },
        permissions: permissions.map((perm: string) => ({
          id: 0,
          name: perm,
          resource: perm.split('.')[0],
          action: perm.split('.')[1]
        }))
      }
    });

  } catch (error: unknown) { // ✅ Correction du type 'unknown'
    console.error('Erreur lors de la récupération du profil:', error);
    
    let errorMessage = 'Erreur interne du serveur';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

/**
 * Fonction utilitaire pour synchroniser les données User avec les anciennes données Employee
 * À utiliser une fois pour migrer les données existantes
 */
export const syncUserEmployeeData = async (req: Request, res: Response) => {
  try {
    // Vérifier les droits d'administration si nécessaire
    // if (req.user.role !== 'ADMIN') { ... }

    // Cette fonction n'est plus nécessaire avec la fusion complète
    // Mais gardons-la pour référence

    res.json({
      success: true,
      message: 'Fusion User-Employee déjà effectuée',
      data: {
        status: 'completed',
        note: 'Les données Employee sont maintenant intégrées dans la table User'
      }
    });

  } catch (error: unknown) { // ✅ Correction du type 'unknown'
    console.error('Erreur lors de la synchronisation:', error);
    
    let errorMessage = 'Erreur lors de la synchronisation';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};