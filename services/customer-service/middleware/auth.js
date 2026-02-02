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
 * In production, this should be replaced with JWT or OAuth2
 */
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'] || 'user';

  if (!userId) {
    logger.warn('Tentative d\'accès non authentifiée', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(401).json({ 
      error: 'Non autorisé',
      message: 'Header X-User-Id requis pour l\'authentification',
      code: 'AUTH_REQUIRED'
    });
  }

  // Validate UUID format if provided
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return res.status(400).json({
      error: 'Format invalide',
      message: 'X-User-Id doit être au format UUID',
      code: 'INVALID_USER_ID'
    });
  }

  // Attach user information to request
  req.user = {
    id: userId,
    role: userRole,
    ip: req.ip
  };

  // Log authenticated request
  logger.info('Requête authentifiée', {
    userId,
    role: userRole,
    path: req.path,
    method: req.method
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
        error: 'Non authentifié',
        message: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Tentative d\'accès non autorisé', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Accès interdit',
        message: 'Vous n\'avez pas les permissions nécessaires',
        code: 'FORBIDDEN'
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
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.headers['x-user-id'] || 'anonymous',
      userAgent: req.get('user-agent')
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