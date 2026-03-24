const jwt = require('jsonwebtoken');

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
    return res.status(401).json({
      success: false,
      message: 'Token d’authentification manquant',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'JWT_SECRET non configuré côté service',
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide ou expiré',
      });
    }

    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
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
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
    });
  }

  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé pour ce rôle',
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateUser: authenticateToken,
  requireRoles,
};
