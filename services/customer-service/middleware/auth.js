const jwt = require('jsonwebtoken');
const winston = require('winston');

const normalizePermissions = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification manquant" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'JWT_SECRET non configuré côté service' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token invalide ou expiré' });
    }

    const normalizedUserId = decoded.userId || decoded.id;

    req.user = {
      id: normalizedUserId ? String(normalizedUserId) : undefined,
      userId: normalizedUserId ? String(normalizedUserId) : undefined,
      email: decoded.email || decoded.userEmail || null,
      role: decoded.role || decoded.roleCode || null,
      serviceId: decoded.serviceId || decoded.service_id || null,
      serviceName: decoded.serviceName || decoded.service?.name || null,
      permissions: normalizePermissions(decoded.permissions || decoded.permissionsList),
    };

    next();
  });
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentification requise' });
  }

  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé pour ce rôle' });
  }

  next();
};

const authMiddleware = authenticateToken;
const authorize = (allowedRoles) => requireRoles(...allowedRoles);
const requireAdmin = authorize(['admin', 'super_admin']);
const requireManager = authorize(['manager', 'admin', 'super_admin']);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

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
        userId: req.user?.id || req.headers['x-user-id'] || 'anonymous',
        userAgent: req.get('user-agent'),
      },
    });
  });
  next();
};

module.exports = { authMiddleware, authorize, requireAdmin, requireManager, logRequests, authenticateToken, authenticateUser: authenticateToken, requireRoles };
