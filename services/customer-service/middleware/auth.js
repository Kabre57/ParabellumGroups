const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Authentication middleware - checks for X-User-Id header
 * Format compatible avec ton frontend existant
 */
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRoleRaw = req.headers['x-user-role'] || 'user';
  const normalizeRole = (value) => {
    const normalized = String(value).toLowerCase().trim();
    const roleMap = {
      administrateur: 'admin',
      administrator: 'admin',
      superadmin: 'super_admin',
      superadministrateur: 'super_admin',
      superadministrator: 'super_admin'
    };
    return roleMap[normalized] || normalized;
  };
  const userRole = normalizeRole(userRoleRaw);

  if (!userId) {
    logger.warn('Tentative d\'accès non authentifiée', {
      context: {
        path: req.path,
        method: req.method,
        ip: req.ip
      }
    });
    
    // RETOUR COMPATIBLE avec ton frontend
    return res.status(401).json({
      success: false,
      error: 'Non authentifié - ID utilisateur manquant'
    });
  }

  // Attach user information to request (même format que l'ancien)
  req.user = {
    id: userId,
    role: userRole
  };

  // Log propre
  logger.info('Requête authentifiée', {
    context: {
      userId,
      role: userRole,
      path: req.path,
      method: req.method
    }
  });

  next();
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié - Authentification requise'
      });
    }

    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());
    if (!normalizedAllowedRoles.includes(req.user.role)) {
      logger.warn('Tentative d\'accès non autorisé', {
        context: {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        }
      });

      return res.status(403).json({
        success: false,
        error: 'Accès interdit - Permissions insuffisantes'
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const requireAdmin = authorize(['admin', 'super_admin']);

/**
 * Manager or admin middleware
 */
const requireManager = authorize(['manager', 'admin', 'super_admin']);

/**
 * Log all requests middleware
 */
const logRequests = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Requête traitée', {
      context: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        userId: req.headers['x-user-id'] || 'anonymous',
        userAgent: req.get('user-agent')
      }
    });
  });

  next();
};

module.exports = {
  authMiddleware,
  authorize,
  requireAdmin,
  requireManager,
  logRequests
};
