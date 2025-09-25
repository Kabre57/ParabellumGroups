import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { config } from '../config';

// Configuration de base pour le rate limiting
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit dépassé', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    keyGenerator: (req: Request) => {
      // Utiliser l'IP du client pour identifier les requêtes
      return req.ip || 'unknown';
    }
  });
};

// Rate limiter général (pour toutes les routes)
export const generalLimiter = createRateLimiter({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: config.RATE_LIMIT_MAX_REQUESTS,   // 100 requêtes par IP
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});

// Rate limiter strict pour l'authentification
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives de connexion par IP
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
  skipSuccessfulRequests: true // Ne pas compter les connexions réussies
});

// Rate limiter pour les opérations sensibles (création, modification, suppression)
export const sensitiveOperationsLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 opérations par IP
  message: 'Trop d\'opérations sensibles, veuillez ralentir le rythme.'
});

// Rate limiter pour les rapports (opérations coûteuses)
export const reportsLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 rapports par IP
  message: 'Trop de demandes de rapports, veuillez patienter.'
});

// Rate limiter pour les uploads de fichiers
export const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 uploads par IP
  message: 'Trop d\'uploads de fichiers, veuillez patienter.'
});

// Rate limiter pour les exports de données
export const exportLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 exports par IP
  message: 'Trop de demandes d\'export, veuillez patienter.'
});

// Rate limiter pour les emails (notifications, relances)
export const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // 50 emails par IP
  message: 'Trop d\'envois d\'emails, veuillez patienter.'
});

// Middleware conditionnel pour activer/désactiver le rate limiting
export const conditionalRateLimit = (limiter: any) => {
  return (req: Request, res: Response, next: any) => {
    if (config.ENABLE_RATE_LIMITING) {
      return limiter(req, res, next);
    }
    next();
  };
};

// Fonction pour obtenir les statistiques de rate limiting
export const getRateLimitStats = async (req: Request): Promise<any> => {
  try {
    // Cette fonction pourrait être étendue pour récupérer
    // des statistiques détaillées depuis Redis si nécessaire
    return {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération des stats de rate limiting:', error);
    return null;
  }
};

export default {
  generalLimiter,
  authLimiter,
  sensitiveOperationsLimiter,
  reportsLimiter,
  uploadLimiter,
  exportLimiter,
  emailLimiter,
  conditionalRateLimit
};