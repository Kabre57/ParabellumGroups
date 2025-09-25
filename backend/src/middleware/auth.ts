import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../config/database';
import { JWTPayload, AuthenticatedRequest } from '../types';
import { logger } from '../config/logger';
import { config } from '../config';

const prisma = getPrismaClient();

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'accès requis'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Vérifier que l'utilisateur existe toujours et est actif
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

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Permission insuffisante'
      });
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Rôle insuffisant'
      });
    }

    next();
  };
};

export const requireServiceAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }

  // Les admins et DG ont accès à tous les services
  if (['ADMIN', 'GENERAL_DIRECTOR'].includes(req.user.role)) {
    return next();
  }

  // Pour les autres, vérifier l'accès au service
  const resourceServiceId = req.params.serviceId || req.body.serviceId;
  
  if (resourceServiceId && req.user.serviceId !== parseInt(resourceServiceId)) {
    return res.status(403).json({
      success: false,
      message: 'Accès au service non autorisé'
    });
  }

  next();
};